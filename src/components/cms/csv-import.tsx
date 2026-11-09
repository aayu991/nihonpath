"use client";
import { useState, useTransition } from "react";
import { z } from "zod";
import { importVocabulary } from "@/actions/cms";
import { vocabularyCsvColumns } from "@/lib/cms/csv";
import type { CmsReferences } from "@/lib/cms/schema";
export function CsvImport({ courses }: { courses: CmsReferences["courses"] }) {
  const [course, setCourse] = useState(courses[0]?.id ?? ""),
    [csv, setCsv] = useState(""),
    [error, setError] = useState(""),
    [rows, setRows] = useState<
      { row: number; term: string; duplicate: boolean; id: string | null }[]
    >([]),
    [previewed, setPreviewed] = useState(false),
    [done, setDone] = useState(false),
    [pending, start] = useTransition();
  const run = (preview: boolean) =>
    start(async () => {
      setError("");
      const r = await importVocabulary({ course, csv, preview });
      if (r.error) {
        setError(r.error);
        return;
      }
      const p = z
        .array(
          z.object({
            row: z.number(),
            term: z.string(),
            duplicate: z.boolean(),
            id: z.string().nullable(),
          }),
        )
        .safeParse(r.data);
      if (!p.success) {
        setError("Import response unavailable.");
        return;
      }
      setRows(p.data);
      setPreviewed(preview);
      setDone(!preview);
    });
  return (
    <details className="cms-panel">
      <summary>Import vocabulary CSV</summary>
      <p>
        UTF-8, up to 200 rows / 250 KB. Imports create drafts; existing entries
        are skipped.
      </p>
      <p className="cms-muted">Columns: {vocabularyCsvColumns.join(",")}</p>
      <label className="cms-field">
        Course
        <select
          value={course}
          onChange={(e) => {
            setCourse(e.target.value);
            setPreviewed(false);
            setDone(false);
          }}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <label className="cms-field">
        Choose CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            setError("");
            setRows([]);
            setPreviewed(false);
            setDone(false);
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 250000) {
              setError("File exceeds 250 KB.");
              return;
            }
            setCsv(await f.text());
          }}
        />
      </label>
      <div className="cms-actions">
        <button
          disabled={pending || !csv || !course}
          onClick={() => run(true)}
          type="button"
        >
          {pending ? "Validating…" : "Validate and preview"}
        </button>
        <button
          type="button"
          disabled={pending || !previewed || done}
          onClick={() => run(false)}
          className="cms-primary"
        >
          Import validated rows as drafts
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {done && (
        <p role="status">
          Created {rows.filter((r) => r.id).length} drafts.{" "}
          {rows.filter((r) => r.duplicate).length} duplicates skipped. Nothing
          was published.
        </p>
      )}
      {rows.length > 0 && (
        <div className="cms-table-wrap">
          <table>
            <caption>Validated import preview</caption>
            <thead>
              <tr>
                <th>Row</th>
                <th>Japanese</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.row}>
                  <td>{r.row}</td>
                  <td lang="ja">{r.term}</td>
                  <td>
                    {r.duplicate
                      ? "Duplicate — skip"
                      : r.id
                        ? "Draft saved"
                        : "Ready for draft import"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
