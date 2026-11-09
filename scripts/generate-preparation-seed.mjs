import fs from "node:fs";
const d = JSON.parse(
  fs.readFileSync("src/data/preparation-content.json", "utf8"),
);
const quote = (v) =>
  v === null
    ? "null"
    : typeof v === "boolean"
      ? String(v)
      : typeof v === "number"
        ? String(v)
        : `'${(typeof v === "object" ? JSON.stringify(v) : v).replaceAll("'", "''")}'`;
let sql =
  "-- Original educational DRAFTS. No human review is implied.\n-- Apply after 202610240005_preparation_centers.sql. Existing rows are preserved.\nbegin;\n";
function insert(table, data) {
  const key = table === "private.answer_keys" ? "question_id" : "id";
  sql += `insert into ${table}(${Object.keys(data).join(",")}) select ${Object.values(data).map(quote).join(",")} where not exists(select 1 from ${table} where ${key}=${quote(data[key])}) on conflict do nothing;\n`;
}
for (const p of d.programs)
  insert("public.learning_programs", {
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary:
      "Original preparation content. Educator review required before publication.",
    category: p.category,
  });
const course = (id, slug, title, program) =>
  insert("public.courses", { id, slug, title, program_id: program });
course(
  d.jftCourseId,
  "jft-basic-foundation",
  "JFT-Basic preparation",
  d.programs[0].id,
);
for (const s of d.sectors)
  course(s.courseId, "ssw-" + s.slug, s.title + " Japanese", d.programs[1].id);
course(
  d.interviewCourseId,
  "workplace-interviews",
  "Japanese interview preparation",
  d.programs[1].id,
);
for (const s of d.sectors) {
  insert("public.industry_sectors", {
    id: s.id,
    slug: s.slug,
    title: s.title,
    title_ja: s.titleJa,
    summary: s.summary,
    summary_ja: s.summaryJa,
    course_id: s.courseId,
  });
  insert("public.flashcard_decks", {
    id: s.deckId,
    course_id: s.courseId,
    title: s.title + " vocabulary",
  });
  for (const [i, c] of s.cards.entries()) {
    insert("public.vocabulary", {
      id: c.vocabularyId,
      course_id: s.courseId,
      sector_id: s.id,
      term: c.term,
      reading: c.reading,
      meaning_en: c.translations.en,
      meaning_ja: c.translations.ja,
      example: c.example,
      example_translation: c.exampleTranslation,
      topic: c.topic,
      category: c.category,
      difficulty: c.difficulty,
    });
    insert("public.flashcards", {
      id: c.id,
      deck_id: s.deckId,
      vocabulary_id: c.vocabularyId,
      term: c.term,
      reading: c.reading,
      translations: c.translations,
      example: c.example,
      example_translation: c.exampleTranslation,
      category: c.category,
      position: i,
    });
  }
}
for (const b of d.banks) {
  insert("public.question_banks", {
    id: b.id,
    course_id: b.courseId,
    title: b.title,
    subject: b.subject,
    prep_category: b.category,
    prep_mode: b.mode,
  });
  for (const [i, q] of b.questions.entries()) {
    insert("public.questions", {
      id: q.id,
      bank_id: b.id,
      prompt: q.prompt,
      position: i,
    });
    for (const [j, text] of q.options.entries())
      insert("public.question_options", {
        id: q.optionIds[j],
        question_id: q.id,
        text,
        position: j,
      });
    insert("private.answer_keys", {
      question_id: q.id,
      option_id: q.optionIds[q.correctIndex],
      explanation: q.explanation,
      japanese_explanation: q.japaneseExplanation,
      translation: q.translation,
    });
  }
}
for (const s of d.scenarios) {
  const sector = d.sectors.find((t) => t.id === s.sectorId);
  insert("public.lessons", {
    id: s.lessonId,
    course_id: sector.courseId,
    slug: "workplace-conversation",
    title: s.title,
    subject: "grammar",
    position: 0,
    body: {
      text: s.situation,
      examples: s.dialogue.map((line) => ({
        japanese: line.ja,
        english: line.en,
      })),
      explanationEn: d.banks.find((b) => b.id === s.bankId).questions[0]
        .explanation,
      explanationJa: d.banks.find((b) => b.id === s.bankId).questions[0]
        .japaneseExplanation,
    },
  });
  insert("public.workplace_scenarios", {
    id: s.id,
    sector_id: s.sectorId,
    lesson_id: s.lessonId,
    bank_id: s.bankId,
    title: s.title,
    situation: s.situation,
    situation_ja: s.situationJa,
    dialogue: s.dialogue,
  });
}
for (const [i, q] of d.interviews.entries()) {
  const sector = d.sectors.find((s) => s.id === q.sectorId);
  insert("public.lessons", {
    id: q.lessonId,
    course_id: sector?.courseId ?? d.interviewCourseId,
    slug: "interview-" + (i + 1),
    title: q.topic + " interview practice",
    subject: "grammar",
    position: sector ? 1 : i,
    body: {
      text: q.prompt,
      examples: [
        { japanese: q.answer, english: q.translation },
        {
          japanese: "本日はお時間をいただき、ありがとうございます。",
          english: "Thank you for taking the time to meet with me today.",
        },
      ],
      explanationEn: q.explanation,
      explanationJa: q.explanationJa,
    },
  });
  insert("public.interview_questions", {
    id: q.id,
    sector_id: q.sectorId,
    lesson_id: q.lessonId,
    topic: q.topic,
    prompt: q.prompt,
    suggested_answer: q.answer,
    translation: q.translation,
    explanation: q.explanation,
    explanation_ja: q.explanationJa,
  });
}
for (const r of d.resources)
  insert("public.official_resources", {
    id: r.id,
    sector_id:r.sectorId??null,
    category: r.category,
    title: r.title,
    url: r.url,
    summary: r.summary,
    summary_ja: r.summaryJa,
    reviewed_at: r.reviewedAt,
  });
sql += "commit;\n";
fs.writeFileSync("supabase/seeds/20261024_task6_drafts.sql", sql);
console.log("Generated optional draft seed; nothing published.");
