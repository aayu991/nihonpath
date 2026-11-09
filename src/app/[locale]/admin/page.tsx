import { getCmsContext } from "@/lib/cms/server";
import { Link } from "@/i18n/navigation";
import { z } from "zod";
const snapshot = z.object({
  stats: z.record(z.string(), z.number()),
  activity: z.array(
    z.object({
      action: z.string(),
      entity_kind: z.string().nullable(),
      entity_id: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
  queue: z.array(
    z.object({
      entity_kind: z.string(),
      entity_id: z.string(),
      title: z.string().nullable(),
      updated_at: z.string(),
    }),
  ),
});
export default async function Admin() {
  const ctx = await getCmsContext();
  if (!ctx) return null;
  const r = await ctx.client.rpc("cms_dashboard");
  const parsed = snapshot.safeParse(r.data);
  if (!parsed.success)
    return (
      <section>
        <h1>Content overview</h1>
        <p role="alert">
          CMS database unavailable. Apply the reviewed Task 13 migration before
          using the studio.
        </p>
        <nav className="cms-actions" aria-label="Existing administrator tools">
          <Link href="/admin/content/lesson">Existing lesson editor</Link>
          <Link href="/admin/learning/vocabulary">
            Existing learning studio
          </Link>
          <Link href="/admin/guides/legacy">Existing guide studio</Link>
          <Link href="/admin/exams/legacy">Existing exam studio</Link>
          <Link href="/admin/operations">Operations and support</Link>
          <Link href="/admin/tutors">Tutor administration</Link>
          <Link href="/admin/billing">Billing administration</Link>
        </nav>
      </section>
    );
  const d = parsed.data;
  return (
    <>
      <header className="cms-page-heading">
        <div>
          <p className="eyebrow">NIHONPATH / ADMINISTRATION</p>
          <h1>Content overview</h1>
          <p>Build, review and publish learning content with confidence.</p>
        </div>
        {ctx.permissions.edit && (
          <Link className="cms-primary" href="/admin/lessons?new=1">
            + Create lesson
          </Link>
        )}
      </header>
      <div className="cms-stat-grid">
        {Object.entries({
          learners: "Registered learners",
          courses: "Courses",
          lessons: "Published lessons",
          vocabulary: "Vocabulary entries",
          questions: "Questions",
          exams: "Mock examinations",
          review: "Awaiting review",
          drafts: "Saved drafts",
        }).map(([key, label]) => (
          <article className="cms-stat" key={key}>
            <p>{label}</p>
            <strong>{d.stats[key]?.toLocaleString() ?? "Unavailable"}</strong>
          </article>
        ))}
      </div>
      <div className="cms-two-columns">
        <section className="cms-panel">
          <h2>Pending review</h2>
          {d.queue.length ? (
            d.queue.map((w) => (
              <Link
                className="cms-list-row"
                key={w.entity_id}
                href={`/admin/editor/${w.entity_kind}?id=${w.entity_id}`}
              >
                <span>{w.title ?? w.entity_kind}</span>
                <span className="cms-badge">In review</span>
              </Link>
            ))
          ) : (
            <p>No content is waiting for review.</p>
          )}
          <Link href="/admin/reviews">Open review queue →</Link>
        </section>
        <section className="cms-panel">
          <h2>Recent activity</h2>
          {d.activity.length ? (
            d.activity.map((a, i) => (
              <div key={i} className="cms-list-row">
                <span>
                  {a.action.replaceAll("_", " ")}
                  {a.entity_kind && ` · ${a.entity_kind}`}
                </span>
                <time dateTime={a.created_at}>
                  {new Date(a.created_at).toLocaleDateString("en-GB", {
                    timeZone: "UTC",
                  })}
                </time>
              </div>
            ))
          ) : (
            <p>No administrative activity recorded yet.</p>
          )}
        </section>
      </div>
      <section className="cms-panel">
        <h2>Quick actions</h2>
        <div className="cms-actions">
          <Link href="/admin/courses">Manage courses →</Link>
          <Link href="/admin/vocabulary">Manage vocabulary →</Link>
          <Link href="/admin/questions">Build a quiz →</Link>
          <Link href="/admin/media">Upload media →</Link>
        </div>
        <p className="cms-muted">
          Editing a published item creates a separate draft. A different
          reviewer must approve the revision before a publisher can release it.
        </p>
      </section>
    </>
  );
}
