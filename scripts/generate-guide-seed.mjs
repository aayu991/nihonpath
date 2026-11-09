import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("src/data/guide-content.json", "utf8"));
const quote = (v) =>
  v === null
    ? "null"
    : typeof v === "boolean" || typeof v === "number"
      ? String(v)
      : `'${(typeof v === "object" ? JSON.stringify(v) : v).replaceAll("'", "''")}'`;
const array = (v) =>
  `array[${v.map(quote).join(",")}]${v.length ? "" : "::text[]"}`;
let sql =
  "-- Original guide and language DRAFTS. Human source/content review required.\nbegin;\n";
function insert(table, data, keys = ["id"], arrayFields = []) {
  const values = Object.entries(data).map(([k, v]) =>
    arrayFields.includes(k)
      ? array(v) + (k === "lesson_ids" ? "::uuid[]" : "")
      : quote(v),
  );
  sql += `insert into ${table}(${Object.keys(data).join(",")}) select ${values.join(",")} where not exists(select 1 from ${table} where ${keys.map((k) => `${k}=${quote(data[k])}`).join(" and ")}) on conflict do nothing;\n`;
}
insert("public.learning_programs", {
  id: d.programId,
  slug: "japan-life-language",
  title: "Japan Life language practice",
  summary:
    "Original draft language exercises for everyday orientation. Human review required.",
  category: "life-in-japan",
});
insert("public.courses", {
  id: d.courseId,
  slug: "japan-life-language",
  title: "Japan Life Japanese",
  program_id: d.programId,
});
for (const c of d.catalog.categories) insert("public.guide_categories", c);
for (const s of d.catalog.sources)
  insert("public.official_resources", {
    ...s,
    category: "guide",
    summary:
      "Official reference for editorial verification; consult the current authority for your own circumstances.",
    summary_ja:
      "編集時に確認する公式の参考情報です。自分の状況について担当の公式機関に確認してください。",
  });
for (const r of d.roleplays) {
  const { articleId, dialogue, ...record } = r;
  void articleId;
  void dialogue;
  insert("public.ai_scenarios", record);
}
for (const [i, a] of d.catalog.articles.entries()) {
  const ja = d.catalog.translations.find((t) => t.article_id === a.id);
  insert("public.lessons", {
    id: a.lesson_ids[0],
    course_id: d.courseId,
    slug: a.slug,
    title: a.title,
    subject: "grammar",
    position: i,
    body: {
      text: a.summary,
      explanationEn: a.content.sections[0].text,
      explanationJa: ja.content.sections[0].text,
      examples: [
        { japanese: a.content.phrases[0].ja, english: a.content.phrases[0].en },
        {
          japanese: "分からないので、もう一度説明してください。",
          english: "I do not understand; please explain once more.",
        },
      ],
    },
  });
  if (a.deck_id)
    insert("public.flashcard_decks", {
      id: a.deck_id,
      course_id: d.courseId,
      title: a.title + " vocabulary",
    });
  const bank = d.banks.find((b) => b.id === a.bank_id);
  insert("public.question_banks", {
    id: bank.id,
    course_id: d.courseId,
    title: bank.title,
    subject: i < 10 ? "vocabulary" : "reading",
  });
  for (const [j, q] of bank.questions.entries()) {
    insert("public.questions", {
      id: q.id,
      bank_id: bank.id,
      prompt: q.prompt,
      position: j,
    });
    q.options.forEach((text, k) =>
      insert("public.question_options", {
        id: q.optionIds[k],
        question_id: q.id,
        text,
        position: k,
      }),
    );
    insert(
      "private.answer_keys",
      {
        question_id: q.id,
        option_id: q.optionIds[q.correctIndex],
        explanation: q.explanation,
        japanese_explanation: q.japaneseExplanation,
        translation: q.translation,
      },
      ["question_id"],
    );
  }
  const { source_ids, ...record } = a;
  insert(
    "public.guide_articles",
    record,
    ["id"],
    ["audiences", "stages", "lesson_ids"],
  );
  for (const source_id of source_ids)
    insert("public.guide_source_links", { article_id: a.id, source_id }, [
      "article_id",
      "source_id",
    ]);
}
for (const t of d.catalog.translations) insert("public.guide_translations", t);
for (const c of d.cards) {
  insert("public.vocabulary", {
    id: c.vocabularyId,
    course_id: d.courseId,
    term: c.term,
    reading: c.reading,
    meaning_en: c.translations.en,
    meaning_ja: c.translations.ja,
    example: c.example,
    example_translation: c.exampleTranslation,
    category: c.category,
    topic: "Japan life",
    difficulty: "basic",
  });
  insert("public.flashcards", {
    id: c.id,
    deck_id: c.deckId,
    vocabulary_id: c.vocabularyId,
    term: c.term,
    reading: c.reading,
    translations: c.translations,
    example: c.example,
    example_translation: c.exampleTranslation,
    category: c.category,
    position: d.cards
      .filter((v) => v.deckId === c.deckId)
      .findIndex((v) => v.id === c.id),
  });
}
for (const t of d.catalog.templates)
  insert(
    "public.visa_checklist_templates",
    {
      ...t,
      informational_notice:
        "Personal planning only. Checking a task does not establish compliance or eligibility.",
    },
    ["id"],
    ["audiences", "stages"],
  );
for (const i of d.catalog.items)
  insert("public.visa_checklist_items", i, ["id"], ["audiences"]);
sql += "commit;\n";
fs.writeFileSync("supabase/seeds/20261025_task8_drafts.sql", sql);
console.log("Generated Task 8 drafts. Nothing published.");
