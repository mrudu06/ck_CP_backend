import supabase from "../config/supabase.js";

export async function signup(req, res) {
  try {
    const { team_name, password } = req.body;

    if (!team_name || !password) {
      return res.status(400).json({ error: "team_name and password are required" });
    }

    const { data, error } = await supabase
      .from("teams")
      .insert({ team_name, password })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Team name already exists" });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ team_id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
