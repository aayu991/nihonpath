import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo/metadata";
export const generateMetadata = pageMetadata("kanji");
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const s = await searchParams;
  const level = ["n5", "n4", "n3", "n2", "n1"].includes(s.level ?? "")
    ? s.level!
    : "n5";
  const client = await createClient();
  const r = client ? await client.rpc("cms_kanji", { p_level: level }) : null;
  const rows = z
    .array(
      z.object({
        id: z.uuid(),
        character: z.string(),
        onyomi: z.string(),
        kunyomi: z.string(),
        meaning: z.string(),
        example_words: z.string(),
        lesson_id: z.string().nullable(),
      }),
    )
    .safeParse(r?.data);
  const t = await getTranslations("Learning");
  return (
    <section className="container learning-page">
      <p className="eyebrow">NIHONPATH / JLPT {level.toUpperCase()}</p>
      <h1>{t("subjects.kanji")}</h1>
      <nav className="study-resource-links" aria-label="JLPT levels">
        {["n5", "n4", "n3", "n2", "n1"].map((v) => (
          <Link
            key={v}
            href={`/kanji?level=${v}`}
            aria-current={v === level ? "page" : undefined}
          >
            {v.toUpperCase()}
          </Link>
        ))}
      </nav>
      {r?.error || !rows.success ? (
        <p role="status">
          Published kanji content is currently unavailable. Explore the existing
          courses while the content library is configured.
        </p>
      ) : rows.data.length ? (
        <div className="launch-grid">
          {rows.data.map((k) => (
            <article className="launch-card" key={k.id}>
              <h2 lang="ja" style={{ fontSize: 48 }}>
                {k.character}
              </h2>
              <p lang="ja">
                音読み: {k.onyomi}
                <br />
                訓読み: {k.kunyomi}
              </p>
              <p>{k.meaning}</p>
              <p lang="ja">{k.example_words}</p>
              {k.lesson_id && (
                <Link href={`/lessons/${k.lesson_id}`}>Related lesson →</Link>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p>No reviewed kanji entries have been published for this level yet.</p>
      )}
    </section>
  );
}
