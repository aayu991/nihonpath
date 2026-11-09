"use client";
import { useState, useTransition } from "react";
import { assignCmsRole, setAccountSuspension } from "@/actions/cms";
import { cmsRoles, type CmsRole } from "@/lib/cms/schema";
import { useRouter } from "@/i18n/navigation";
export function UserControls({
  id,
  role,
  configured,
  protectedAccount=false,
}: {
  id: string;
  role: string | null;
  configured: boolean;
  protectedAccount?:boolean;
}) {
  const [selected, setSelected] = useState(role ?? ""),
    [confirmed, setConfirmed] = useState(false),
    [message, setMessage] = useState(""),
    [pending, start] = useTransition();
  const router = useRouter();
  return (
    <details>
      <summary>Manage permissions and status</summary>
      <label className="cms-field">
        Assigned platform role
        <select disabled={protectedAccount} value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">No CMS permissions</option>
          {cmsRoles.map((r) => (
            <option key={r} value={r}>
              {r.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={pending||protectedAccount}
        onClick={() =>
          start(async () => {
            const r = await assignCmsRole({
              user: id,
              role: selected ? (selected as CmsRole) : null,
            });
            setMessage(
              r.ok
                ? "Role assignment saved."
                : (r.error ?? "Assignment failed."),
            );
            if (r.ok) router.refresh();
          })
        }
      >
        Save administrative role
      </button>
      <p className="cms-muted">
        Roles apply immediately on the next server request. Self changes and
        legacy allowlist changes are protected.
      </p>
      <label className="cms-check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I confirm this account status action.
      </label>
      <div className="cms-actions">
        {[true, false].map((suspend) => (
          <button
            type="button"
            key={String(suspend)}
              disabled={!configured || !confirmed || pending || protectedAccount || role==='super_admin'}
            onClick={() =>
              start(async () => {
                const r = await setAccountSuspension({
                  user: id,
                  suspend,
                  confirmed: true,
                });
                setMessage(
                  r.ok
                    ? "Auth account status updated."
                    : (r.error ?? "Operation failed."),
                );
                if (r.ok) router.refresh();
              })
            }
          >
            {suspend ? "Suspend for 30 days" : "Restore account access"}
          </button>
        ))}
      </div>
      {!configured && (
        <p>
          Account suspension requires server Auth administration credentials and
          is currently unavailable.
        </p>
      )}
      <p role="status">{message}</p>
    </details>
  );
}
