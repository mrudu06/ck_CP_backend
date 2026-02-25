import axios from "axios";
import supabase from "../config/supabase.js";
import judge0Config from "../config/judge0.js";

const MAX_SUBMISSIONS = 10;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 15;

// ---------------------------------------------------------------------------
// Judge0 helpers
// ---------------------------------------------------------------------------

async function createBatchSubmission(sourceCode, languageId, testCases) {
  const submissions = testCases.map((tc) => ({
    source_code: Buffer.from(sourceCode).toString("base64"),
    language_id: languageId,
    stdin: tc.input ? Buffer.from(tc.input).toString("base64") : "",
    expected_output: tc.expected_output
      ? Buffer.from(tc.expected_output).toString("base64")
      : "",
  }));

  const { data } = await axios.post(
    `${judge0Config.baseUrl}/submissions/batch?base64_encoded=true`,
    { submissions },
    { headers: judge0Config.headers }
  );

  return data.map((d) => d.token);
}

async function pollBatchResults(tokens) {
  const fields =
    "token,status_id,status,stdout,stderr,compile_output,time,memory";

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const { data } = await axios.get(
      `${judge0Config.baseUrl}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true&fields=${fields}`,
      { headers: judge0Config.headers }
    );

    const results = data.submissions;
    const allDone = results.every((r) => r.status_id > 2);

    if (allDone) {
      return results.map((r) => ({
        token: r.token,
        status_id: r.status_id,
        status: r.status,
        stdout: r.stdout ? Buffer.from(r.stdout, "base64").toString() : null,
        stderr: r.stderr ? Buffer.from(r.stderr, "base64").toString() : null,
        compile_output: r.compile_output
          ? Buffer.from(r.compile_output, "base64").toString()
          : null,
        time: r.time,
        memory: r.memory,
      }));
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Judge0 execution timed out — not all test cases finished");
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

async function evaluateAgainstTestCases(sourceCode, languageId, questionId) {
  const { data: testCases, error: tcErr } = await supabase
    .from("test_cases")
    .select("id, input, expected_output")
    .eq("question_id", questionId)
    .order("id", { ascending: true });

  if (tcErr) throw new Error(`Failed to fetch test cases: ${tcErr.message}`);
  if (!testCases || testCases.length === 0) {
    throw new Error("No test cases found for this question");
  }

  const tokens = await createBatchSubmission(sourceCode, languageId, testCases);
  const results = await pollBatchResults(tokens);

  const totalTestcases = testCases.length;
  let passedTestcases = 0;
  const details = [];

  for (let i = 0; i < totalTestcases; i++) {
    const tc = testCases[i];
    const result = results[i];

    const actualOutput = (result.stdout || "").trim();
    const expectedOutput = (tc.expected_output || "").trim();
    const passed = result.status_id === 3 && actualOutput === expectedOutput;

    if (passed) passedTestcases++;

    // Last test case is hidden — strip output details
    const isHidden = i === totalTestcases - 1;

    details.push({
      test_case_id: tc.id,
      passed,
      hidden: isHidden,
      status_id: result.status_id,
      stdout: isHidden ? null : actualOutput,
      expected_output: isHidden ? null : expectedOutput,
      stderr: isHidden ? null : result.stderr,
      compile_output: isHidden ? null : result.compile_output,
      time: result.time,
      memory: result.memory,
    });
  }

  const score = Math.floor((passedTestcases / totalTestcases) * 100);

  return { passed_testcases: passedTestcases, total_testcases: totalTestcases, score, details };
}

// ---------------------------------------------------------------------------
// Status label
// ---------------------------------------------------------------------------

function getStatusLabel(score) {
  if (score === 100) return "Accepted";
  if (score > 0) return "Partial";
  return "Wrong Answer";
}

// ---------------------------------------------------------------------------
// Main export — Easy-only contest model
// ---------------------------------------------------------------------------

/**
 * Process a submission.
 *
 * Rules:
 *  1. Validate team + question assignment (easy only)
 *  2. Enforce 10-submission limit per problem
 *  3. Evaluate via Judge0 batch
 *  4. Store submission record
 *  5. Override score for that slot with latest result
 *  6. If easy_score == 100 → set completion_time
 */
export async function processSubmission(teamId, questionId, languageId, sourceCode) {
  // 1. Validate team
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (teamErr || !team) {
    throw { status: 404, message: "Team not found" };
  }

  // Validate question assignment (easy only)
  const isEasy = team.easy_question_id === questionId;

  if (!isEasy) {
    throw { status: 400, message: "Question is not assigned to this team" };
  }

  // 2. Submission limit
  const currentCount = team.easy_submission_count || 0;

  if (currentCount >= MAX_SUBMISSIONS) {
    throw { status: 429, message: `Submission limit reached (${MAX_SUBMISSIONS}/${MAX_SUBMISSIONS})` };
  }

  // 3. Evaluate via Judge0 batch
  const evaluation = await evaluateAgainstTestCases(sourceCode, languageId, questionId);
  const { passed_testcases, total_testcases, score, details } = evaluation;
  const status = getStatusLabel(score);

  // 4. Store submission record
  const { error: insertErr } = await supabase.from("submissions").insert({
    team_id: teamId,
    question_id: questionId,
    language_id: languageId,
    source_code: sourceCode,
    status,
    passed_testcases,
    total_testcases,
    score,
  });

  if (insertErr) throw new Error(`Failed to store submission: ${insertErr.message}`);

  // 5. Override score + increment submission count
  const newCount = currentCount + 1;
  const updateFields = {
    easy_score: score,
    easy_submission_count: newCount,
  };

  // 6. Check if easy problem is now solved (100%)
  const solved = score === 100;

  // Set completion_time when easy hits 100 (no DB columns for cp_end_time/cp_time_taken)
  if (solved && !team.completion_time) {
    updateFields.completion_time = new Date().toISOString();
  }

  // Apply update
  const { error: updateErr } = await supabase
    .from("teams")
    .update(updateFields)
    .eq("id", teamId);

  if (updateErr) throw new Error(`Failed to update team: ${updateErr.message}`);

  // 7. Calculate cp_time_taken dynamically (not stored in DB)
  let cpTimeTaken = null;
  if (solved && team.created_at) {
    const startTime = new Date(team.created_at);
    cpTimeTaken = Math.floor((Date.now() - startTime.getTime()) / 1000);
  }

  // 8. Response
  return {
    passed_testcases,
    total_testcases,
    score,
    status,
    submission_number: newCount,
    submissions_remaining: MAX_SUBMISSIONS - newCount,
    both_solved: solved,
    cp_time_taken: cpTimeTaken,
    details,
  };
}
