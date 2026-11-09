export function detectAudioMime(
  bytes: Uint8Array,
): "audio/mpeg" | "audio/wav" | "audio/ogg" | null {
  const tag = (a: number, b: number) =>
    String.fromCharCode(...bytes.slice(a, b));
  if (bytes.length < 12) return null;
  if (tag(0, 4) === "RIFF" && tag(8, 12) === "WAVE") return "audio/wav";
  if (tag(0, 4) === "OggS") return "audio/ogg";
  if (tag(0, 3) === "ID3" || (bytes[0] === 255 && (bytes[1] & 224) === 224))
    return "audio/mpeg";
  return null;
}
