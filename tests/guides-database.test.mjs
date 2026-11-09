import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(),
  alice = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  bob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  admin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  d = JSON.parse(fs.readFileSync("src/data/guide-content.json", "utf8")),
  article = d.catalog.articles[1],
  template = d.catalog.templates[1],
  item = d.catalog.items.find((i) => i.template_id === template.id);
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
async function role(name, user = "") {
  await db.exec("reset role");
  await rows("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`set role ${name}`);
}
async function rpc(name, args = []) {
  return (
    await rows(
      `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) result`,
      args,
    )
  )[0].result;
}
const tables = {
  article: "guide_articles",
  translation: "guide_translations",
  category: "guide_categories",
  source: "official_resources",
  template: "visa_checklist_templates",
  item: "visa_checklist_items",
};
async function transition(kind, id, action) {
  const v = (
    await rows(`select updated_at from public.${tables[kind]} where id=$1`, [
      id,
    ])
  )[0].updated_at;
  return rpc("admin_guide_transition", [
    kind,
    id,
    action,
    v,
    "Explicit fixture review for local policy testing only.",
  ]);
}
async function publish(kind, id) {
  for (const a of ["request_review", "approve", "publish"])
    await transition(kind, id, a);
}
async function legacy(kind, id) {
  const table = {
    program: "learning_programs",
    course: "courses",
    lesson: "lessons",
    deck: "flashcard_decks",
    bank: "question_banks",
  }[kind];
  for (const action of ["request_review", "approve", "publish"]) {
    const v = (
      await rows(`select updated_at from public.${table} where id=$1`, [id])
    )[0].updated_at;
    await rpc(
      ["deck", "bank"].includes(kind)
        ? "admin_learning_review"
        : "admin_review_content",
      [kind, id, action, v],
    );
  }
}
before(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const f of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync("supabase/migrations/" + f, "utf8"));
  await db.exec(
    fs.readFileSync("supabase/seeds/20261025_task8_drafts.sql", "utf8"),
  );
  await rows("insert into auth.users(id) values($1),($2),($3)", [
    alice,
    bob,
    admin,
  ]);
  await rows("insert into private.admin_users values($1)", [admin]);
});
after(() => db.close());
test("guide drafts are complete, not automatically public, and old contracts are retained", async () => {
  assert.equal(
    (await rows("select count(*)::int n from public.guide_articles"))[0].n,
    18,
  );
  assert.equal(
    (await rows("select count(*)::int n from public.visa_checklist_items"))[0]
      .n,
    27,
  );
  await role("anon");
  const c = await rpc("guide_catalog");
  assert.equal(c.articles.length, 0);
  assert.equal(c.items.length, 0);
});
test("ordinary learners cannot author guides, forge reviews or read revision history", async () => {
  await role("authenticated", alice);
  await assert.rejects(
    () => rpc("admin_guide_save", ["category", null, {}, null]),
    /Administrator/,
  );
  await assert.rejects(() => transition("article", article.id, "publish"));
  for (const t of [
    "guide_articles",
    "article_reviews",
    "user_checklist_progress",
  ])
    await assert.rejects(
      () => rows(`insert into public.${t} default values`),
      /permission denied/,
    );
  assert.equal(
    (await rows("select * from public.article_revisions")).length,
    0,
  );
});
test("source verification and explicit human review gate publication", async () => {
  await role("authenticated", admin);
  await assert.rejects(
    () => transition("article", article.id, "publish"),
    /Approval/,
  );
  const source = d.catalog.sources[0];
  await transition("source", source.id, "request_review");
  await assert.rejects(
    () => transition("source", source.id, "approve"),
    /Source verification/,
  );
  await role("postgres");
  await rows(
    "update public.official_resources set verified_at=current_date where category='guide'",
  );
  await role("authenticated", admin);
  await transition("source", source.id, "request_review");
  await transition("source", source.id, "approve");
  await transition("source", source.id, "publish");
  for (const s of d.catalog.sources.slice(1)) await publish("source", s.id);
  for (const c of d.catalog.categories) await publish("category", c.id);
});
test("legal guidance needs current source review, reviewed translation and published learning parents", async () => {
  await legacy("program", d.programId);
  await legacy("course", d.courseId);
  await legacy("deck", article.deck_id);
  await legacy("bank", article.bank_id);
  for (const id of article.lesson_ids) await legacy("lesson", id);
  await role("postgres");
  await rows("update public.ai_scenarios set published=true where id=$1", [
    article.ai_scenario_id,
  ]);
  await role("authenticated", admin);
  await transition("article", article.id, "request_review");
  await assert.rejects(
    () => transition("article", article.id, "approve"),
    /Source review/,
  );
  await transition("article", article.id, "review_sources");
  await transition("article", article.id, "approve");
  await assert.rejects(
    () => transition("article", article.id, "publish"),
    /translation/,
  );
  const translation = d.catalog.translations.find(
    (t) => t.article_id === article.id,
  );
  await transition("translation", translation.id, "request_review");
  await transition("translation", translation.id, "approve");
  await transition("article", article.id, "publish");
  await publish("template", template.id);
});
test("public catalog contains only reviewed published guidance and no private records", async () => {
  await role("anon");
  const c = await rpc("guide_catalog");
  assert.equal(c.articles.length, 1);
  assert.equal(c.templates.length, 1);
  assert.equal(c.items.length, 3);
  assert(!JSON.stringify(c).includes("reviewer_id"));
  await assert.rejects(
    () => rows("select * from public.user_checklists"),
    /permission denied/,
  );
});
test("audience preferences are owner-scoped planning labels, not permissions", async () => {
  await role("authenticated", alice);
  await rpc("set_guide_preferences", [
    {
      audiences: ["student", "ssw"],
      stage: "arriving",
      renting: true,
      banking: true,
    },
  ]);
  assert.equal(await rpc("is_admin"), false);
  assert.equal(
    (await rows("select * from public.user_checklists"))[0].stage,
    "arriving",
  );
  await assert.rejects(() =>
    rpc("set_guide_preferences", [
      { audiences: ["admin"], stage: "before", renting: true, banking: true },
    ]),
  );
  await role("authenticated", bob);
  assert.equal((await rows("select * from public.user_checklists")).length, 0);
});
let version;
test("checklist progress, private notes and optional dates persist with edit-conflict protection", async () => {
  await role("authenticated", alice);
  const r = await rpc("save_guide_item", [
    item.id,
    true,
    "Ask which counter applies; no personal identifiers.",
    "2026-11-01",
    null,
  ]);
  version = r.updated_at;
  assert.equal(r.completed, true);
  assert.equal(r.due_date, "2026-11-01");
  await assert.rejects(
    () => rpc("save_guide_item", [item.id, false, "", null, null]),
    /Stale/,
  );
  assert.equal(
    (await rows("select * from public.user_checklist_progress"))[0].notes,
    r.notes,
  );
  await role("authenticated", bob);
  assert.equal(
    (await rows("select * from public.user_checklist_progress")).length,
    0,
  );
  const own = await rpc("save_guide_item", [
    item.id,
    false,
    "Bob's private note",
    null,
    null,
  ]);
  assert.equal(own.user_id, bob);
});
test("learner feedback cannot unpublish guidance or become an editorial approval", async () => {
  await role("authenticated", alice);
  await rpc("submit_guide_feedback", [
    article.id,
    "outdated",
    "Please check the office's new opening arrangements.",
  ]);
  const c = await rpc("guide_catalog");
  assert.equal(c.articles.length, 1);
  await role("authenticated", bob);
  assert.equal((await rows("select * from public.article_feedback")).length, 0);
});
test("edits preserve history, invalidate reviews and protect against stale admin saves", async () => {
  await role("authenticated", admin);
  const row = (
      await rows("select * from public.guide_articles where id=$1", [
        article.id,
      ])
    )[0],
    { id, ...data } = article;
  void id;
  await rpc("admin_guide_save", [
    "article",
    article.id,
    { ...data, title: "Updated city-hall language guide" },
    row.updated_at,
  ]);
  await assert.rejects(
    () =>
      rpc("admin_guide_save", ["article", article.id, data, row.updated_at]),
    /Stale/,
  );
  assert(
    (
      await rows("select * from public.article_revisions where article_id=$1", [
        article.id,
      ])
    ).length > 0,
  );
  await role("anon");
  assert.equal((await rpc("guide_catalog")).articles.length, 0);
  await role("authenticated", admin);
  await transition("article", article.id, "request_review");
  await assert.rejects(
    () => transition("article", article.id, "approve"),
    /Source review/,
  );
  await transition("article", article.id, "review_sources");
  await transition("article", article.id, "approve");
  await assert.rejects(
    () => transition("article", article.id, "publish"),
    /translation/,
  );
  const translation = d.catalog.translations.find(
    (t) => t.article_id === article.id,
  );
  await transition("translation", translation.id, "request_review");
  await transition("translation", translation.id, "approve");
  await transition("article", article.id, "publish");
});
test("unpublishing a source immediately hides dependent public guides and templates", async () => {
  await role("authenticated", admin);
  await transition("source", article.source_ids[0], "unpublish");
  await role("anon");
  const c = await rpc("guide_catalog");
  assert.equal(c.articles.length, 0);
  assert.equal(c.templates.length, 0);
  await role("authenticated", alice);
  assert.equal(
    (await rows("select * from public.user_checklist_progress")).length,
    1,
  );
  await assert.rejects(
    () => rpc("save_guide_item", [item.id, false, "", null, version]),
    /Published/,
  );
  await role("authenticated", admin);
  await transition("source", article.source_ids[0], "publish");
});
test("changing a task increments its version without converting old ticks into verified completion", async () => {
  await role("authenticated", admin);
  const row = (
    await rows("select * from public.visa_checklist_items where id=$1", [
      item.id,
    ])
  )[0];
  await rpc("admin_guide_save", [
    "item",
    item.id,
    { ...item, title: "Confirm the updated office arrangements" },
    row.updated_at,
  ]);
  const updated = (
    await rows("select * from public.visa_checklist_items where id=$1", [
      item.id,
    ])
  )[0];
  await role("authenticated", alice);
  const old = (await rows("select * from public.user_checklist_progress"))[0];
  assert(updated.version > old.item_version);
});
test("optional seed is repeatable and preserves reviewed content and private notes", async () => {
  await role("postgres");
  await db.exec(
    fs.readFileSync("supabase/seeds/20261025_task8_drafts.sql", "utf8"),
  );
  assert.equal(
    (
      await rows("select title from public.guide_articles where id=$1", [
        article.id,
      ])
    )[0].title,
    "Updated city-hall language guide",
  );
  assert.equal(
    (
      await rows("select count(*)::int n from public.user_checklist_progress")
    )[0].n,
    2,
  );
});
test("source edits revoke verification and dependent approvals; older editors cannot bypass the new source gate", async () => {
  await role("authenticated", admin);
  const s = (
    await rows("select * from public.official_resources where id=$1", [
      article.source_ids[0],
    ])
  )[0];
  await rpc("admin_guide_save", [
    "source",
    s.id,
    {
      title: s.title + " updated",
      url: s.url,
      summary: s.summary,
      summary_ja: s.summary_ja,
      jurisdiction: s.jurisdiction,
      publication_date: null,
      verified_at: s.verified_at,
    },
    s.updated_at,
  ]);
  const current = (
    await rows("select * from public.official_resources where id=$1", [s.id])
  )[0];
  assert.equal(current.verified_by, null);
  const a = (
    await rows("select * from public.guide_articles where id=$1", [article.id])
  )[0];
  assert.equal(a.published, false);
  assert.equal(a.review_status, "draft");
  for (const action of ["review", "approve"]) {
    const v = (
      await rows(
        "select updated_at from public.official_resources where id=$1",
        [s.id],
      )
    )[0].updated_at;
    await rpc("admin_prep_review", ["resource", s.id, action, v]);
  }
  const v = (
    await rows("select updated_at from public.official_resources where id=$1", [
      s.id,
    ])
  )[0].updated_at;
  await assert.rejects(
    () => rpc("admin_prep_review", ["resource", s.id, "publish", v]),
    /verification/,
  );
});
test("marking an article outdated requires a fresh source and translation review version", async () => {
  await role("authenticated", admin);
  const before = (
    await rows("select version from public.guide_articles where id=$1", [
      article.id,
    ])
  )[0].version;
  await transition("article", article.id, "outdated");
  const after = (
    await rows("select * from public.guide_articles where id=$1", [article.id])
  )[0];
  assert(after.version > before);
  assert.equal(after.outdated, true);
  assert(
    (
      await rows(
        "select * from public.article_reviews where article_id=$1 and kind='outdated'",
        [article.id],
      )
    ).length > 0,
  );
});
