import { requireUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import {
  PreparationEditor,
  PreparationAudio,
  type PrepAdminRow,
} from "@/components/preparation/admin-editor";
import { Link } from "@/i18n/navigation";
import type { Json } from "@/lib/supabase/database.types";
export default async function PreparationAdmin({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const admin = await getAdminContext();
  if (!admin)
    return (
      <section className="container prep-page prep-study">
        <h1>Administrator access required</h1>
      </section>
    );
  const results = await Promise.all([
    admin.client.from("industry_sectors").select("*").order("title"),
    admin.client.from("workplace_scenarios").select("*").order("title"),
    admin.client.from("interview_questions").select("*").order("topic"),
    admin.client.from("official_resources").select("*").order("title"),
    admin.client
      .from("audio_assets")
      .select("*")
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false }),
  ]);
  const library = Object.fromEntries(
    ["sector", "scenario", "interview", "resource"].map((kind, i) => [
      kind,
      results[i].data ?? [],
    ]),
  ) as Record<string, PrepAdminRow[]>;
  const auditPairs = await Promise.all(
    Object.values(library)
      .flat()
      .map(async (row) => {
        const result = await admin.client.rpc("admin_prep_audit", {
          p_id: row.id,
        });
        return [row.id, result.data ?? []] as const;
      }),
  );
  const audits = Object.fromEntries(auditPairs) as Record<string, Json>;
  const previews = await Promise.all(
    (results[4].data ?? []).map(async (asset) => {
      const signed = asset.storage_path
        ? await admin.client.storage
            .from("prep-audio")
            .createSignedUrl(asset.storage_path, 900)
        : null;
      return {
        id: asset.id,
        title: asset.title,
        url: signed?.data?.signedUrl ?? null,
        verifiedAt: asset.verified_at,
      };
    }),
  );
  return (
    <section className="container prep-page prep-study">
      <Link className="text-link" href="/admin">
        ← Content studio
      </Link>
      <h1>JFT-Basic & workplace studio</h1>
      {results.some((r) => r.error) ? (
        <p role="alert">
          Preparation schema unavailable. Apply Task 6 migrations; check storage
          setup before uploading.
        </p>
      ) : (
        <>
          <PreparationEditor library={library} audits={audits} />
          <PreparationAudio assets={previews} />
        </>
      )}
    </section>
  );
}
