import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import { contentKindSchema, contentKinds } from "@/lib/platform/validation";
import {
  contentTables,
  type AdminRecord,
  type ContentReferences,
} from "@/lib/platform/content-model";
import { ContentEditor } from "@/components/platform/content-editor";
import { Link } from "@/i18n/navigation";
export default async function Editor({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; kind: string }>;
  searchParams: Promise<{ id?: string; saved?: string; reviewed?: string }>;
}) {
  const { locale, kind: raw } = await params;
  await requireUser(locale);
  const t = await getTranslations("Platform");
  const kindResult = contentKindSchema.safeParse(raw);
  if (!kindResult.success) notFound();
  const kind = kindResult.data;
  const admin = await getAdminContext();
  if (!admin)
    return (
      <section className="container studio-page">
        <h1>{t("adminTitle")}</h1>
        <p role="alert" className="form-message error">
          {t("accessDenied")}
        </p>
      </section>
    );
  const { id, saved, reviewed } = await searchParams;
  if (id && !z.uuid().safeParse(id).success) notFound();
  const [
    listing,
    programs,
    courses,
    modules,
    lessons,
    blocks,
    translations,
    decks,
    banks,
    audio,
    recordResult,
  ] = await Promise.all([
    admin.client
      .from(contentTables[kind])
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100),
    admin.client.from("learning_programs").select("id,title").order("title"),
    admin.client.from("courses").select("id,title").order("title"),
    admin.client
      .from("course_modules")
      .select("id,title,course_id")
      .order("title"),
    admin.client.from("lessons").select("id,title").order("title"),
    admin.client.from("lesson_blocks").select("id,kind").order("position"),
    admin.client.from("content_translations").select("id,title").order("title"),
    admin.client.from("flashcard_decks").select("id,title"),
    admin.client.from("question_banks").select("id,title"),
    admin.client
      .from("audio_assets")
      .select("id,title")
      .eq("status", "ready")
      .eq("published", true),
    id
      ? admin.client.from(contentTables[kind]).select("*").eq("id", id).single()
      : Promise.resolve(null),
  ]);
  if (
    [
      listing,
      programs,
      courses,
      modules,
      lessons,
      blocks,
      translations,
      decks,
      banks,
      audio,
      recordResult,
    ].some((result) => result?.error)
  )
    return (
      <section className="container studio-page">
        <h1>{t("adminTitle")}</h1>
        <p role="alert" className="form-message error">
          {t("dbUnavailable")}
        </p>
      </section>
    );
  const refs: ContentReferences = {
    program: programs.data ?? [],
    course: courses.data ?? [],
    module: modules.data ?? [],
    lesson: lessons.data ?? [],
    block: (blocks.data ?? []).map((block) => ({
      id: block.id,
      title: `${block.kind} · ${block.id.slice(0, 8)}`,
    })),
    translation: translations.data ?? [],
    deck: decks.data ?? [],
    bank: banks.data ?? [],
    audio: audio.data ?? [],
  };
  const record = recordResult?.data as AdminRecord | undefined;
  return (
    <section className="container studio-page">
      <Link className="text-link" href="/admin">
        ← {t("backStudio")}
      </Link>
      <p className="eyebrow">NIHONPATH / CONTENT</p>
      <h1>{t(kind)}</h1>
      <nav className="content-kind-nav" aria-label={t("contentFields")}>
        {contentKinds.map((value) => (
          <Link
            key={value}
            href={`/admin/content/${value}`}
            aria-current={kind === value ? "page" : undefined}
          >
            {t(value)}
          </Link>
        ))}
      </nav>
      {saved && (
        <p role="status" className="form-message success">
          {t("contentSaved")}
        </p>
      )}
      {reviewed && (
        <p role="status" className="form-message success">
          {t("stateSaved")}
        </p>
      )}
      <div className="studio-layout">
        <aside className="content-list">
          <Link className="text-link" href={`/admin/content/${kind}`}>
            + {t("create")}
          </Link>
          {listing.data?.length ? (
            (listing.data as AdminRecord[]).map((row) => (
              <Link
                href={`/admin/content/${kind}?id=${row.id}`}
                key={row.id}
                aria-current={row.id === id ? "page" : undefined}
              >
                <strong>
                  {typeof row.title === "string"
                    ? row.title
                    : typeof row.kind === "string"
                      ? row.kind
                      : row.id}
                </strong>
                <span className={`status-pill state-${row.review_status}`}>
                  {t(row.published ? "published" : row.review_status)}
                </span>
              </Link>
            ))
          ) : (
            <p>{t("emptyContent")}</p>
          )}
        </aside>
        <ContentEditor
          kind={kind}
          record={record}
          references={refs}
          key={record ? `${record.id}:${record.updated_at}` : kind}
        />
      </div>
    </section>
  );
}
