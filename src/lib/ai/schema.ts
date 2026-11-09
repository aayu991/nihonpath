import { z } from "zod";
export const settingsSchema = z.object({
  level: z.enum(["n5", "n4", "n3", "n2", "n1"]),
  scenarioId: z.uuid(),
  correctionMode: z.enum(["each", "end"]),
  furigana: z.boolean(),
  translation: z.boolean(),
  target: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  locale: z.enum(["en", "ja"]),
});
export type TutorSettings = z.infer<typeof settingsSchema>;
const text = z.string().max(700);
export const outputSchema = z
  .object({
    dialogue: z.string().min(1).max(600),
    translation: text,
    category: z.enum([
      "correct",
      "grammar",
      "wording",
      "register",
      "non_japanese",
      "unassessed",
    ]),
    correction: text.nullable(),
    explanation: z.string().min(1).max(700),
    natural: text.nullable(),
    polite: text.nullable(),
    grammar: text.nullable(),
    example: text.nullable(),
    vocabulary: z
      .array(
        z.object({ term: z.string().max(60), meaning: z.string().max(150) }),
      )
      .max(4),
  })
  .strict();
export type TutorOutput = z.infer<typeof outputSchema>;
export function validateOutput(value: unknown): TutorOutput {
  const output = outputSchema.parse(value);
  if (
    !/[ぁ-んァ-ヶ一-龯]/u.test(output.dialogue) ||
    /[<>{}]/.test(output.dialogue)
  )
    throw new Error("Invalid dialogue");
  if ((output.dialogue.match(/[？?]/g) ?? []).length > 1)
    throw new Error("Too many questions");
  if (
    ["correct", "register"].includes(output.category) &&
    output.correction !== null
  )
    throw new Error("Register is not a grammar error");
  if (output.category === "grammar" && !output.correction)
    throw new Error("Missing correction");
  return output;
}
export type AiScenario = {
  id: string;
  slug: string;
  title: string;
  title_ja: string;
  description: string;
  description_ja: string;
  suggested_level: string;
  opening: string;
  opening_translation: string;
  prompt_template: string;
};
export type TutorLesson = { id: string; title: string; level: string };
export type TutorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  translation: string;
  reviewed: boolean;
  turn: number;
};
export type TutorFeedback = TutorOutput & { original: string; turn: number };
export type TutorSession = {
  id: string;
  scenario_id: string;
  settings: TutorSettings;
  status: "active" | "completed";
  completed_turns: number;
  created_at: string;
};
export type TutorSnapshot = {
  session: TutorSession;
  messages: TutorMessage[];
  feedback: TutorFeedback[];
};
export const requestSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("start"),
      settings: settingsSchema,
      requestId: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("reply"),
      sessionId: z.uuid(),
      requestId: z.uuid(),
      text: z.string().trim().min(1).max(1200),
    })
    .strict(),
  z.object({ action: z.literal("end"), sessionId: z.uuid() }).strict(),
  z.object({ action: z.literal("delete"), sessionId: z.uuid() }).strict(),
  z
    .object({ action: z.literal("settings"), settings: settingsSchema })
    .strict(),
]);
// Future adapters must explicitly request microphone permission; no audio is captured now.
export interface ConversationTransport {
  mode: "text" | "voice";
  send(text: string): Promise<TutorOutput>;
}
export interface FutureSpeechAdapter {
  transcribe(blob: Blob, signal: AbortSignal): Promise<string>;
  speak(text: string, signal: AbortSignal): Promise<Blob>;
}
