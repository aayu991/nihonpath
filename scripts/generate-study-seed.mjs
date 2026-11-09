import fs from "node:fs";
const data = JSON.parse(
  fs.readFileSync("src/data/study-curriculum.json", "utf8"),
);
const sql = (v) => `'${String(v).replaceAll("'", "''")}'`;
const id = (p, n) =>
  `${p.padEnd(8, "0")}-0000-4000-8000-${String(n + 1).padStart(12, "0")}`;
const rows = [
  "-- Optional demonstration fixture. Apply only after all migrations, after owner review.",
  "-- No existing authored lesson/card/question is overwritten. No learner rows are changed.",
  "begin;",
];
// Publish only the three untouched scaffold levels; a customized row is left alone.
for (const [i, l] of ["n5", "n4", "n3", "n2", "n1"].entries())
  if (i > 1)
    rows.push(
      `update public.courses set published=true,review_status='approved' where id=${sql(id("6", i))} and slug=${sql(l)} and title=${sql("JLPT " + l.toUpperCase())} and review_status='draft' and not published and program_id is null and updated_at=created_at;`,
    );
for (const l of data.lessons)
  rows.push(
    `insert into public.lessons(id,course_id,slug,title,position,subject,body,published,review_status) values(${sql(l.id)},${sql(l.courseId)},${sql("demo-" + l.subject + "-" + l.position)},${sql(l.title)},${l.position},${sql(l.subject)},${sql(JSON.stringify(l.body))}::jsonb,true,'approved') on conflict do nothing;`,
  );
for (const d of data.decks) {
  if (["n5", "n4"].includes(d.level)) continue;
  rows.push(
    `insert into public.flashcard_decks(id,course_id,title) values(${sql(d.id)},${sql(id("6", ["n5", "n4", "n3", "n2", "n1"].indexOf(d.level)))},${sql(d.title)}) on conflict do nothing;`,
  );
  for (const [i, c] of data.cards.filter((c) => c.level === d.level).entries())
    rows.push(
      `insert into public.flashcards(id,deck_id,term,reading,translations,example,example_translation,category,position) values(${sql(c.id)},${sql(d.id)},${sql(c.term)},${sql(c.reading)},${sql(JSON.stringify(c.translations))}::jsonb,${sql(c.example)},${sql(c.exampleTranslation)},${sql(c.category)},${i}) on conflict do nothing;`,
    );
  rows.push(
    `update public.flashcard_decks set review_status='approved',published=true where id=${sql(d.id)} and review_status='draft';`,
  );
}
for (const b of data.banks) {
  rows.push(
    `insert into public.question_banks(id,course_id,title,subject) values(${sql(b.id)},${sql(id("6", ["n5", "n4", "n3", "n2", "n1"].indexOf(b.level)))},${sql(b.title)},${sql(b.subject)}) on conflict do nothing;`,
  );
  for (const [i, q] of b.questions.entries()) {
    if (
      q.options.length !== 4 ||
      new Set(q.options).size !== 4 ||
      q.correctIndex < 0 ||
      q.correctIndex > 3
    )
      throw Error("Invalid key");
    rows.push(
      `insert into public.questions(id,bank_id,prompt,position) values(${sql(q.id)},${sql(b.id)},${sql(q.prompt)},${i}) on conflict do nothing;`,
    );
    for (const [j, opt] of q.options.entries())
      rows.push(
        `insert into public.question_options(id,question_id,text,position) values(${sql(q.optionIds[j])},${sql(q.id)},${sql(opt)},${j}) on conflict do nothing;`,
      );
    rows.push(
      `insert into private.answer_keys(question_id,option_id,explanation,japanese_explanation,translation) values(${sql(q.id)},${sql(q.optionIds[q.correctIndex])},${sql(q.explanation)},${sql(q.japaneseExplanation)},${sql(q.translation)}) on conflict do nothing;`,
    );
  }
  rows.push(
    `update public.question_banks set review_status='approved',published=true where id=${sql(b.id)} and review_status='draft';`,
  );
}
for (const [i, c] of data.cards.entries())
  rows.push(
    `insert into public.vocabulary(id,course_id,term,reading,meaning_en,meaning_ja,example,example_translation,category,published,review_status) values(${sql(id("a1", i))},${sql(id("6", ["n5", "n4", "n3", "n2", "n1"].indexOf(c.level)))},${sql(c.term)},${sql(c.reading)},${sql(c.translations.en)},${sql(c.translations.ja)},${sql(c.example)},${sql(c.exampleTranslation)},${sql(c.category)},true,'approved') on conflict do nothing;`,
  );
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  if (!row.startsWith("insert into ")) continue;
  const start = row.indexOf(" values(");
  const end = row.lastIndexOf(") on conflict do nothing;");
  if (start < 0 || end < 0) continue;
  const table = /insert into ([a-z_.]+)/.exec(row)[1];
  const values = row.slice(start + 8, end);
  const first = /^'([^']+)'/.exec(values)[1];
  rows[i] =
    row.slice(0, start) +
    " select " +
    values +
    " where not exists(select 1 from " +
    table +
    " where " +
    (table === "private.answer_keys" ? "question_id" : "id") +
    "='" +
    first +
    "') on conflict do nothing;";
}

const questionOwners = new Map(
  data.banks.flatMap((b) => b.questions.map((q) => [q.id, b.id])),
);
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  if (/^insert into public\.(flashcard_decks|question_banks)\(/.test(row)) {
    rows[i] =
      "with added as (" +
      row.slice(0, -1) +
      " returning id) insert into pg_temp.task4_created_containers select id from added;";
    continue;
  }
  if (/^update public\.(flashcard_decks|question_banks) /.test(row)) {
    const parent = /where id='([^']+)'/.exec(row)[1];
    rows[i] =
      row.slice(0, -1) +
      " and exists(select 1 from pg_temp.task4_created_containers where id='" +
      parent +
      "');";
    continue;
  }
  let parent;
  const uuids = [...row.matchAll(/'([a-f0-9]{8}-[a-f0-9-]{27})'/g)].map(
    (x) => x[1],
  );
  if (/^insert into public\.(flashcards|questions)\(/.test(row))
    parent = uuids[1];
  if (row.startsWith("insert into public.question_options("))
    parent = questionOwners.get(uuids[1]);
  if (row.startsWith("insert into private.answer_keys("))
    parent = questionOwners.get(uuids[0]);
  if (parent)
    rows[i] = row.replace(
      " on conflict do nothing;",
      " and exists(select 1 from pg_temp.task4_created_containers where id='" +
        parent +
        "') on conflict do nothing;",
    );
}
rows.splice(
  rows.indexOf("begin;") + 1,
  0,
  "create temporary table task4_created_containers(id uuid primary key) on commit drop;",
);
rows.push("commit;");
fs.mkdirSync("supabase/seeds", { recursive: true });
fs.writeFileSync(
  "supabase/seeds/20261024_task4_demo.sql",
  rows.join("\n") + "\n",
);
