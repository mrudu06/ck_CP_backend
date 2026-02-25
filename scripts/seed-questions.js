/**
 * Seed script — adds missing test cases for existing questions.
 * Questions are looked up by title. Test cases are only ADDED, never deleted.
 * Run: node --env-file=.env scripts/seed-questions.js
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const TARGET = 5;

const QUESTIONS = [
  { title: "Mozzarella and Sticks", test_cases: [
    { input: "10 2 5",    expected_output: "6" },
    { input: "7 2 3",     expected_output: "3" },
    { input: "20 5 1",    expected_output: "2" },
    { input: "10 10 100", expected_output: "1" },
    { input: "12 3 2",    expected_output: "3" },
  ]},
  { title: "Palindrome Checker", test_cases: [
    { input: "racecar", expected_output: "YES" },
    { input: "hello",   expected_output: "NO"  },
    { input: "madam",   expected_output: "YES" },
    { input: "ab",      expected_output: "NO"  },
    { input: "level",   expected_output: "YES" },
  ]},
  { title: "Kitchen Cost", test_cases: [
    { input: "3 5 4 5 6 10 20 30", expected_output: "50"  },
    { input: "1 10 5 100",         expected_output: "0"   },
    { input: "3 1 1 1 1 5 5 5",    expected_output: "15"  },
    { input: "2 10 10 20 50 60",   expected_output: "110" },
    { input: "3 5 5 5 5 10 10 10", expected_output: "30"  },
  ]},
  { title: "Rating in Practice", test_cases: [
    { input: "4 1 2 4 4",   expected_output: "YES" },
    { input: "3 3 2 1",     expected_output: "NO"  },
    { input: "5 1 1 2 2 3", expected_output: "YES" },
    { input: "1 10",        expected_output: "YES" },
    { input: "2 5 1",       expected_output: "NO"  },
  ]},
  { title: "Water Cooler 2", test_cases: [
    { input: "5 12", expected_output: "2" },
    { input: "3 3",  expected_output: "0" },
    { input: "2 11", expected_output: "5" },
    { input: "5 25", expected_output: "4" },
    { input: "1 10", expected_output: "9" },
  ]},
  { title: "Valid Anagram", test_cases: [
    { input: "anagram nagaram", expected_output: "YES" },
    { input: "rat car",         expected_output: "NO"  },
    { input: "listen silent",   expected_output: "YES" },
    { input: "ab ba",           expected_output: "YES" },
    { input: "a aa",            expected_output: "NO"  },
  ]},
  { title: "Cutoff Score", test_cases: [
    { input: "5 3 10 20 30 40 50",    expected_output: "30"  },
    { input: "4 2 5 15 25 35",        expected_output: "15"  },
    { input: "3 1 100 200 300",       expected_output: "100" },
    { input: "5 5 10 20 30 40 50",    expected_output: "10"  },
    { input: "6 3 10 20 30 40 50 60", expected_output: "40"  },
  ]},
  { title: "Facebook Likes", test_cases: [
    { input: "2 10 10 5 10",               expected_output: "2" },
    { input: "4 1 2 3 4 0 0 0 0",          expected_output: "4" },
    { input: "5 10 20 20 10 5 0 10 5 0 0", expected_output: "2" },
    { input: "1 1 1",                      expected_output: "1" },
    { input: "3 10 5 2 1 100 100",         expected_output: "1" },
  ]},
  { title: "Largest and Second Largest", test_cases: [
    { input: "5 1 5 2 4 3",   expected_output: "5 4"   },
    { input: "4 10 20 30 40", expected_output: "40 30" },
    { input: "3 7 7 5",       expected_output: "7 5"   },
    { input: "2 10 20",       expected_output: "20 10" },
    { input: "4 9 8 9 8",     expected_output: "9 8"   },
  ]},
  { title: "Minimize Operations", test_cases: [
    { input: "4 1 2 2 3",   expected_output: "2" },
    { input: "3 5 5 5",     expected_output: "0" },
    { input: "3 1 2 3",     expected_output: "2" },
    { input: "2 1 2",       expected_output: "1" },
    { input: "5 1 2 2 2 3", expected_output: "2" },
  ]},
  { title: "Character Frequency", test_cases: [
    { input: "Apple p",  expected_output: "2" },
    { input: "banana z", expected_output: "0" },
    { input: "aaaaa a",  expected_output: "5" },
    { input: "Apple A",  expected_output: "1" },
    { input: "12121 1",  expected_output: "3" },
  ]},
  { title: "Discount Calculator", test_cases: [
    { input: "1000", expected_output: "800"   },
    { input: "500",  expected_output: "450"   },
    { input: "999",  expected_output: "899.1" },
    { input: "2000", expected_output: "1600"  },
    { input: "100",  expected_output: "90"    },
  ]},
  { title: "Maximum Draw", test_cases: [
    { input: "10 2",  expected_output: "5"   },
    { input: "7 3",   expected_output: "3"   },
    { input: "0 5",   expected_output: "0"   },
    { input: "100 1", expected_output: "100" },
    { input: "15 4",  expected_output: "4"   },
  ]},
  { title: "Even-Odd Sum", test_cases: [
    { input: "3 1 3 5",       expected_output: "9" },
    { input: "2 2 4",         expected_output: "6" },
    { input: "4 10 11 12 13", expected_output: "2" },
    { input: "1 7",           expected_output: "7" },
    { input: "5 0 2 4 1 3",   expected_output: "2" },
  ]},
  { title: "Pizza Slice", test_cases: [
    { input: "1 1",   expected_output: "180" },
    { input: "3 6",   expected_output: "360" },
    { input: "6 1",   expected_output: "30"  },
    { input: "2 3",   expected_output: "270" },
    { input: "180 1", expected_output: "1"   },
  ]},
];

async function seed() {
  console.log("🌱 Fetching existing questions...\n");

  const { data: allQuestions, error: fetchErr } = await supabase
    .from("questions")
    .select("id, title");

  if (fetchErr) {
    console.error("Failed to fetch questions:", fetchErr.message);
    process.exit(1);
  }

  const byTitle = Object.fromEntries(allQuestions.map((q) => [q.title, q.id]));
  let tcAdded = 0;

  for (const q of QUESTIONS) {
    const questionId = byTitle[q.title];
    if (!questionId) {
      console.warn(`⚠️  "${q.title}" not found in DB — skipping`);
      continue;
    }

    const { count: existing } = await supabase
      .from("test_cases")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId);

    const needed = TARGET - (existing || 0);

    if (needed <= 0) {
      console.log(`✅ "${q.title}" — already has ${existing} test cases`);
      continue;
    }

    const toInsert = q.test_cases.slice(-needed).map((tc) => ({
      question_id: questionId,
      input: tc.input,
      expected_output: tc.expected_output,
    }));

    const { error: tcErr } = await supabase.from("test_cases").insert(toInsert);
    if (tcErr) {
      console.error(`❌ "${q.title}" test cases failed:`, tcErr.message);
    } else {
      console.log(`✅ "${q.title}" — added ${toInsert.length} test case(s) (now ${(existing || 0) + toInsert.length})`);
      tcAdded += toInsert.length;
    }
  }

  console.log(`\n🎉 Done! ${tcAdded} test case(s) added.`);
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
