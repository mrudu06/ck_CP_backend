import supabase from "../config/supabase.js";

const CREATIVES_DRIVE_LINK =
  "https://drive.google.com/drive/folders/1noTFb9SGdCd8IET8R_r9U6_o0PWOmjQW?usp=drive_link";

export async function getLeaderboard(req, res) {
  try {
    const { data, error } = await supabase
      .from("teams")
      .select(
        "team_name, easy_score, medium_score, easy_submission_count, medium_submission_count, completion_time, cp_start_time"
      );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const now = Date.now();

    const leaderboard = data
      .map((team) => {
        const easyScore = team.easy_score || 0;
        const mediumScore = team.medium_score || 0;
        const totalScore = easyScore + mediumScore;

        // Calculate cp_time_taken from cp_start_time (the dedicated timer column)
        let cpTimeTaken = null;
        if (team.cp_start_time) {
          if (team.completion_time) {
            // Contest completed: freeze at completion_time - cp_start_time
            const startMs = new Date(team.cp_start_time).getTime();
            const endMs = new Date(team.completion_time).getTime();
            cpTimeTaken = Math.floor((endMs - startMs) / 1000);
          } else {
            // Still in progress: live elapsed
            const startMs = new Date(team.cp_start_time).getTime();
            cpTimeTaken = Math.floor((now - startMs) / 1000);
          }
        }

        const entry = {
          team_name: team.team_name,
          easy_score: easyScore,
          medium_score: mediumScore,
          total_score: totalScore,
          easy_submission_count: team.easy_submission_count || 0,
          medium_submission_count: team.medium_submission_count || 0,
          completion_time: team.completion_time || null,
          cp_time_taken: cpTimeTaken,
        };

        // Provide drive link to teams that have completed both questions
        if (team.completion_time) {
          entry.drive_link = CREATIVES_DRIVE_LINK;
        }

        return entry;
      })
      .sort((a, b) => {
        // 1. Higher total_score first
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }

        // 2. Same score — lower cp_time_taken wins (faster team ranks higher)
        const aTime = a.cp_time_taken != null ? a.cp_time_taken : Infinity;
        const bTime = b.cp_time_taken != null ? b.cp_time_taken : Infinity;
        return aTime - bTime;
      });

    return res.status(200).json({ leaderboard });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
