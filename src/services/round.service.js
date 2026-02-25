import supabase from "../config/supabase.js";

/**
 * Fetch team by ID
 */
export async function getTeamById(teamId) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (error) throw new Error(`Team not found: ${error.message}`);
  return data;
}

/**
 * Pick the least-assigned easy question.
 *
 * Strategy: count how many teams are already assigned to each easy question,
 * then pick randomly among the questions with the fewest assignments.
 * With 15 questions and 30 teams, each question ends up assigned to ~2 teams.
 */
async function pickLeastAssignedEasyQuestion() {
  // 1. Get all easy questions
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("*")
    .eq("difficulty", "easy");

  if (qErr) throw new Error(`Failed to fetch easy questions: ${qErr.message}`);
  if (!questions || questions.length === 0) {
    throw new Error("No easy questions available");
  }

  // 2. Count how many teams are assigned to each easy question
  const { data: teams, error: tErr } = await supabase
    .from("teams")
    .select("easy_question_id")
    .not("easy_question_id", "is", null);

  if (tErr) throw new Error(`Failed to fetch team assignments: ${tErr.message}`);

  const assignmentCounts = {};
  for (const q of questions) {
    assignmentCounts[q.id] = 0;
  }
  for (const t of teams || []) {
    if (t.easy_question_id in assignmentCounts) {
      assignmentCounts[t.easy_question_id]++;
    }
  }

  // 3. Find the minimum assignment count
  const minCount = Math.min(...Object.values(assignmentCounts));

  // 4. Filter to questions with that minimum count
  const leastAssigned = questions.filter(
    (q) => assignmentCounts[q.id] === minCount
  );

  // 5. Pick one at random from the least-assigned pool
  return leastAssigned[Math.floor(Math.random() * leastAssigned.length)];
}

/**
 * Assign 1 easy question to a team using least-assigned logic.
 * Assignment happens only once — if already assigned, returns existing question.
 * Easy-only contest: no medium question assignment.
 */
export async function assignRound(teamId) {
  const team = await getTeamById(teamId);

  let easyQuestionId = team.easy_question_id;
  let needsUpdate = false;

  // Assign easy question if not already assigned
  if (!easyQuestionId) {
    const q = await pickLeastAssignedEasyQuestion();
    easyQuestionId = q.id;
    needsUpdate = true;
  }

  // Update team record if a new question was assigned
  if (needsUpdate) {
    const { error: updateErr } = await supabase
      .from("teams")
      .update({ easy_question_id: easyQuestionId })
      .eq("id", teamId);

    if (updateErr) throw new Error(`Failed to update team: ${updateErr.message}`);
  }

  // Fetch full question details
  const { data: easyQuestion, error: eqErr } = await supabase
    .from("questions")
    .select("*")
    .eq("id", easyQuestionId)
    .single();

  if (eqErr) throw new Error(`Failed to fetch easy question details: ${eqErr.message}`);

  return {
    easy_question: easyQuestion,
    medium_question: null,
    easy_score: team.easy_score || 0,
    medium_score: 0,
    easy_submission_count: team.easy_submission_count || 0,
    medium_submission_count: 0,
  };
}

/**
 * Start the CP timer for a team.
 * Sets created_at to NOW only if it is currently NULL.
 * Returns the created_at value (existing or newly set).
 *
 * Pre-contest setup: all teams must have created_at = NULL.
 * Timer starts once (idempotent) — refreshing the page does NOT reset it.
 */
export async function startTimer(teamId) {
  const team = await getTeamById(teamId);

  // If timer already started, return existing start time
  if (team.created_at) {
    return { cp_start_time: team.created_at };
  }

  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("teams")
    .update({ created_at: now })
    .eq("id", teamId);

  if (updateErr) throw new Error(`Failed to start timer: ${updateErr.message}`);

  return { cp_start_time: now };
}
