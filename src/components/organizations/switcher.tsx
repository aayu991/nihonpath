"use client";
import { organizationMessageKey } from "@/lib/organizations/messages";
import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { selectOrganization } from "@/actions/organizations";
export function OrganizationSwitcher({
  choices,
  current,
}: {
  choices: { id: string; name: string }[];
  current?: string;
}) {
  const translate = useTranslations("Organization"),
    t = (key: string) => translate(organizationMessageKey(key)),
    [pending, start] = useTransition(),
    [error, setError] = useState(false);
  return (
    <div>
      <label>
        {t("chooseOrg")}
        <select
          value={current ?? ""}
          disabled={pending}
          onChange={(e) => {
            const id = e.target.value;
            start(async () => {
              try {
                setError(!!(await selectOrganization(id)).error);
              } catch {
                setError(true);
              }
            });
          }}
        >
          {choices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{t("forbidden")}</p>}
    </div>
  );
}
