export const mediaLimit = 25_000_000;
export function inspectMedia(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > mediaLimit)
    throw new Error("Files must be 1 byte–25 MB.");
  const at = (offset: number, s: string) =>
    [...s].every((c, i) => bytes[offset + i] === c.charCodeAt(0));
  if (
    bytes.length > 24 &&
    bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
  )
    return { mime: "image/png", extension: "png" };
  if (
    bytes.length > 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return { mime: "image/jpeg", extension: "jpg" };
  if (at(0, "RIFF") && at(8, "WEBP"))
    return { mime: "image/webp", extension: "webp" };
  if (at(0, "RIFF") && at(8, "WAVE"))
    return { mime: "audio/wav", extension: "wav" };
  if (at(0, "OggS")) return { mime: "audio/ogg", extension: "ogg" };
  if (at(0, "ID3") || (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0))
    return { mime: "audio/mpeg", extension: "mp3" };
  if (at(0, "%PDF-")) {
    const text = new TextDecoder("latin1").decode(bytes);
    if (
      /\/JavaScript|\/JS\b|\/OpenAction|\/AA\b|\/Launch|\/EmbeddedFile/i.test(
        text,
      )
    )
      throw new Error("Active or embedded PDF content is not allowed.");
    return { mime: "application/pdf", extension: "pdf" };
  }
  throw new Error(
    "Unsupported file signature. Use PNG, JPEG, WebP, MP3, Ogg, WAV or a passive PDF.",
  );
}
