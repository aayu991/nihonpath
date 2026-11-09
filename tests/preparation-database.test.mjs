import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(),
  alice = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  bob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const content = JSON.parse(
    fs.readFileSync("src/data/preparation-content.json", "utf8"),
  ),
  jft = content.banks.find((b) => b.mode === "section"),
  scenario = content.banks.find((b) => b.mode === "scenario"),
  sector = content.sectors[0],
  card = sector.cards[0],
  attempt = crypto.randomUUID();
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
async function role(name, user = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`set role ${name}`);
}
async function rpc(name, args = []) {
  return (
    await rows(
      `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) data`,
      args,
    )
  )[0].data;
}
const answers = (b) =>
  b.questions.map((q) => ({
    questionId: q.id,
    optionId: q.optionIds[q.correctIndex],
  }));
async function publishLegacy(kind, id) {
  const table = {
    program: "learning_programs",
    course: "courses",
    lesson: "lessons",
    deck: "flashcard_decks",
    bank: "question_banks",
  }[kind];
  for (const action of ["request_review", "approve", "publish"]) {
    const version = (
      await rows(`select updated_at from public.${table} where id=$1`, [id])
    )[0].updated_at;
    await rpc(
      ["deck", "bank"].includes(kind)
        ? "admin_learning_review"
        : "admin_review_content",
      [kind, id, action, version],
    );
  }
}
async function publishPrep(kind, id) {
  const table = {
    sector: "industry_sectors",
    scenario: "workplace_scenarios",
    interview: "interview_questions",
    resource: "official_resources",
  }[kind];
  for (const action of ["review", "approve", "publish"]) {
    const version = (
      await rows(`select updated_at from public.${table} where id=$1`, [id])
    )[0].updated_at;
    await rpc("admin_prep_review", [kind, id, action, version]);
  }
}
before(async () => {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
  for (const f of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync("supabase/migrations/" + f, "utf8"));
  await db.exec(
    fs.readFileSync("supabase/seeds/20261024_task6_drafts.sql", "utf8"),
  );
  await rows("insert into auth.users(id) values($1),($2),($3)", [
    alice,
    bob,
    admin,
  ]);
  await rows("insert into private.admin_users values($1)", [admin]);
});
after(() => db.close());
test("draft imports contain 70 original JFT questions and 60 vocabulary records without automatic publication", async () => {
  assert.equal(
    (
      await rows(
        "select count(*)::int n from public.questions q join public.question_banks b on b.id=q.bank_id where b.prep_mode='section'",
      )
    )[0].n,
    70,
  );
  assert.equal(
    (
      await rows(
        "select count(*)::int n from public.vocabulary where sector_id is not null",
      )
    )[0].n,
    60,
  );
  await role("anon");
  for (const table of [
    "industry_sectors",
    "workplace_scenarios",
    "interview_questions",
    "official_resources",
  ])
    assert.equal((await rows("select * from public." + table)).length, 0);
  await assert.rejects(
    () => rows("select * from private.answer_keys"),
    /permission denied/,
  );
});
test("new learning goals persist without granting administration", async () => {
  await role("authenticated", alice);
  await rpc("set_learning_goals", [["jft", "ssw", "workplace"]]);
  assert.equal(
    (await rows("select * from public.user_learning_goals")).length,
    3,
  );
  assert.equal(await rpc("is_admin"), false);
  await assert.rejects(
    () => rpc("admin_prep_save", ["sector", null, {}, null]),
    /Administrator/,
  );
  await assert.rejects(
    () => rpc("admin_prep_audit", [sector.id]),
    /Administrator/,
  );
  await role("authenticated", bob);
  assert.equal(
    (await rows("select * from public.user_learning_goals")).length,
    0,
  );
});
test("content publication requires explicit reviews and matching published parents", async () => {
  await role("authenticated", admin);
  let version = (
    await rows("select updated_at from public.industry_sectors where id=$1", [
      sector.id,
    ])
  )[0].updated_at;
  await assert.rejects(
    () => rpc("admin_prep_review", ["sector", sector.id, "publish", version]),
    /Approval/,
  );
  for (const p of content.programs) await publishLegacy("program", p.id);
  const courses = [
    content.jftCourseId,
    ...content.sectors.map((s) => s.courseId),
    content.interviewCourseId,
  ];
  for (const c of courses) await publishLegacy("course", c);
  for (const s of content.sectors) await publishLegacy("deck", s.deckId);
  for (const b of content.banks) await publishLegacy("bank", b.id);
  for (const s of content.scenarios) await publishLegacy("lesson", s.lessonId);
  for (const q of content.interviews) await publishLegacy("lesson", q.lessonId);
  for (const s of content.sectors) await publishPrep("sector", s.id);
  for (const s of content.scenarios) await publishPrep("scenario", s.id);
  for (const q of content.interviews) await publishPrep("interview", q.id);
  for (const r of content.resources) await publishPrep("resource", r.id);
});
test("reviewed tracks, scenarios and interviews become public while keys remain private", async () => {
  await role("anon");
  assert.equal((await rows("select * from public.industry_sectors")).length, 6);
  assert.equal(
    (await rows("select * from public.workplace_scenarios")).length,
    6,
  );
  assert.equal(
    (await rows("select * from public.interview_questions")).length,
    13,
  );
  assert.equal(
    (await rows("select * from public.official_resources")).length,
    9,
  );
  assert.equal(
    (await rows("select * from public.flashcards where id::text like 'd605%' "))
      .length,
    60,
  );
  await assert.rejects(
    () => rows("select * from private.answer_keys"),
    /permission denied/,
  );
  await assert.rejects(() => rpc("prep_dashboard"), /permission denied/);
});
test("guest JFT grading uses real keys and writes no attempt", async () => {
  const response = await rpc("practice_quiz", [jft.id, answers(jft)]);
  assert.equal(response.score, 10);
  assert.equal(response.saved, false);
  assert.ok(
    response.answers.every((a) => a.explanation && a.japaneseExplanation),
  );
  await role("postgres");
  assert.equal((await rows("select * from public.quiz_attempts")).length, 0);
});
test("member JFT scoring persists exactly once and feeds actual weak-area/history data", async () => {
  await role("authenticated", alice);
  const picks = answers(jft);
  picks[0].optionId =
    jft.questions[0].optionIds[(jft.questions[0].correctIndex + 1) % 3];
  const r = await rpc("submit_quiz", [attempt, jft.id, picks]);
  assert.equal(r.score, 9);
  assert.equal(r.saved, true);
  assert.deepEqual(await rpc("submit_quiz", [attempt, jft.id, picks]), r);
  const dashboard = await rpc("prep_dashboard");
  assert.equal(dashboard.attempts.length, 1);
  assert.equal(dashboard.weak[0].correct, 9);
  assert.equal(dashboard.weak[0].total, 10);
  assert.equal(dashboard.exams, 0);
});
test("workplace cards use the existing idempotent spaced repetition and owner isolation", async () => {
  const event = crypto.randomUUID();
  await rpc("record_review", [event, card.id, "known"]);
  await rpc("record_review", [event, card.id, "known"]);
  let data = await rpc("prep_dashboard"),
    track = data.courses.find((c) => c.id === sector.courseId);
  assert.equal(track.reviews, 1);
  assert.equal(track.known, 1);
  assert.equal(track.due, 0);
  await rpc("record_review", [crypto.randomUUID(), card.id, "again"]);
  data = await rpc("prep_dashboard");
  track = data.courses.find((c) => c.id === sector.courseId);
  assert.equal(track.known, 0);
  assert.equal(track.reviews, 2);
  await role("authenticated", bob);
  assert.equal(
    (await rows("select * from public.flashcard_reviews")).length,
    0,
  );
  assert.equal((await rpc("prep_dashboard")).attempts.length, 0);
  await assert.rejects(
    () => rpc("submit_quiz", [attempt, jft.id, answers(jft)]),
    /conflict/i,
  );
  await role("authenticated", alice);
});
test("scenario practice and interview completion use existing owner records", async () => {
  const result = await rpc("submit_quiz", [
    crypto.randomUUID(),
    scenario.id,
    answers(scenario),
  ]);
  assert.equal(result.total, 1);
  assert.equal(result.score, 1);
  const interview = content.interviews[0];
  await rows(
    "insert into public.lesson_progress(user_id,lesson_id,completed_at) values($1,$2,now()) on conflict(user_id,lesson_id) do update set completed_at=now()",
    [alice, interview.lessonId],
  );
  const data = await rpc("prep_dashboard");
  assert.equal(data.attempts.length, 2);
  assert.equal(
    data.courses.find((c) => c.slug === "workplace-interviews").completed,
    1,
  );
  await role("authenticated", bob);
  assert.equal((await rows("select * from public.lesson_progress")).length, 0);
  await assert.rejects(
    () =>
      rows(
        "insert into public.lesson_progress(user_id,lesson_id,completed_at) values($1,$2,now())",
        [alice, interview.lessonId],
      ),
    /row-level security/,
  );
});
test("industry taxonomy is extensible and edit/version checks prevent silent overwrites", async () => {
  await role("authenticated", admin);
  const course = await rpc("admin_save_content", [
    "course",
    null,
    {
      slug: "ssw-example-new",
      title: "New learning track",
      program_id: content.programs[1].id,
    },
    null,
  ]);
  await publishLegacy("course", course);
  const doc = {
    slug: "example-new",
    title: "Additional learning track",
    title_ja: "追加学習分野",
    summary: "An additional educational track, not a claim of SSW eligibility.",
    summary_ja: "対象分野の資格判断ではなく、追加の学習分野です。",
    course_id: course,
  };
  const id = await rpc("admin_prep_save", ["sector", null, doc, null]);
  const version = (
    await rows("select updated_at from public.industry_sectors where id=$1", [
      id,
    ])
  )[0].updated_at;
  await rpc("admin_prep_save", [
    "sector",
    id,
    { ...doc, title: "Revised track" },
    version,
  ]);
  await assert.rejects(
    () => rpc("admin_prep_save", ["sector", id, doc, version]),
    /Stale/,
  );
  await publishPrep("sector", id);
  await role("anon");
  assert.equal((await rows("select * from public.industry_sectors")).length, 7);
});
test("preparation metadata extends existing bank, vocabulary and deck editors", async () => {
  await role("authenticated", admin);
  const source = jft.questions[0],
    doc = {
      course_id: content.jftCourseId,
      title: "New JFT reviewed draft",
      subject: jft.subject,
      prep_category: "word-meaning",
      prep_mode: "quick",
      questions: [source],
    };
  const bank = await rpc("admin_prep_learning_save", ["bank", null, doc, null]);
  assert.equal(
    (
      await rows("select prep_mode from public.question_banks where id=$1", [
        bank,
      ])
    )[0].prep_mode,
    "quick",
  );
  const vocab = await rpc("admin_prep_learning_save", [
    "vocabulary",
    null,
    {
      course_id: sector.courseId,
      sector_id: sector.id,
      term: "記録",
      reading: "きろく",
      meaning_en: "Record",
      meaning_ja: "書いて残した情報。",
      example: "記録を確認します。",
      example_translation: "I check the record.",
      topic: "Communication",
      difficulty: "basic",
    },
    null,
  ]);
  assert.equal(
    (
      await rows("select sector_id from public.vocabulary where id=$1", [vocab])
    )[0].sector_id,
    sector.id,
  );
});
test("official resource URLs and review dates are guarded", async () => {
  await role("authenticated", admin);
  await assert.rejects(
    () =>
      rpc("admin_prep_save", [
        "resource",
        null,
        {
          sector_id: null,
          category: "ssw",
          title: "Bad source",
          url: "https://ssw.go.jp.attacker.example/info/",
          summary: "An invalid source URL.",
          summary_ja: "不正な情報源です。",
          reviewed_at: "2026-10-24",
        },
        null,
      ]),
    /check constraint/,
  );
});
test("private audio bucket and storage object writes require verified administration", async () => {
  await role("postgres");
  assert.equal(
    (await rows("select public from storage.buckets where id='prep-audio'"))[0]
      .public,
    false,
  );
  await role("authenticated", alice);
  await assert.rejects(
    () =>
      rows(
        "insert into storage.objects(bucket_id,name) values('prep-audio','forged.mp3')",
      ),
    /row-level security/,
  );
  await assert.rejects(
    () => rpc("admin_verify_prep_audio", [crypto.randomUUID(), 30]),
    /Administrator/,
  );
  await role("authenticated", admin);
  const id = crypto.randomUUID();
  await rows(
    "insert into public.audio_assets(id,title,status,storage_path,license_note,mime_type) values($1,'Test metadata only','processing','fixture.mp3','Original rights statement for test.','audio/mpeg')",
    [id],
  );
  await assert.rejects(
    () => rpc("admin_verify_prep_audio", [id, 30]),
    /Stored audio object/,
  );
  await rows(
    "insert into storage.objects(bucket_id,name) values('prep-audio','fixture.mp3')",
  );
  await rpc("admin_verify_prep_audio", [id, 30]);
  const asset = (
    await rows("select * from public.audio_assets where id=$1", [id])
  )[0];
  assert.equal(asset.verified_by, admin);
  assert.equal(asset.published, false);
  assert.ok(asset.verified_at);
  await assert.rejects(
    () => rpc("admin_verify_prep_audio", [id, null]),
    /Invalid duration/,
  );
});
test("seed reapplication preserves published content and learner records", async () => {
  await role("postgres");
  await db.exec(
    fs.readFileSync("supabase/seeds/20261024_task6_drafts.sql", "utf8"),
  );
  assert.equal(
    (
      await rows("select published from public.industry_sectors where id=$1", [
        sector.id,
      ])
    )[0].published,
    true,
  );
  assert.equal(
    (await rows("select count(*)::int n from public.quiz_attempts"))[0].n,
    2,
  );
});
test('cross-industry links and future source review dates are rejected',async()=>{
 await role('authenticated',admin);
 const bad={sector_id:content.sectors[1].id,lesson_id:content.scenarios[0].lessonId,bank_id:content.scenarios[0].bankId,title:'Mismatched scene',situation:'Incorrectly linked industry resources.',situation_ja:'異なる業界の教材です。',dialogue:content.scenarios[0].dialogue};
 await assert.rejects(()=>rpc('admin_prep_save',['scenario',null,bad,null]),/match sector/);
 const date=(await rows("select to_char(current_date+1,'YYYY-MM-DD') as review_day"))[0].review_day;
 const resource=await rpc('admin_prep_save',['resource',null,{sector_id:null,category:'ssw',title:'Future reviewed resource',url:'https://www.ssw.go.jp/en/',summary:'An official resource with an invalid future review date.',summary_ja:'未来の確認日を持つ公式情報です。',reviewed_at:date},null]);
 for(const action of ['review','approve']){const v=(await rows('select updated_at from public.official_resources where id=$1',[resource]))[0].updated_at;await rpc('admin_prep_review',['resource',resource,action,v]);}
 const v=(await rows('select updated_at from public.official_resources where id=$1',[resource]))[0].updated_at;await assert.rejects(()=>rpc('admin_prep_review',['resource',resource,'publish',v]),/Review date/);
});
test('unpublishing a parent course hides its industry activities and vocabulary deck',async()=>{
 await role('authenticated',admin);const v=(await rows('select updated_at from public.courses where id=$1',[sector.courseId]))[0].updated_at;await rpc('admin_review_content',['course',sector.courseId,'unpublish',v]);await role('anon');assert.equal((await rows('select * from public.industry_sectors where id=$1',[sector.id])).length,0);assert.equal((await rows('select * from public.workplace_scenarios where sector_id=$1',[sector.id])).length,0);assert.equal((await rows('select * from public.flashcards where deck_id=$1',[sector.deckId])).length,0);
});
