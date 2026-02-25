import { assignRound, startTimer } from "../services/round.service.js";

export async function startRound(req, res) {
  try {
    const { team_id } = req.body;

    if (!team_id) {
      return res.status(400).json({ error: "team_id is required" });
    }

    const roundData = await assignRound(team_id);
    return res.status(200).json(roundData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function startCpTimer(req, res) {
  try {
    const { team_id } = req.body;

    if (!team_id) {
      return res.status(400).json({ error: "team_id is required" });
    }

    const result = await startTimer(team_id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
