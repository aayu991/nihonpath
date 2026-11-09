import { notFound } from "next/navigation";
import { getCmsContext } from "@/lib/cms/server";
import { UserControls } from "@/components/cms/user-controls";
import { Link } from "@/i18n/navigation";
import { z } from "zod";
const userSchema = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  display_name: z.string().nullable(),
  role: z.string().nullable(),
  email_confirmed_at: z.string().nullable(),
  banned_until: z.string().nullable(),
  suspended: z.boolean(),
  legacy_admin:z.boolean(),
  enrollments: z.number(),
  support_requests: z.number(),
});
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; user?: string }>;
}) {
  const ctx = await getCmsContext();
  if (!ctx?.permissions.users) notFound();
  const s = await searchParams;
  const page = Math.min(3000, Math.max(0, Number(s.page) || 0));
  const r = await ctx.client.rpc("cms_users", {
    p_query: (s.q ?? "").slice(0, 100),
    p_offset: page * 30,
  });
  const users = z.array(userSchema).safeParse(r.data);
  const detail =
    s.user && z.uuid().safeParse(s.user).success
      ? await ctx.client.rpc("cms_user_detail", { p_user: s.user })
      : null;
  return (
    <>
      <header className="cms-page-heading">
        <div>
          <p className="eyebrow">RESTRICTED ADMINISTRATION</p>
          <h1>Users & permissions</h1>
          <p>
            Only Super Admins can access this audited directory. Passwords,
            tokens and authentication secrets are never returned.
          </p>
        </div>
      </header>
      <form className="cms-filters">
        <label>
          Search name or email
          <input name="q" maxLength={100} defaultValue={s.q} />
        </label>
        <button type="submit" className="cms-primary">
          Search users
        </button>
      </form>
      {!users.success ? (
        <p role="alert">User directory unavailable.</p>
      ) : (
        <>
          {users.data.map((u) => (
            <article key={u.id} className="cms-panel">
              <div className="cms-page-heading">
                <div>
                  <h2>{u.display_name || "Unnamed account"}</h2>
                  <p>{u.email ?? "Email unavailable"}</p>
                  <p className="cms-muted">
                    {u.email_confirmed_at
                      ? "Email verified"
                      : "Email unverified"}{" "}
                    · {u.suspended ? "Suspended" : "No active suspension"}
                  </p>
                  <p>
                    {u.enrollments} enrollments · {u.support_requests} support
                    requests
                  </p>
                </div>
                <Link href={`?user=${u.id}&q=${encodeURIComponent(s.q ?? "")}`}>
                  Review account details →
                </Link>
              </div>
              <UserControls
                id={u.id}
                role={u.role}
                configured={!!process.env.SUPABASE_SECRET_KEY}
                protectedAccount={u.legacy_admin||u.id===ctx.user.id}
              />
            </article>
          ))}
          <nav className="cms-pagination" aria-label="User pages">
            {page > 0 && (
              <Link
                href={`?page=${page - 1}&q=${encodeURIComponent(s.q ?? "")}`}
              >
                ← Previous
              </Link>
            )}
            {users.data.length === 30 && (
              <Link
                href={`?page=${page + 1}&q=${encodeURIComponent(s.q ?? "")}`}
              >
                Next →
              </Link>
            )}
          </nav>
        </>
      )}
      {detail && (
        <section className="cms-panel">
          <h2>Account enrollments and support</h2>
          {detail.error ? (
            <p role="alert">Account details unavailable.</p>
          ) : (
            <pre className="cms-json">
              {JSON.stringify(detail.data, null, 2)}
            </pre>
          )}
        </section>
      )}
    </>
  );
}
