"use client";
import { organizationMessageKey } from "@/lib/organizations/messages";
import { useState, useTransition, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  organizationCommand,
  inviteOrganization,
} from "@/actions/organizations";
import { OrganizationFields } from "./entry";
import {
  isOrgAdmin,
  canTeach,
  completion,
  organizationDate,
  toCsv,
  type Workspace,
  type OrgAction,
  type Report,
} from "@/lib/organizations/schema";
type Option = { id: string; title: string; href?: string };
function download(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function CommandForm({
  action,
  prepare,
  children,
  label = "save",
  formKey,
  onCommand,
  pending,
}: {
  action: OrgAction;
  prepare?: (data: FormData) => unknown;
  children: ReactNode;
  label?: string;
  formKey?: string;
  onCommand: (action: OrgAction, data: unknown) => void;
  pending: boolean;
}) {
  const translate = useTranslations("Organization"),
    t = (key: string) => translate(organizationMessageKey(key));
  return (
    <form
      key={formKey}
      className="org-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onCommand(action, prepare ? prepare(fd) : Object.fromEntries(fd));
      }}
    >
      {children}
      <Button disabled={pending}>{t(pending ? "saving" : label)}</Button>
    </form>
  );
}
function Select({
  name,
  label,
  options,
  optional = false,
  value,
}: {
  name: string;
  label: string;
  options: Option[];
  optional?: boolean;
  value?: string;
}) {
  const translate = useTranslations("Organization"),
    t = (key: string) => translate(organizationMessageKey(key));
  return (
    <label>
      {t(label)}
      <select name={name} defaultValue={value ?? ""} required={!optional}>
        <option value="">—</option>
        {options.map((o) => (
          <option value={o.id} key={o.id}>
            {o.title}
          </option>
        ))}
      </select>
    </label>
  );
}
export function OrganizationConsole({
  workspace: w,
  view,
  courses,
  sectors,
}: {
  workspace: Workspace;
  view: string;
  courses: Option[];
  sectors: Option[];
}) {
  const translate = useTranslations("Organization"),
    t = (key: string) => translate(organizationMessageKey(key)),
    locale = useLocale(),
    router = useRouter(),
    admin = isOrgAdmin(w.role),
    writer = canTeach(w.role);
  const [pending, start] = useTransition(),
    [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [level, setLevel] = useState("all"),
    [industry, setIndustry] = useState("all");
  const [editClass, setEditClass] = useState<
    Workspace["classes"][number] | null
  >(null);
  const [sessionId, setSessionId] = useState(w.sessions[0]?.id ?? ""),
    [marks, setMarks] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<{ email: string; token: string }[]>([]);
  const [classFilter, setClassFilter] = useState("all"),
    [courseFilter, setCourseFilter] = useState("all"),
    [teacherFilter, setTeacherFilter] = useState("all"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [overdue, setOverdue] = useState(false);
  function run(action: OrgAction, data: unknown) {
    start(async () => {
      setNotice("");
      try {
        const r = await organizationCommand(w.organization.id, action, data);
        setNotice(t(r.error ?? "saved"));
        if (!r.error) {
          setMarks({});
          router.refresh();
        }
      } catch {
        setNotice(t("saveError"));
      }
    });
  }
  const classOptions = w.classes.map((c) => ({ id: c.id, title: c.title }));
  const learners = w.members.filter((m) => m.role === "learner"),
    activeLearners = learners.filter((m) => m.status === "active");
  const visiblePeople = w.members.filter(
    (m) =>
      m.display_name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
      (status === "all" || m.status === status) &&
      (level === "all" || m.jlpt_level === level) &&
      (industry === "all" || m.sector_id === industry),
  );
  const currentSession = w.sessions.find((s) => s.id === sessionId);
  const classPeople = activeLearners.filter(
    (m) =>
      w.enrollments.some(
        (e) =>
          e.class_id === currentSession?.class_id && e.user_id === m.user_id,
      ) &&
      m.display_name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const fitsClass = (id: string | null) =>
    classFilter === "all" || id === classFilter;
  const fitsTeacher = (id: string | null) =>
    teacherFilter === "all" ||
    w.teachers.some((r) => r.class_id === id && r.user_id === teacherFilter);
  const fitsDate = (date: string) =>
    !from || organizationDate(date, w.organization.timezone) >= from;
  const inRange = (date: string) =>
    fitsDate(date) &&
    (!to || organizationDate(date, w.organization.timezone) <= to);
  const filteredClasses = w.classes.filter(
    (c) =>
      fitsClass(c.id) &&
      fitsTeacher(c.id) &&
      (courseFilter === "all" ||
        w.assignments.some(
          (a) =>
            a.course_id === courseFilter &&
            (a.class_id === c.id ||
              w.enrollments.some(
                (e) => e.class_id === c.id && e.user_id === a.learner_id,
              )),
        )),
  );
  const filteredLearners = learners.filter(
    (m) =>
      (level === "all" || m.jlpt_level === level) &&
      (industry === "all" || m.sector_id === industry) &&
      ((classFilter === "all" &&
        teacherFilter === "all" &&
        courseFilter === "all") ||
        w.enrollments.some(
          (e) =>
            e.user_id === m.user_id &&
            filteredClasses.some((c) => c.id === e.class_id),
        ) ||
        (classFilter === "all" &&
          teacherFilter === "all" &&
          w.assignments.some(
            (a) => a.learner_id === m.user_id && a.course_id === courseFilter,
          ))),
  );
  const reports = w.reports.filter(
    (r) =>
      fitsClass(r.class_id) &&
      fitsTeacher(r.class_id) &&
      (courseFilter === "all" || r.course_id === courseFilter) &&
      (level === "all" || r.jlpt_level === level) &&
      (industry === "all" || r.sector_id === industry) &&
      (!overdue ||
        (!!r.deadline &&
          r.deadline <
            organizationDate(
              new Date().toISOString(),
              w.organization.timezone,
            ) &&
          completion(r) !== null &&
          (completion(r) ?? 100) < 100)),
  );
  const attendance = w.attendance.filter((a) => {
    const s = w.sessions.find((s) => s.id === a.session_id),
      m = w.members.find((m) => m.user_id === a.student_id);
    return (
      !!s &&
      fitsClass(s.class_id) &&
      fitsTeacher(s.class_id) &&
      inRange(s.starts_at) &&
      (level === "all" || m?.jlpt_level === level) &&
      (industry === "all" || m?.sector_id === industry) &&
      (courseFilter === "all" ||
        w.assignments.some(
          (r) =>
            r.course_id === courseFilter &&
            (r.class_id === s.class_id || r.learner_id === a.student_id),
        ))
    );
  });
  const marked = attendance.filter((a) => a.status !== "excused"),
    attendanceRate = marked.length
      ? Math.round(
          (100 *
            marked.filter((a) => a.status === "present" || a.status === "late")
              .length) /
            marked.length,
        )
      : null;
  const uniqueReports = [
    ...new Map(reports.map((r) => [r.user_id + ":" + r.course_id, r])).values(),
  ];
  const practices = uniqueReports
    .flatMap((r) => r.practice ?? [])
    .filter((p) => inRange(p.created_at));
  const total = practices.reduce((s, p) => s + p.total, 0),
    accuracy = total
      ? Math.round((100 * practices.reduce((s, p) => s + p.score, 0)) / total)
      : null;
  const totalLessons = uniqueReports.reduce(
      (s, r) => s + (r.total_lessons ?? 0),
      0,
    ),
    completedLessons = uniqueReports.reduce(
      (s, r) => s + (r.completed_lessons ?? 0),
      0,
    );
  function percent(n: number | null) {
    return n === null ? "—" : `${n}%`;
  }
  function filters() {
    return (
      <div className="org-filters">
        <label>
          {t("from")}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          {t("to")}
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        {[
          ["class", classFilter, setClassFilter, classOptions],
          ["course", courseFilter, setCourseFilter, courses],
          [
            "instructor",
            teacherFilter,
            setTeacherFilter,
            w.members
              .filter((m) => ["instructor", "manager"].includes(m.role))
              .map((m) => ({ id: m.user_id, title: m.display_name })),
          ],
          [
            "jlpt",
            level,
            setLevel,
            ["n5", "n4", "n3", "n2", "n1"].map((id) => ({
              id,
              title: id.toUpperCase(),
            })),
          ],
          ["industry", industry, setIndustry, sectors],
        ].map(([label, value, setter, options]) => (
          <label key={String(label)}>
            {t(String(label))}
            <select
              value={String(value)}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
            >
              <option value="all">{t("all")}</option>
              {(options as Option[]).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }
  function reportRows(rs: Report[]) {
    return [
      [
        t("person"),
        t("course"),
        t("class"),
        t("completion"),
        t("accuracy"),
        t("deadline"),
        t("status"),
      ],
      ...rs.map((r) => {
        const ps = (r.practice ?? []).filter((p) => inRange(p.created_at)),
          n = ps.reduce((s, p) => s + p.total, 0);
        return [
          r.display_name,
          r.course_title,
          w.classes.find((c) => c.id === r.class_id)?.title ?? "",
          completion(r),
          n ? Math.round((100 * ps.reduce((s, p) => s + p.score, 0)) / n) : "",
          r.deadline,
          r.practice === null ? t("private") : t("active"),
        ];
      }),
    ];
  }
  function reportTable() {
    return (
      <>
        <Button
          variant="outline"
          onClick={() =>
            download("nihonpath-training.csv", reportRows(reports))
          }
        >
          {t("export")}
        </Button>
        <div className="org-table-wrap">
          <table>
            <caption>{t("reports")}</caption>
            <thead>
              <tr>
                {reportRows([])[0].map((h) => (
                  <th key={String(h)} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportRows(reports)
                .slice(1)
                .map((row, i) => (
                  <tr key={i}>
                    {row.map((v, j) => (
                      <td key={j}>
                        {j === 3 || j === 4
                          ? typeof v === "number"
                            ? `${v}%`
                            : "—"
                          : (v ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!reports.length && <p>{t("empty")}</p>}
      </>
    );
  }
  function charts() {
    const months = new Map<string, number>();
    for (const p of practices)
      months.set(
        organizationDate(p.created_at, w.organization.timezone).slice(0, 7),
        (months.get(
          organizationDate(p.created_at, w.organization.timezone).slice(0, 7),
        ) ?? 0) + 1,
      );
    const max = Math.max(1, ...months.values());
    return (
      <div className="org-chart-grid">
        <section className="org-panel">
          <h2>{t("monthly")}</h2>
          {!months.size ? (
            <p>{t("empty")}</p>
          ) : (
            <div
              className="org-bars"
              role="img"
              aria-label={[...months].map(([m, n]) => `${m}: ${n}`).join(", ")}
            >
              {[...months].sort().map(([m, n]) => (
                <div key={m}>
                  <span>{m}</span>
                  <span className="org-bar-track">
                    <span style={{ width: `${(100 * n) / max}%` }} />
                  </span>
                  <strong>{n}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="org-panel">
          <h2>{t("weakAreas")}</h2>
          {["vocabulary", "grammar", "kanji", "reading", "listening"].map(
            (subject) => {
              const ps = practices.filter((p) => p.subject === subject),
                n = ps.reduce((s, p) => s + p.total, 0);
              return (
                <p key={subject}>
                  {t(subject)}{" "}
                  <strong>
                    {percent(
                      n
                        ? Math.round(
                            (100 * ps.reduce((s, p) => s + p.score, 0)) / n,
                          )
                        : null,
                    )}
                  </strong>
                </p>
              );
            },
          )}
        </section>
      </div>
    );
  }
  return (
    <div className="org-content">
      <header className="org-page-header">
        <p className="eyebrow">
          {w.organization.name} / {t(w.role)}
        </p>
        <h1>{t(view)}</h1>
        <p className="org-fine">
          {t("timezone")}: {w.organization.timezone}
        </p>
        <p>{t("trainingNotice")}</p>
      </header>
      {notice && (
        <p role="status" className="org-notice">
          {notice}
        </p>
      )}
      {view === "settings" && (
        <>
          <section className="org-panel">
            <h2>{t("sharing")}</h2>
            <p>{t("privacy")}</p>
            <CommandForm
              onCommand={run}
              pending={pending}
              action="sharing"
              prepare={(d) => ({
                share_progress: d.get("share_progress") === "on",
              })}
            >
              <label className="org-check">
                <input
                  type="checkbox"
                  name="share_progress"
                  defaultChecked={
                    w.members.find((m) => m.user_id === w.user_id)
                      ?.share_progress ?? false
                  }
                />
                {t("sharing")}
              </label>
            </CommandForm>
          </section>
          {admin && (
            <>
              <section className="org-panel">
                <h2>{t("settings")}</h2>
                <CommandForm
                  onCommand={run}
                  pending={pending}
                  action="settings"
                >
                  <OrganizationFields value={w.organization} />
                </CommandForm>
              </section>
              <section className="org-panel">
                <h2>{t("audit")}</h2>
                <ol>
                  {w.audit.map((a) => (
                    <li key={a.id}>
                      <time dateTime={a.created_at}>
                        {new Date(a.created_at).toLocaleString(locale, {
                          timeZone: w.organization.timezone,
                        })}
                      </time>{" "}
                      · {a.action}
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </>
      )}
      {view === "learners" && (
        <>
          <section className="org-panel">
            <div className="org-filters">
              <label>
                {t("search")}
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label>
                {t("status")}
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {["all", "active", "inactive"].map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("jlpt")}
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="all">{t("all")}</option>
                  {["n5", "n4", "n3", "n2", "n1"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("industry")}
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="all">{t("all")}</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                download("nihonpath-members.csv", [
                  [
                    t("name"),
                    t("role"),
                    t("status"),
                    t("jlpt"),
                    t("jft"),
                    t("industry"),
                  ],
                  ...visiblePeople.map((m) => [
                    m.display_name,
                    t(m.role),
                    t(m.status),
                    m.jlpt_level,
                    m.jft_preparing,
                    sectors.find((s) => s.id === m.sector_id)?.title ?? "",
                  ]),
                ])
              }
            >
              {t("export")}
            </Button>
            <div className="org-member-list">
              {visiblePeople.map((m) => (
                <article key={m.user_id}>
                  <h3>{m.display_name}</h3>
                  <p>
                    {t(m.role)} · {t(m.status)} · {m.jlpt_level.toUpperCase()} ·{" "}
                    {m.share_progress ? t("sharing") : t("private")}
                  </p>
                  {admin && m.role !== "owner" && m.user_id !== w.user_id && (
                    <details>
                      <summary>{t("edit")}</summary>
                      <CommandForm
                        onCommand={run}
                        pending={pending}
                        action="member"
                        prepare={(d) => ({
                          ...Object.fromEntries(d),
                          user_id: m.user_id,
                          jft_preparing: d.get("jft_preparing") === "on",
                        })}
                      >
                        <label>
                          {t("role")}
                          <select
                            name="role"
                            defaultValue={m.role}
                            disabled={
                              w.role !== "owner" && w.role !== "platform_admin"
                            }
                          >
                            {[
                              "administrator",
                              "instructor",
                              "manager",
                              "learner",
                            ].map((r) => (
                              <option key={r} value={r}>
                                {t(r)}
                              </option>
                            ))}
                          </select>
                          {w.role !== "owner" &&
                            w.role !== "platform_admin" && (
                              <input type="hidden" name="role" value={m.role} />
                            )}
                        </label>
                        <label>
                          {t("status")}
                          <select name="status" defaultValue={m.status}>
                            <option value="active">{t("active")}</option>
                            <option value="inactive">{t("inactive")}</option>
                          </select>
                        </label>
                        <label>
                          {t("jlpt")}
                          <select name="jlpt_level" defaultValue={m.jlpt_level}>
                            {["n5", "n4", "n3", "n2", "n1"].map((l) => (
                              <option key={l}>{l}</option>
                            ))}
                          </select>
                        </label>
                        <Select
                          name="sector_id"
                          label="industry"
                          options={sectors}
                          optional
                          value={m.sector_id ?? ""}
                        />
                        <label className="org-check">
                          <input
                            type="checkbox"
                            name="jft_preparing"
                            defaultChecked={m.jft_preparing}
                          />
                          {t("jft")}
                        </label>
                      </CommandForm>
                    </details>
                  )}
                </article>
              ))}
            </div>
            {!visiblePeople.length && <p>{t("empty")}</p>}
          </section>
          {admin && (
            <section className="org-panel">
              <h2>{t("invite")}</h2>
              <p>{t("inviteNote")}</p>
              <form
                className="org-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  start(async () => {
                    try {
                      const result = await inviteOrganization({
                        org: w.organization.id,
                        emails: String(data.get("emails"))
                          .split(/\s+/)
                          .filter(Boolean),
                        role: data.get("role"),
                      });
                      setLinks(result.invitations ?? []);
                      setNotice(t(result.error ?? "saved"));
                      router.refresh();
                    } catch {
                      setNotice(t("saveError"));
                    }
                  });
                }}
              >
                <label>
                  {t("emails")}
                  <textarea name="emails" required rows={3} />
                </label>
                <Select
                  name="role"
                  label="role"
                  options={[
                    "learner",
                    "instructor",
                    "manager",
                    ...(w.role === "owner" || w.role === "platform_admin"
                      ? ["administrator"]
                      : []),
                  ].map((r) => ({ id: r, title: t(r) }))}
                />
                <Button disabled={pending}>{t("invite")}</Button>
              </form>
              {links.map((l) => {
                const url = `${window.location.origin}/${locale}/organizations/onboarding?token=${l.token}`;
                return (
                  <label key={l.token}>
                    {l.email}
                    <input
                      readOnly
                      value={url}
                      onFocus={(e) => e.target.select()}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(url)
                          .then(() => setNotice(t("saved")))
                          .catch(() => setNotice(t("saveError")))
                      }
                    >
                      {t("copy")}
                    </Button>
                  </label>
                );
              })}
              <ul>
                {w.invitations.map((i) => (
                  <li key={i.id}>
                    {i.email} · {t(i.role)} ·{" "}
                    <time dateTime={i.expires_at}>
                      {new Date(i.expires_at).toLocaleDateString(locale, {
                        timeZone: w.organization.timezone,
                      })}
                    </time>
                    {!i.revoked_at && !i.accepted_at && (
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={() => run("revoke_invite", { id: i.id })}
                      >
                        {t("revoke")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {view === "classes" && (
        <>
          <div className="org-class-grid">
            {w.classes.map((c) => (
              <article className="org-panel" key={c.id}>
                <h2>{c.title}</h2>
                <p>{c.schedule}</p>
                <p>
                  {w.enrollments.filter((e) => e.class_id === c.id).length}{" "}
                  {t("learners")}
                </p>
                <ul>
                  {w.teachers
                    .filter((r) => r.class_id === c.id)
                    .map((r) => (
                      <li key={r.user_id}>
                        {w.members.find((m) => m.user_id === r.user_id)
                          ?.display_name ?? t("instructor")}
                      </li>
                    ))}
                </ul>
                {writer && (
                  <Button variant="outline" onClick={() => setEditClass(c)}>
                    {t("edit")}
                  </Button>
                )}
              </article>
            ))}
          </div>
          {!w.classes.length && <p>{t("empty")}</p>}
          {writer && (
            <>
              <section className="org-panel">
                <h2>{t(editClass ? "edit" : "createClass")}</h2>
                <CommandForm
                  onCommand={run}
                  pending={pending}
                  action="class"
                  formKey={editClass?.id ?? "new"}
                  label={editClass ? "save" : "createClass"}
                  prepare={(d) => ({
                    ...Object.fromEntries(d),
                    id: editClass?.id ?? null,
                    expected: editClass?.updated_at ?? null,
                  })}
                >
                  <label>
                    {t("classTitle")}
                    <input
                      name="title"
                      required
                      maxLength={180}
                      defaultValue={editClass?.title ?? ""}
                    />
                  </label>
                  <label>
                    {t("schedule")}
                    <textarea
                      name="schedule"
                      maxLength={1000}
                      defaultValue={editClass?.schedule ?? ""}
                    />
                  </label>
                </CommandForm>
                {editClass && (
                  <Button variant="outline" onClick={() => setEditClass(null)}>
                    {t("createClass")}
                  </Button>
                )}
              </section>
              <section className="org-panel">
                <h2>{t("enroll")}</h2>
                <CommandForm
                  onCommand={run}
                  pending={pending}
                  action="enroll"
                  label="enroll"
                  prepare={(d) => ({
                    ...Object.fromEntries(d),
                    remove: d.get("remove") === "on",
                  })}
                >
                  <Select
                    name="class_id"
                    label="class"
                    options={classOptions}
                  />
                  <Select
                    name="user_id"
                    label="learner"
                    options={activeLearners.map((m) => ({
                      id: m.user_id,
                      title: m.display_name,
                    }))}
                  />
                  <label className="org-check">
                    <input type="checkbox" name="remove" />
                    {t("remove")}
                  </label>
                </CommandForm>
              </section>
              {admin && (
                <section className="org-panel">
                  <h2>{t("assignTeacher")}</h2>
                  <CommandForm
                    onCommand={run}
                    pending={pending}
                    action="teacher"
                    label="assignTeacher"
                    prepare={(d) => ({
                      ...Object.fromEntries(d),
                      remove: d.get("remove") === "on",
                    })}
                  >
                    <Select
                      name="class_id"
                      label="class"
                      options={classOptions}
                    />
                    <Select
                      name="user_id"
                      label="instructor"
                      options={w.members
                        .filter(
                          (m) =>
                            ["instructor", "manager"].includes(m.role) &&
                            m.status === "active",
                        )
                        .map((m) => ({ id: m.user_id, title: m.display_name }))}
                    />
                    <label className="org-check">
                      <input type="checkbox" name="remove" />
                      {t("remove")}
                    </label>
                  </CommandForm>
                </section>
              )}
              <section className="org-panel">
                <h2>{t("createSession")}</h2>
                <CommandForm
                  onCommand={run}
                  pending={pending}
                  action="session"
                  label="createSession"
                  prepare={(d) => ({
                    ...Object.fromEntries(d),
                    starts_at: new Date(
                      String(d.get("starts_at")),
                    ).toISOString(),
                  })}
                >
                  <Select
                    name="class_id"
                    label="class"
                    options={classOptions}
                  />
                  <label>
                    {t("sessionTitle")}
                    <input name="title" required maxLength={180} />
                  </label>
                  <label>
                    {t("starts")}
                    <input type="datetime-local" name="starts_at" required />
                  </label>
                </CommandForm>
              </section>
            </>
          )}
        </>
      )}
      {view === "attendance" && (
        <>
          <section className="org-panel">
            <div className="org-filters">
              <label>
                {t("selectSession")}
                <select
                  value={sessionId}
                  onChange={(e) => {
                    setSessionId(e.target.value);
                    setMarks({});
                  }}
                >
                  <option value="">—</option>
                  {w.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {w.classes.find((c) => c.id === s.class_id)?.title} ·{" "}
                      {s.title} ·{" "}
                      {new Date(s.starts_at).toLocaleString(locale, {
                        timeZone: w.organization.timezone,
                      })}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("search")}
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            {writer && (
              <label>
                {t("bulk")}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value)
                      setMarks((m) => ({
                        ...m,
                        ...Object.fromEntries(
                          classPeople.map((p) => [p.user_id, value]),
                        ),
                      }));
                  }}
                >
                  <option value="">—</option>
                  {["present", "absent", "late", "excused"].map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="org-attendance-list">
              {classPeople.map((m) => {
                const record = w.attendance.find(
                  (a) =>
                    a.session_id === sessionId && a.student_id === m.user_id,
                );
                return (
                  <label key={m.user_id}>
                    {m.display_name}
                    <select
                      disabled={!writer || pending}
                      value={marks[m.user_id] ?? record?.status ?? ""}
                      onChange={(e) =>
                        setMarks((v) => ({ ...v, [m.user_id]: e.target.value }))
                      }
                    >
                      <option value="">{t("unmarked")}</option>
                      {["present", "absent", "late", "excused"].map((s) => (
                        <option key={s} value={s}>
                          {t(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
            {writer && (
              <Button
                disabled={pending || !Object.values(marks).some(Boolean)}
                onClick={() =>
                  run("attendance", {
                    id: sessionId,
                    records: Object.entries(marks)
                      .filter(([, s]) => s)
                      .map(([user_id, status]) => ({
                        user_id,
                        status,
                        expected:
                          w.attendance.find(
                            (a) =>
                              a.session_id === sessionId &&
                              a.student_id === user_id,
                          )?.updated_at ?? null,
                      })),
                  })
                }
              >
                {t("saveAttendance")}
              </Button>
            )}
            {!classPeople.length && <p>{t("empty")}</p>}
          </section>
          <section className="org-panel">
            <h2>{t("history")}</h2>
            <label>
              {t("month")}
              <input
                type="month"
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month] = e.target.value.split("-").map(Number);
                    setFrom(e.target.value + "-01");
                    setTo(
                      new Date(Date.UTC(year, month, 0))
                        .toISOString()
                        .slice(0, 10),
                    );
                  } else {
                    setFrom("");
                    setTo("");
                  }
                }}
              />
            </label>
            {filters()}
            <p>
              {t("attendanceRate")}: {percent(attendanceRate)}
            </p>
            <p>
              {t("method")} {t("dateScope")}
            </p>
            <Button
              variant="outline"
              onClick={() =>
                download("nihonpath-attendance.csv", [
                  [t("person"), t("class"), t("starts"), t("status")],
                  ...attendance.map((a) => {
                    const s = w.sessions.find((s) => s.id === a.session_id);
                    return [
                      w.members.find((m) => m.user_id === a.student_id)
                        ?.display_name,
                      w.classes.find((c) => c.id === s?.class_id)?.title,
                      s?.starts_at,
                      t(a.status),
                    ];
                  }),
                ])
              }
            >
              {t("export")}
            </Button>
            <div className="org-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("person")}</th>
                    <th>{t("starts")}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a.session_id + a.student_id}>
                      <td>
                        {
                          w.members.find((m) => m.user_id === a.student_id)
                            ?.display_name
                        }
                      </td>
                      <td>
                        {new Date(
                          w.sessions.find((s) => s.id === a.session_id)!
                            .starts_at,
                        ).toLocaleString(locale, {
                          timeZone: w.organization.timezone,
                        })}
                      </td>
                      <td>{t(a.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {view === "assignments" && (
        <>
          {writer && (
            <section className="org-panel">
              <h2>{t("assign")}</h2>
              <CommandForm
                onCommand={run}
                pending={pending}
                action="assignment"
                label="assign"
                prepare={(d) => {
                  const target = String(d.get("target"));
                  return {
                    course_id: d.get("course_id"),
                    class_id: target.startsWith("class:")
                      ? target.slice(6)
                      : null,
                    user_id: target.startsWith("user:")
                      ? target.slice(5)
                      : null,
                    deadline: d.get("deadline"),
                  };
                }}
              >
                <Select name="course_id" label="course" options={courses} />
                <Select
                  name="target"
                  label="target"
                  options={[
                    ...classOptions.map((c) => ({
                      id: "class:" + c.id,
                      title: t("class") + ": " + c.title,
                    })),
                    ...activeLearners.map((m) => ({
                      id: "user:" + m.user_id,
                      title: m.display_name,
                    })),
                  ]}
                />
                <label>
                  {t("deadline")}
                  <input name="deadline" type="date" />
                </label>
              </CommandForm>
            </section>
          )}
          <div className="org-class-grid">
            {w.assignments.map((a) => (
              <article className="org-panel" key={a.id}>
                <h2>
                  <Link
                    href={
                      courses.find((c) => c.id === a.course_id)?.href ??
                      "/courses"
                    }
                  >
                    {a.course_title} →
                  </Link>
                </h2>
                <p>
                  {a.class_id
                    ? w.classes.find((c) => c.id === a.class_id)?.title
                    : w.members.find((m) => m.user_id === a.learner_id)
                        ?.display_name}
                </p>
                <p>{a.deadline ?? "—"}</p>
                {writer && (
                  <Button
                    disabled={pending}
                    onClick={() => run("remind", { id: a.id })}
                  >
                    {t("remind")}
                  </Button>
                )}
              </article>
            ))}
          </div>
          {filters()}
          <label className="org-check">
            <input
              type="checkbox"
              checked={overdue}
              onChange={(e) => setOverdue(e.target.checked)}
            />
            {t("overdue")}
          </label>
          {reportTable()}
        </>
      )}
      {["dashboard", "teacher", "employer", "reports"].includes(view) && (
        <>
          {filters()}
          <div className="org-kpis">
            {[
              ["totalLearners", filteredLearners.length],
              [
                "activeLearners",
                filteredLearners.filter((m) => m.status === "active").length,
              ],
              ["totalClasses", filteredClasses.length],
              ["attendanceRate", percent(attendanceRate)],
              [
                "completion",
                percent(
                  totalLessons
                    ? Math.round((100 * completedLessons) / totalLessons)
                    : null,
                ),
              ],
              ["accuracy", percent(accuracy)],
            ].map(([label, value]) => (
              <article key={label} className="org-kpi">
                <span>{t(String(label))}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <p className="org-fine">
            {t("method")} {t("dateScope")}
          </p>
          {charts()}
          {view === "teacher" && (
            <section className="org-panel">
              <h2>{t("classes")}</h2>
              {w.classes.map((c) => (
                <p key={c.id}>
                  <strong>{c.title}</strong> · {c.schedule}
                </p>
              ))}
              <h2>{t("selectSession")}</h2>
              {w.sessions
                .filter((s) => new Date(s.starts_at) > new Date())
                .slice()
                .reverse()
                .slice(0, 10)
                .map((s) => (
                  <p key={s.id}>
                    {s.title} ·{" "}
                    {new Date(s.starts_at).toLocaleString(locale, {
                      timeZone: w.organization.timezone,
                    })}
                  </p>
                ))}
              <Link href="/organization/attendance" className="text-link">
                {t("attendance")} →
              </Link>
            </section>
          )}
          {reportTable()}
          <section className="org-panel">
            <h2>{t("recent")}</h2>
            {uniqueReports
              .filter((r) => r.last_activity)
              .map((r) => (
                <p key={r.assignment_id + r.user_id}>
                  {r.display_name} · {r.course_title} ·{" "}
                  {new Date(r.last_activity!).toLocaleDateString(locale, {
                    timeZone: w.organization.timezone,
                  })}
                </p>
              ))}
          </section>
          {!!w.reminders.length && (
            <section className="org-panel">
              <h2>{t("reminders")}</h2>
              {w.reminders.map((r) => (
                <p key={r.id}>
                  {
                    w.assignments.find((a) => a.id === r.assignment_id)
                      ?.course_title
                  }{" "}
                  ·{" "}
                  {new Date(r.created_at).toLocaleDateString(locale, {
                    timeZone: w.organization.timezone,
                  })}
                </p>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
