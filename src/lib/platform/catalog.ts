export const categoryKeys = [
  "learn",
  "jlpt",
  "jft-basic",
  "ssw",
  "business",
  "life-in-japan",
  "ai-practice",
  "organizations",
] as const;
export type CategoryKey = (typeof categoryKeys)[number];
export const goalKeys = [
  "jlpt",
  "jft",
  "ssw",
  "workplace",
  "student",
  "future_worker",
  "professional",
  "tourist",
  "teacher",
  "organization_admin",
] as const;
export type LearningGoal = (typeof goalKeys)[number];
export const categoryGoals: Record<CategoryKey, readonly LearningGoal[]> = {
  learn: ["jlpt", "student", "tourist"],
  jlpt: ["jlpt", "student"],
  "jft-basic": ["future_worker", "jft"],
  ssw: ["future_worker", "professional", "ssw", "workplace"],
  business: ["professional", "future_worker"],
  "life-in-japan": ["tourist", "student", "future_worker"],
  "ai-practice": ["jlpt", "professional", "tourist"],
  organizations: ["teacher", "organization_admin"],
};
export function isCategory(value: string): value is CategoryKey {
  return categoryKeys.some((key) => key === value);
}
export const goalsToCategories: Record<LearningGoal, readonly CategoryKey[]> = {
  jlpt: ["jlpt", "learn"],
  jft: ["jft-basic", "learn"],
  ssw: ["ssw", "jft-basic"],
  workplace: ["ssw", "business"],
  student: ["learn", "jlpt", "life-in-japan"],
  future_worker: ["jft-basic", "ssw", "life-in-japan"],
  professional: ["business", "ssw", "ai-practice"],
  tourist: ["life-in-japan", "learn"],
  teacher: ["organizations", "learn"],
  organization_admin: ["organizations"],
};
export function recommendCategories(
  goals: readonly LearningGoal[],
): CategoryKey[] {
  const scores = new Map<CategoryKey, number>();
  for (const goal of new Set(goals))
    for (const [i, key] of goalsToCategories[goal].entries())
      scores.set(key, (scores.get(key) ?? 0) + 3 - i);
  return [...scores.entries()]
    .sort(
      (a, b) =>
        b[1] - a[1] || categoryKeys.indexOf(a[0]) - categoryKeys.indexOf(b[0]),
    )
    .map(([key]) => key)
    .slice(0, 4);
}
export type FutureIntegration =
  | "ai_roleplay"
  | "listening_audio"
  | "tutor_bookings"
  | "attendance"
  | "training_reports"
  | "visa_checklists"
  | "human_review";
export interface IntegrationReference {
  kind: FutureIntegration;
  resourceId: string;
  organizationId?: string;
  status: "planned" | "draft" | "ready" | "completed";
}
export interface LessonComponentData {
  version: 1;
  type: "text" | "example" | "flashcards" | "quiz" | "audio";
  text?: string;
  deckId?: string;
  questionBankId?: string;
  audioAssetId?: string;
}
