import { requireUser } from "@/lib/auth/session";
import { getAdminContext } from "@/lib/platform/admin";
import { ExamAdmin, type StudioQuestion } from "@/components/exams/exam-admin";
import { Link } from "@/i18n/navigation";
import { z } from "zod";
const rows = z.array(
  z.object({
    id: z.uuid(),
    status: z.string(),
    data: z.json(),
    reviews: z.array(
      z.object({
        reviewer_id: z.uuid(),
        status: z.string(),
        created_at: z.string(),
      }),
    ),
  }),
);
export default async function ExamStudio({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const admin = await getAdminContext();
  if (!admin)
    return (
      <section className="container exam-page">
        <h1>Administrator access required</h1>
      </section>
    );
  const { data, error } = await admin.client.rpc("admin_exam_list");
  const questions = rows.safeParse(data);
  return (
    <section className="container exam-page">
      <Link className="text-link" href="/admin">
        ← Content studio
      </Link>
      <h1>Examination question studio</h1>
      {error || !questions.success ? (
        <p role="alert">
          Examination schema unavailable. Apply the Task 5 migration.
        </p>
      ) : (
        <ExamAdmin questions={questions.data as StudioQuestion[]} />
      )}
    </section>
  );
}
