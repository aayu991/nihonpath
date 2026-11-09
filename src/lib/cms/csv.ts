import { learningSchemas } from "@/lib/learning/admin-validation";
export const vocabularyCsvColumns = [
  "term",
  "reading",
  "meaning_en",
  "meaning_ja",
  "example",
  "example_translation",
  "category",
] as const;
export function parseVocabularyCsv(source: string, courseId: string) {
  if (new TextEncoder().encode(source).length > 250000)
    throw new Error("CSV must be at most 250 KB.");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  const text = source.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (!quoted && field.length > 0)
        throw new Error("Unexpected quote.");
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("Unclosed quoted CSV field.");
  if (field || row.length) {
    row.push(field);
    if (row.some((v) => v.trim())) rows.push(row);
  }
  const headers = rows.shift()?.map((v) => v.trim());
  if (!headers || headers.join(",") !== vocabularyCsvColumns.join(","))
    throw new Error(
      `Required columns, in order: ${vocabularyCsvColumns.join(",")}`,
    );
  if (rows.length < 1 || rows.length > 200)
    throw new Error("Import 1–200 rows per file.");
  const seen = new Set<string>();
  return rows.map((values, index) => {
    if (values.length !== headers.length)
      throw new Error(`Row ${index + 2}: wrong column count.`);
    const obj = Object.fromEntries(
      headers.map((h, i) => [h, values[i].trim()]),
    );
    const p = learningSchemas.vocabulary.safeParse({
      ...obj,
      course_id: courseId,
    });
    if (!p.success)
      throw new Error(`Row ${index + 2}: ${p.error.issues[0]?.message}`);
    const key = `${p.data.term.toLowerCase()}\u0000${p.data.reading.toLowerCase()}`;
    if (seen.has(key))
      throw new Error(
        `Row ${index + 2}: duplicate Japanese spelling and reading.`,
      );
    seen.add(key);
    return p.data;
  });
}
