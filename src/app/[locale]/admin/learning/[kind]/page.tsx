import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import {
  learningKindSchema,
  learningKinds,
  learningTemplates,
} from "@/lib/learning/admin-validation";
import { LearningContentEditor } from "@/components/learning/learning-content-editor";
import { Link } from "@/i18n/navigation";
export default async function LearningAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; kind: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { locale, kind: raw } = await params;
  await requireUser(locale);
  const kind = learningKindSchema.safeParse(raw);
  if (!kind.success) notFound();
  const t = await getTranslations("Learning");
  const admin = await getAdminContext();
  if (!admin)
    return (
      <section className="container learning-page">
        <h1>{t("learningStudio")}</h1>
        <p role="alert">{t("accessDenied")}</p>
      </section>
    );
  const { id } = await searchParams;
  if (id && !z.uuid().safeParse(id).success) notFound();
  const table =
    kind.data === "deck"
      ? "flashcard_decks"
      : kind.data === "bank"
        ? "question_banks"
        : "vocabulary";
  const [listing, courses, record] = await Promise.all([
    admin.client
      .from(table)
      .select("id,updated_at")
      .order("updated_at", { ascending: false })
      .limit(100),
    admin.client.from("courses").select("id,title").order("title"),
    id
      ? admin.client.rpc("admin_learning_preview", {
          p_kind: kind.data,
          p_id: id,
        })
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (listing.error || courses.error || record.error)
    return (
      <section className="container learning-page">
        <h1>{t("learningStudio")}</h1>
        <p role="alert">{t("databaseError")}</p>
      </section>
    );
  const doc = z.record(z.string(), z.unknown()).safeParse(record.data).data;
  const version =
    typeof doc?.updated_at === "string" ? doc.updated_at : undefined;
  const initial = doc ?? {
    ...learningTemplates[kind.data],
    course_id: courses.data?.[0]?.id ?? "",
  };
  return (
    <section className="container studio-page">
      <Link href="/admin" className="text-link">
        ← {t("learningStudio")}
      </Link>
      <h1>
        {t("learningStudio")} · {kind.data}
      </h1>
      <nav className="content-kind-nav">
        {learningKinds.map((k) => (
          <Link key={k} href={`/admin/learning/${k}`}>
            {k}
          </Link>
        ))}
      </nav>
      <details>
        <summary>{t("courseReferences")}</summary>
        <ul>
          {courses.data?.map((c) => (
            <li key={c.id}>
              {c.title}: <code>{c.id}</code>
            </li>
          ))}
        </ul>
      </details>
      <div className="studio-layout">
        <aside className="content-list">
          <Link href={`/admin/learning/${kind.data}`}>{t("createNew")}</Link>
          {listing.data?.map((row) => (
            <Link
              key={row.id}
              href={`/admin/learning/${kind.data}?id=${row.id}`}
            >
              {row.id}
            </Link>
          ))}
        </aside>
        <LearningContentEditor
          key={`${id}:${version}`}
          kind={kind.data}
          initial={JSON.stringify(initial, null, 2)}
          id={id}
          version={version}
          status={
            typeof doc?.review_status === "string"
              ? doc.review_status
              : undefined
          }
          published={doc?.published === true}
        />
      </div>
    </section>
  );
}
