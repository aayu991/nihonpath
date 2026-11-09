"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { enrollCourse } from "@/actions/enrollment";
import { Button } from "@/components/ui/button";
export function CourseEnrollment({
  courseId,
  enrolled,
}: {
  courseId: string;
  enrolled: boolean;
}) {
  const t = useTranslations("Learning");
  const [saved, setSaved] = useState(enrolled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div>
      <Button
        disabled={saved || pending}
        onClick={async () => {
          setPending(true);
          setError(false);
          try {
            if (await enrollCourse(courseId)) setSaved(true);
            else setError(true);
          } catch {
            setError(true);
          } finally {
            setPending(false);
          }
        }}
      >
        {t(pending ? "saving" : saved ? "enrolled" : "enroll")}
      </Button>
      {error && <p role="alert">{t("saveError")}</p>}
    </div>
  );
}
