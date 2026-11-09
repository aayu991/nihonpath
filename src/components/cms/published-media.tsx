import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import Image from "next/image";
export async function PublishedMedia({
  kind,
  id,
}: {
  kind: "lesson" | "course" | "guide_article";
  id: string;
}) {
  const client = await createClient();
  if (!client) return null;
  const r = await client.rpc("cms_published_media", { p_kind: kind, p_id: id });
  const rows = z
    .array(z.object({ id: z.uuid(), title: z.string(), mime_type: z.string() }))
    .safeParse(r.data);
  if (!rows.success || !rows.data.length) return null;
  return (
    <section className="lesson-media" aria-label="Educational media">
      {rows.data.map((m) => (
        <figure key={m.id}>
          {m.mime_type.startsWith("image/") ? (
            <Image
              src={`/api/media/${m.id}`}
              unoptimized
              alt={m.title}
              width={900}
              height={600}
              style={{ width: "100%", height: "auto", objectFit: "contain" }}
            />
          ) : m.mime_type.startsWith("audio/") ? (
            <audio
              controls
              preload="none"
              aria-label={m.title}
              src={`/api/media/${m.id}`}
            />
          ) : (
            <a href={`/api/media/${m.id}`}>{m.title} · PDF</a>
          )}
          <figcaption>{m.title}</figcaption>
        </figure>
      ))}
    </section>
  );
}
