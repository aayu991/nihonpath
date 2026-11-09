"use client";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { updateCmsMedia } from "@/actions/cms";
export type MediaRow = {
  id: string;
  title: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  status: string;
  references: number;
  replaces_id: string | null;
};
export function MediaLibrary({
  rows,
  canEdit,
  canPublish,
  configured,
}: {
  rows: MediaRow[];
  canEdit: boolean;
  canPublish: boolean;
  configured: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null),
    [title, setTitle] = useState(""),
    [replace, setReplace] = useState(""),
    [progress, setProgress] = useState<number | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [pending, start] = useTransition();
  function upload() {
    if (!file || !configured) return;
    setError("");
    setMessage("");
    setProgress(0);
    const req = new XMLHttpRequest();
    const qs = new URLSearchParams({
      filename: file.name,
      title: title || file.name,
    });
    if (replace) qs.set("replaces", replace);
    req.open("POST", `/api/admin/media?${qs}`);
    req.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setProgress(Math.round((e.loaded / e.total) * 100));
    };
    req.onerror = () => {
      setError("Upload connection failed.");
      setProgress(null);
    };
    req.onload = () => {
      setProgress(null);
      if (req.status === 201) {
        setMessage(
          "Uploaded privately. Review the media and approve it before publishing an association.",
        );
        setFile(null);
        router.refresh();
      } else {
        try {
          setError(JSON.parse(req.responseText).error ?? "Upload failed.");
        } catch {
          setError("Upload failed.");
        }
      }
    };
    req.send(file);
  }
  return (
    <>
      <section className="cms-panel">
        <h2>Upload educational media</h2>
        <p>
          PNG, JPEG, WebP, MP3, Ogg, WAV and passive PDF · maximum 25 MB. Files
          stay in a private Storage bucket. Replacements create a new private
          version; existing associations remain unchanged until edited and
          republished.
        </p>
        {!configured && (
          <p role="status">
            Uploads and playback are unavailable until server Storage
            credentials and the reviewed private-bucket migration are
            configured.
          </p>
        )}
        {canEdit && (
          <>
            <div className="cms-form-grid">
              <label className="cms-field">
                Media title
                <input
                  value={title}
                  maxLength={180}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="cms-field">
                Educational file
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,audio/mpeg,audio/ogg,audio/wav,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && f.size > 25000000) {
                      setError("File exceeds 25 MB.");
                      setFile(null);
                    } else {
                      setFile(f);
                      setError("");
                    }
                  }}
                />
              </label>
              <label className="cms-field">
                Replace a previous version (optional)
                <select
                  value={replace}
                  onChange={(e) => setReplace(e.target.value)}
                >
                  <option value="">New independent asset</option>
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              className="cms-primary"
              disabled={!configured || !file || progress !== null}
              onClick={upload}
            >
              Upload privately
            </button>
            {progress !== null && (
              <label className="cms-field">
                Upload {progress}%<progress max={100} value={progress} />
              </label>
            )}
          </>
        )}
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
      </section>
      <div className="cms-media-grid">
        {rows.map((row) => (
          <Asset
            key={`${row.id}:${row.title}:${row.status}`}
            row={row}
            configured={configured}
            canEdit={canEdit}
            canPublish={canPublish}
            pending={pending}
            run={(task) =>
              start(async () => {
                const r = await task();
                if (r.ok) {
                  setMessage("Media updated.");
                  setError("");
                  router.refresh();
                } else setError(r.error ?? "Action failed.");
              })
            }
          />
        ))}
      </div>
      {!rows.length && <p>No media matches your filters.</p>}
    </>
  );
}
function Asset({
  row,
  canEdit,
  canPublish,
  configured,
  pending,
  run,
}: {
  row: MediaRow;
  canEdit: boolean;
  canPublish: boolean;
  configured: boolean;
  pending: boolean;
  run: (task: () => ReturnType<typeof updateCmsMedia>) => void;
}) {
  const [title, setTitle] = useState(row.title),
    [notes, setNotes] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [deleteConfirmed, setDeleteConfirmed] = useState(false),
    [copied, setCopied] = useState("");
  const url = `/api/media/${row.id}`;
  return (
    <article className="cms-panel">
      <span className="cms-badge">{row.status}</span>
      <h2>{row.title}</h2>
      <p className="cms-muted">
        {row.mime_type} · {(row.byte_size / 1024).toFixed(0)} KB ·{" "}
        {row.references} associations
      </p>
      {configured &&
        row.status !== "archived" &&
        (row.mime_type.startsWith("image/") ? (
          <Image
            src={url}
            unoptimized
            alt={row.title}
            width={340}
            height={200}
            style={{ objectFit: "contain", width: "100%", height: 200 }}
          />
        ) : row.mime_type.startsWith("audio/") ? (
          <audio controls preload="none" aria-label={row.title} src={url} />
        ) : (
          <a href={url}>Download PDF for review</a>
        ))}
      <div className="cms-actions">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                new URL(url, location.origin).href,
              );
              setCopied("Media URL copied.");
            } catch {
              setCopied(`Copy this URL: ${new URL(url, location.origin).href}`);
            }
          }}
        >
          Copy media URL
        </button>
      </div>
      <p role="status">{copied}</p>
      <small className="cms-muted">Asset ID: {row.id}</small>
      {canEdit && (
        <details>
          <summary>Edit metadata and review</summary>
          <label className="cms-field">
            Title
            <input
              value={title}
              maxLength={180}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={pending || !title.trim()}
            onClick={() =>
              run(() => updateCmsMedia({ id: row.id, action: "rename", title }))
            }
          >
            Save title
          </button>
          {canPublish && (
            <>
              <label className="cms-field">
                Review notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record copyright, content and file safety review."
                />
              </label>
              <label className="cms-check">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                I inspected the actual media and its permitted educational use.
              </label>
              <div className="cms-actions">
                <button
                  type="button"
                  disabled={pending || !reviewed || notes.trim().length < 10}
                  onClick={() =>
                    run(() =>
                      updateCmsMedia({ id: row.id, action: "approve", notes }),
                    )
                  }
                >
                  Approve media
                </button>
                <button
                  type="button"
                  disabled={pending || row.references > 0}
                  onClick={() =>
                    run(() => updateCmsMedia({ id: row.id, action: "archive" }))
                  }
                >
                  Archive unused media
                </button>
              </div>
              <p className="cms-muted">
                Archival revokes access and keeps an audit record. Referenced
                assets are protected.
              </p>
              <label className="cms-check">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                />
                I confirm permanent removal of this unused file from Storage.
              </label>
              <button
                type="button"
                disabled={
                  !configured ||
                  !deleteConfirmed ||
                  pending ||
                  row.references > 0
                }
                onClick={() =>
                  run(() =>
                    updateCmsMedia({
                      id: row.id,
                      action: "delete",
                      confirmed: true,
                    }),
                  )
                }
              >
                Delete confirmed unused file
              </button>
            </>
          )}
        </details>
      )}
    </article>
  );
}
