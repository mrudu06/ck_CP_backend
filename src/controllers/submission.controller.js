import { processSubmission } from "../services/submission.service.js";

export async function submitCode(req, res) {
  try {
    const { team_id, question_id, language_id, source_code } = req.body;

    if (!team_id || !question_id || !language_id || !source_code) {
      return res.status(400).json({
        error: "team_id, question_id, language_id, and source_code are required",
      });
    }

    const result = await processSubmission(team_id, question_id, language_id, source_code);

    const response = {
      status: result.status,
      score: result.score,
      passed_testcases: result.passed_testcases,
      total_testcases: result.total_testcases,
      submission_number: result.submission_number,
      submissions_remaining: result.submissions_remaining,
      details: result.details,
    };

    if (result.both_solved) {
      response.message = "Both problems solved! Contest complete for your team.";
    }

    return res.status(200).json(response);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    return res.status(status).json({ error: message });
  }
}
