import fs from "node:fs";
import { demoScenarios } from "../src/lib/ai/scenarios.ts";
const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
const columns = [
  "id",
  "slug",
  "title",
  "title_ja",
  "description",
  "description_ja",
  "suggested_level",
  "opening",
  "opening_translation",
  "prompt_template",
];
const sql =
  "-- Optional original scenario definitions. No existing definitions are overwritten.\n" +
  demoScenarios
    .map(
      (s) =>
        `insert into public.ai_scenarios(${columns.join(",")},published) values(${columns.map((k) => quote(s[k])).join(",")},true) on conflict do nothing;`,
    )
    .join("\n") +
  "\n";
fs.writeFileSync("supabase/seeds/20261024_task7_scenarios.sql", sql);
console.log("Generated six original scenario definitions; no hosted writes.");
