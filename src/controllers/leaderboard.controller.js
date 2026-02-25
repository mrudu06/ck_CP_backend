import supabase from "../config/supabase.js";

export async function getLeaderboard(req, res) {
  try {
    const { data, error } = await supabase
      .from("teams")
      .select(
        "team_name, easy_score, easy_submission_count, completion_time, created_at"
      );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const now = Date.now();
    const DUMMY_DRIVE_LINK = "https://drive.google.com/drive/folders/1noTFb9SGdCd8IET8R_r9U6_o0PWOmjQW?usp=drive_link";

    const leaderboard = data
      .map((team) => {
        const easyScore = team.easy_score || 0;

        // Calculate cp_time_taken dynamically from created_at
        let cpTimeTaken = null;
        if (team.created_at) {
          if (team.completion_time) {
            // Contest completed: time = completion_time - created_at
            const startMs = new Date(team.created_at).getTime();
            const endMs = new Date(team.completion_time).getTime();
            cpTimeTaken = Math.floor((endMs - startMs) / 1000);
          } else {
            // Still in progress: time = now - created_at
            const startMs = new Date(team.created_at).getTime();
            cpTimeTaken = Math.floor((now - startMs) / 1000);
          }
        }

        return {
          team_name: team.team_name,
          easy_score: easyScore,
          total_score: easyScore,
          easy_submission_count: team.easy_submission_count || 0,
          completion_time: team.completion_time || null,
          cp_time_taken: cpTimeTaken,
        };
      })
      .sort((a, b) => {
        // 1. Higher total_score first
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }

        // 2. For teams with the same score, lower cp_time_taken wins
        const aTime = a.cp_time_taken != null ? a.cp_time_taken : Infinity;
        const bTime = b.cp_time_taken != null ? b.cp_time_taken : Infinity;
        return aTime - bTime;
      })
      .map((team) => {
        if (team.completion_time) {
          return { ...team, drive_link: DUMMY_DRIVE_LINK };
        }
        return team;
      });

    return res.status(200).json({ leaderboard });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
