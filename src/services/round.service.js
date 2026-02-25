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
 * Pick the least-assigned question from a pre-fetched list,
 * given pre-fetched assignment counts, excluding specified IDs.
 */
function pickFromPool(questions, assignmentCounts, excludeIds = []) {
  const available = questions.filter((q) => !excludeIds.includes(q.id));
  if (available.length === 0) {
    throw new Error("No questions available (all excluded or pool is empty)");
  }

  const minCount = Math.min(...available.map((q) => assignmentCounts[q.id] ?? 0));
  const leastAssigned = available.filter((q) => (assignmentCounts[q.id] ?? 0) === minCount);
  return leastAssigned[Math.floor(Math.random() * leastAssigned.length)];
}

/**
 * Assign 2 easy questions to a team using least-assigned logic.
 * Both questions come from the easy pool and are always different (no repetition).
 * Assignment happens only once per question slot — idempotent on re-calls.
 * Fetches questions + teams only ONCE to minimise DB round-trips.
 */
export async function assignRound(teamId) {
  // Fetch team, all easy questions, and team assignments in parallel
  const [teamResult, questionsResult, teamsResult] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).single(),
    supabase.from("questions").select("*").eq("difficulty", "easy"),
    supabase.from("teams").select("easy_question_id, medium_question_id"),
  ]);

  if (teamResult.error) throw new Error(`Team not found: ${teamResult.error.message}`);
  if (questionsResult.error) throw new Error(`Failed to fetch questions: ${questionsResult.error.message}`);
  if (teamsResult.error) throw new Error(`Failed to fetch team assignments: ${teamsResult.error.message}`);

  const team = teamResult.data;
  const questions = questionsResult.data || [];
  const allTeams = teamsResult.data || [];

  if (questions.length === 0) throw new Error("No easy questions available");

  // Build assignment counts across both slots
  const assignmentCounts = {};
  for (const q of questions) assignmentCounts[q.id] = 0;
  for (const t of allTeams) {
    if (t.easy_question_id != null && t.easy_question_id in assignmentCounts)
      assignmentCounts[t.easy_question_id]++;
    if (t.medium_question_id != null && t.medium_question_id in assignmentCounts)
      assignmentCounts[t.medium_question_id]++;
  }

  let easyQuestionId = team.easy_question_id;
  let mediumQuestionId = team.medium_question_id;
  const updateFields = {};

  if (!easyQuestionId) {
    const q = pickFromPool(questions, assignmentCounts, []);
    easyQuestionId = q.id;
    updateFields.easy_question_id = easyQuestionId;
    assignmentCounts[easyQuestionId] = (assignmentCounts[easyQuestionId] || 0) + 1;
  }

  if (!mediumQuestionId) {
    const q = pickFromPool(questions, assignmentCounts, [easyQuestionId]);
    mediumQuestionId = q.id;
    updateFields.medium_question_id = mediumQuestionId;
  }

  // Persist new assignments + fetch question details — all in parallel
  const ops = [
    supabase.from("questions").select("*").eq("id", easyQuestionId).single(),
    supabase.from("questions").select("*").eq("id", mediumQuestionId).single(),
  ];
  if (Object.keys(updateFields).length > 0) {
    ops.push(supabase.from("teams").update(updateFields).eq("id", teamId));
  }

  const [easyResult, mediumResult, updateResult] = await Promise.all(ops);

  if (easyResult.error) throw new Error(`Failed to fetch question 1: ${easyResult.error.message}`);
  if (mediumResult.error) throw new Error(`Failed to fetch question 2: ${mediumResult.error.message}`);
  if (updateResult?.error) throw new Error(`Failed to update team: ${updateResult.error.message}`);

  return {
    easy_question: easyResult.data,
    medium_question: mediumResult.data,
    easy_score: team.easy_score || 0,
    medium_score: team.medium_score || 0,
    easy_submission_count: team.easy_submission_count || 0,
    medium_submission_count: team.medium_submission_count || 0,
  };
}

/**
 * Start the CP timer for a team.
 * Sets cp_start_time to NOW only if it is currently NULL.
 * Returns the cp_start_time value (existing or newly set).
 *
 * Uses the dedicated cp_start_time column (null by default) — NOT created_at,
 * which Supabase auto-populates on every insert and is not a reliable timer.
 *
 * Timer starts once (idempotent) — refreshing the page does NOT reset it.
 */
export async function startTimer(teamId) {
  const team = await getTeamById(teamId);

  // If timer already started, return existing start time
  if (team.cp_start_time) {
    return { cp_start_time: team.cp_start_time };
  }

  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("teams")
    .update({ cp_start_time: now })
    .eq("id", teamId);

  if (updateErr) throw new Error(`Failed to start timer: ${updateErr.message}`);

  return { cp_start_time: now };
}
