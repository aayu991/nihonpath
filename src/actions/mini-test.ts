"use server";
import { z } from "zod";
import {
  miniLevels,
  miniQuestions,
  type MiniResult,
} from "@/lib/learning/mini-test";
import { miniKeys } from "@/lib/learning/mini-test-keys";
const schema = z.object({
  level: z.enum(miniLevels),
  answers: z.array(z.number().int().min(0).max(2)).length(3),
});
export async function gradeMiniTest(
  input: unknown,
): Promise<MiniResult | null> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return null;
  const { level, answers } = parsed.data;
  return {
    score: answers.filter(
      (answer, i) => answer === miniKeys[level][i].correctIndex,
    ).length,
    answers: miniKeys[level].map((key, i) => ({
      ...key,
      id: miniQuestions[level][i].id,
    })),
  };
}
