import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { levels, courseSymbols } from "@/lib/courses";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
export async function CourseGrid() {
  const t = await getTranslations("Courses");
  const p = await getTranslations("HomePractice");
  const progress: Record<string, { completed: number; total: number }> = {};
  const user = await getCurrentUser();
  if (user) {
    const client = await createClient();
    if (client) {
      const courses = await client
        .from("courses")
        .select("id,slug")
        .in("slug", [...levels])
        .eq("published", true);
      await Promise.all(
        (courses.data ?? []).map(async (course) => {
          const result = await client.rpc("course_progress", {
            p_course: course.id,
          });
          const value = z
            .object({
              completed: z.number().int().nonnegative(),
              total: z.number().int().positive(),
            })
            .safeParse(result.data);
          if (!result.error && value.success)
            progress[course.slug] = value.data;
        }),
      );
    }
  }
  return (
    <div className="course-grid">
      {levels.map((level) => (
        <Card key={level} className={"course-card course-" + level}>
          <CardHeader>
            <div className="course-top">
              <span className="course-level">JLPT {level.toUpperCase()}</span>
              <span className="course-symbol" lang="ja" aria-hidden="true">
                {courseSymbols[level]}
              </span>
            </div>
            <p className="course-label">{t(`${level}Label`)}</p>
            <h3>{t(`${level}Title`)}</h3>
          </CardHeader>
          <CardContent>
            <p>{t(`${level}Desc`)}</p>
            <ul className="course-topics" aria-label={t(`${level}Title`)}>
              {p.raw("topics").map((topic: string) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
            {progress[level] && (
              <div className="actual-course-progress">
                <p>{p("progress", progress[level])}</p>
                <progress
                  value={progress[level].completed}
                  max={progress[level].total}
                  aria-label={p("progress", progress[level])}
                />
              </div>
            )}
            <div className="course-base">
              <Link
                href={`/courses/${level}`}
                aria-label={`${p("exploreCourse")} · ${level.toUpperCase()}`}
              >
                {p("exploreCourse")}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
