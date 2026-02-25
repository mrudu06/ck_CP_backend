import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test route
app.get("/test-db", async (req, res) => {
  const { data, error } = await supabase
    .from("teams")   // change to one of your table names
    .select("*")
    .limit(5);

  if (error) {
    return res.status(500).json({ error });
  }

  res.json({ data });
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
