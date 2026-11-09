import sharp from "sharp";
import { inspectMedia } from "./media-validation";
export async function normalizeMedia(input: Uint8Array) {
  let bytes = Buffer.from(input);
  const format = inspectMedia(bytes);
  if (format.mime.startsWith("image/")) {
    const decoded = sharp(bytes, {
      failOn: "warning",
      limitInputPixels: 20_000_000,
    });
    const metadata = await decoded.metadata();
    if (!metadata.width || !metadata.height)
      throw new Error("Invalid image dimensions.");
    bytes = await decoded
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFormat(
        format.extension === "jpg"
          ? "jpeg"
          : (format.extension as "png" | "webp"),
      )
      .toBuffer();
  }
  return { bytes, ...format };
}
