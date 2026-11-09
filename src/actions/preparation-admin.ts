"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/platform/admin";
import { prepKinds, prepDraftSchemas } from "@/lib/preparation/schema";
import { detectAudioMime } from "@/lib/preparation/audio";
export async function savePreparation(input: unknown) {
  const parsed = z
    .object({
      kind: z.enum(prepKinds),
      id: z.uuid().nullable(),
      version: z.string().nullable(),
      document: z.string().max(100000),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid document." };
  const admin = await getAdminContext();
  if (!admin) return { error: "Administrator required." };
  let json: unknown;
  try {
    json = JSON.parse(parsed.data.document);
  } catch {
    return { error: "Enter valid JSON." };
  }
  const content = prepDraftSchemas[parsed.data.kind].safeParse(json);
  if (!content.success)
    return {
      error: content.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  const { data, error } = await admin.client.rpc("admin_prep_save", {
    p_kind: parsed.data.kind,
    p_id: parsed.data.id,
    p_expected: parsed.data.version,
    p_data: content.data,
  });
  if (error)
    return {
      error:
        "Save failed. Reload stale content and check parent relationships.",
    };
  revalidatePath("/", "layout");
  return { id: data };
}
export async function reviewPreparation(input: unknown) {
  const parsed = z
    .object({
      kind: z.enum(prepKinds),
      id: z.uuid(),
      version: z.string(),
      action: z.enum(["review", "approve", "publish", "unpublish"]),
    })
    .safeParse(input);
  const admin = await getAdminContext();
  if (!parsed.success || !admin)
    return { error: "Administrator and valid review action required." };
  const { error } = await admin.client.rpc("admin_prep_review", {
    p_kind: parsed.data.kind,
    p_id: parsed.data.id,
    p_action: parsed.data.action,
    p_expected: parsed.data.version,
  });
  if (error)
    return {
      error:
        "Review failed. Check the current version, parent publication and content requirements.",
    };
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function uploadPreparationAudio(form: FormData) {
  const admin = await getAdminContext();
  if (!admin) return { error: "Administrator required." };
  const file = form.get("audio"),
    license = form.get("license"),
    title = form.get("title");
  if (
    !(file instanceof File) ||
    file.size < 12 ||
    file.size > 750000 ||
    typeof license !== "string" ||
    license.trim().length < 10 ||
    typeof title !== "string" ||
    title.trim().length < 3
  )
    return {
      error:
        "Provide a licensed MP3, WAV or OGG clip up to 750 KB, a title and a rights statement.",
    };
  const bytes = new Uint8Array(await file.arrayBuffer()),
    mime = detectAudioMime(bytes);
  if (!mime || mime !== file.type)
    return {
      error: "The file signature does not match a supported audio format.",
    };
  const id = crypto.randomUUID(),
    path = `${id}.${mime === "audio/mpeg" ? "mp3" : mime === "audio/wav" ? "wav" : "ogg"}`;
  const uploaded = await admin.client.storage
    .from("prep-audio")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (uploaded.error)
    return {
      error:
        "Upload failed. Check private storage setup and your administrator session.",
    };
  const row = await admin.client
    .from("audio_assets")
    .insert({
      id,
      title: title.trim().slice(0, 180),
      mime_type: mime,
      status: "processing",
      storage_path: path,
      license_note: license.trim().slice(0, 2000),
      published: false,
    });
  if (row.error) {
    await admin.client.storage.from("prep-audio").remove([path]);
    return { error: "Audio metadata could not be saved." };
  }
  revalidatePath("/[locale]/admin/preparation", "page");
  return { id };
}
export async function verifyPreparationAudio(
  id: string,
  seconds: number,
  confirmed: boolean,
) {
  const admin = await getAdminContext();
  if (
    !admin ||
    !z.uuid().safeParse(id).success ||
    !Number.isInteger(seconds) ||
    seconds < 1 ||
    seconds > 1800 ||
    confirmed !== true
  )
    return {
      error:
        "Administrator playback verification and a valid duration are required.",
    };
  const { error } = await admin.client.rpc("admin_verify_prep_audio", {
    p_id: id,
    p_seconds: seconds,
  });
  if (error) return { error: "Verification could not be saved." };
  revalidatePath("/[locale]/admin/preparation", "page");
  return { ok: true };
}
