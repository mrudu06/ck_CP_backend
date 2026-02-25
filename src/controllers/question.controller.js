import supabase from "../config/supabase.js";

export async function getQuestions(req, res) {
  try {
    const { team_id } = req.params;

    if (!team_id) {
      return res.status(400).json({ error: "team_id is required" });
    }

    // Fetch team
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("*")
      .eq("id", team_id)
      .single();

    if (teamErr || !team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Fetch both assigned questions in parallel
    let easyQuestion = null;
    let mediumQuestion = null;

    const fetches = [];

    if (team.easy_question_id) {
      fetches.push(
        supabase
          .from("questions")
          .select("*")
          .eq("id", team.easy_question_id)
          .single()
          .then(({ data }) => { easyQuestion = data; })
      );
    }

    if (team.medium_question_id) {
      fetches.push(
        supabase
          .from("questions")
          .select("*")
          .eq("id", team.medium_question_id)
          .single()
          .then(({ data }) => { mediumQuestion = data; })
      );
    }

    await Promise.all(fetches);

    // Calculate cp_time_taken dynamically from created_at
    let cpTimeTaken = null;
    if (team.created_at) {
      if (team.completion_time) {
        // Completed: freeze at completion_time - created_at
        const startMs = new Date(team.created_at).getTime();
        const endMs = new Date(team.completion_time).getTime();
        cpTimeTaken = Math.floor((endMs - startMs) / 1000);
      } else {
        // In progress: live elapsed
        const startMs = new Date(team.created_at).getTime();
        cpTimeTaken = Math.floor((Date.now() - startMs) / 1000);
      }
    }

    const easySolved    = (team.easy_score || 0) === 100;
    const mediumSolved  = (team.medium_score || 0) === 100;
    const easyExhausted  = (team.easy_submission_count || 0) >= 10;
    const mediumExhausted = (team.medium_submission_count || 0) >= 10;

    // Easy is "done" (solved or exhausted) — frontend should be on medium
    const easyDone   = easySolved || easyExhausted;
    const mediumDone = mediumSolved || mediumExhausted;

    return res.status(200).json({
      easy_question: easyQuestion,
      // Medium question is only exposed after the easy question is done (solved or exhausted)
      medium_question: easyDone ? mediumQuestion : null,
      easy_score: team.easy_score || 0,
      medium_score: team.medium_score || 0,
      easy_submission_count: team.easy_submission_count || 0,
      medium_submission_count: team.medium_submission_count || 0,
      easy_solved: easySolved,
      medium_solved: mediumSolved,
      easy_exhausted: easyExhausted,
      medium_exhausted: mediumExhausted,
      easy_done: easyDone,
      medium_done: mediumDone,
      both_solved: easySolved && mediumSolved,
      completion_time: team.completion_time || null,
      cp_start_time: team.created_at || null,
      cp_time_taken: cpTimeTaken,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
