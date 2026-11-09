import type { TutorOutput, TutorSettings, AiScenario } from "./schema";
// Deliberately narrow scripted examples. No arbitrary input is claimed to be evaluated.
export function demoReply(
  input: string,
  settings: TutorSettings,
  scenario: AiScenario,
  turn: number,
): TutorOutput {
  const ja = settings.locale === "ja",
    formal = ["n2", "n1"].includes(settings.level);
  let category: TutorOutput["category"] =
      input === "今日は本を読みました。" ? "correct" : "unassessed",
    correction: string | null = null;
  let explanation = ja
    ? "これは用意された例文への解説です。自由入力の文法は評価していません。"
    : "This is scripted example feedback. Arbitrary text is not being evaluated.";
  if (input === "昨日、映画を見ますでした。") {
    category = "grammar";
    correction = "昨日、映画を見ました。";
    explanation = ja
      ? "過去の丁寧形は「見ました」です。「見ますでした」は使いません。"
      : "Use 見ました for the polite past tense. 見ますでした combines incompatible endings.";
  } else if (input === "明日、行くよ。") {
    category = ["business", "interview", "workplace"].includes(scenario.slug)
      ? "register"
      : "correct";
    explanation = ja
      ? "文法的に正しいカジュアルな表現です。仕事の場面では「明日、伺います」などが適切な場合もあります。"
      : "This is grammatically correct casual Japanese. In professional contexts, 明日、伺います may fit better; this is a register change, not a grammar correction.";
  } else if (!/[ぁ-んァ-ヶ一-龯]/.test(input)) {
    category = "non_japanese";
    explanation = ja
      ? "日本語を一文書いてみましょう。例：「今日は本を読みました。」"
      : "Try one Japanese sentence, for example: 今日は本を読みました。";
  }
  const prompts = formal
    ? [
        "承知いたしました。具体的なご予定をお聞かせいただけますか。",
        "ありがとうございます。その際、どのような点を確認なさいますか。",
        "なるほど。相手に丁寧に依頼するとしたら、どう伝えますか。",
      ]
    : [
        "そうですか。何が好きですか。",
        "いいですね。明日は何をしますか。",
        "ありがとうございます。もう少し話してくれますか。",
      ];
  return {
    dialogue:
      turn >= settings.target
        ? "今日の練習はここまでです。ありがとうございました。"
        : prompts[(turn - 1) % prompts.length],
    translation:
      turn >= settings.target
        ? "That is the end of today's practice. Thank you."
        : formal
          ? [
              "Understood. Could you tell me your specific plans?",
              "Thank you. What would you check then?",
              "How would you make a polite request?",
            ][(turn - 1) % 3]
          : [
              "I see. What do you like?",
              "What will you do tomorrow?",
              "Could you tell me a little more?",
            ][(turn - 1) % 3],
    category,
    correction,
    explanation,
    natural: null,
    polite: category === "register" ? "明日、伺います。" : null,
    grammar: category === "grammar" ? "動詞の丁寧な過去形：〜ました" : null,
    example: category === "grammar" ? "昨日、本を読みました。" : null,
    vocabulary: [
      {
        term: formal ? "確認" : "明日",
        meaning: ja
          ? formal
            ? "確かめること"
            : "次の日"
          : formal
            ? "confirmation / checking"
            : "tomorrow",
      },
    ],
  };
}
