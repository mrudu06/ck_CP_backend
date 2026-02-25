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
 * Pick the least-assigned question of a given difficulty,
 * excluding any question IDs in the excludeIds array (to prevent repetition).
 *
 * Strategy: count how many teams are already assigned to each question,
 * then pick randomly among the questions with the fewest assignments.
 */
async function pickLeastAssignedQuestion(difficulty, excludeIds = []) {
  // 1. Get all questions of the given difficulty
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("*")
    .eq("difficulty", difficulty);

  if (qErr) throw new Error(`Failed to fetch ${difficulty} questions: ${qErr.message}`);

  // Filter out excluded question IDs
  const available = (questions || []).filter((q) => !excludeIds.includes(q.id));
  if (available.length === 0) {
    throw new Error(`No ${difficulty} questions available (excluding already-assigned ones)`);
  }

  // 2. Count how many teams are assigned to each question across BOTH slots
  const { data: teams, error: tErr } = await supabase
    .from("teams")
    .select("easy_question_id, medium_question_id");

  if (tErr) throw new Error(`Failed to fetch team assignments: ${tErr.message}`);

  const assignmentCounts = {};
  for (const q of available) {
    assignmentCounts[q.id] = 0;
  }
  for (const t of teams || []) {
    if (t.easy_question_id in assignmentCounts) {
      assignmentCounts[t.easy_question_id]++;
    }
    if (t.medium_question_id in assignmentCounts) {
      assignmentCounts[t.medium_question_id]++;
    }
  }

  // 3. Find the minimum assignment count
  const minCount = Math.min(...Object.values(assignmentCounts));

  // 4. Filter to questions with that minimum count
  const leastAssigned = available.filter((q) => assignmentCounts[q.id] === minCount);

  // 5. Pick one at random from the least-assigned pool
  return leastAssigned[Math.floor(Math.random() * leastAssigned.length)];
}

/**
 * Assign 2 easy questions to a team using least-assigned logic.
 * Both questions come from the easy pool and are always different (no repetition).
 * Assignment happens only once per question slot — idempotent on re-calls.
 */
export async function assignRound(teamId) {
  const team = await getTeamById(teamId);

  let easyQuestionId = team.easy_question_id;
  let mediumQuestionId = team.medium_question_id;
  const updateFields = {};

  // Assign first easy question if not already assigned
  if (!easyQuestionId) {
    const q = await pickLeastAssignedQuestion("easy", []);
    easyQuestionId = q.id;
    updateFields.easy_question_id = easyQuestionId;
  }

  // Assign second easy question if not already assigned, excluding the first one
  if (!mediumQuestionId) {
    const q = await pickLeastAssignedQuestion("easy", [easyQuestionId]);
    mediumQuestionId = q.id;
    updateFields.medium_question_id = mediumQuestionId;
  }

  // Persist any new assignments
  if (Object.keys(updateFields).length > 0) {
    const { error: updateErr } = await supabase
      .from("teams")
      .update(updateFields)
      .eq("id", teamId);

    if (updateErr) throw new Error(`Failed to update team: ${updateErr.message}`);
  }

  // Fetch full question details for both slots in parallel
  const [easyResult, mediumResult] = await Promise.all([
    supabase.from("questions").select("*").eq("id", easyQuestionId).single(),
    supabase.from("questions").select("*").eq("id", mediumQuestionId).single(),
  ]);

  if (easyResult.error) throw new Error(`Failed to fetch easy question details: ${easyResult.error.message}`);
  if (mediumResult.error) throw new Error(`Failed to fetch medium question details: ${mediumResult.error.message}`);

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
