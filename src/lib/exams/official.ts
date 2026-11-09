// Verified 2026-10-24 against https://www.jlpt.jp/e/guideline/testsections.html
export const officialSections: Record<
  string,
  {
    name:
      | "Vocabulary"
      | "Grammar & reading"
      | "Listening"
      | "Language knowledge & reading";
    minutes: number;
  }[]
> = {
  n5: [
    { name: "Vocabulary", minutes: 20 },
    { name: "Grammar & reading", minutes: 40 },
    { name: "Listening", minutes: 30 },
  ],
  n4: [
    { name: "Vocabulary", minutes: 25 },
    { name: "Grammar & reading", minutes: 55 },
    { name: "Listening", minutes: 35 },
  ],
  n3: [
    { name: "Vocabulary", minutes: 30 },
    { name: "Grammar & reading", minutes: 70 },
    { name: "Listening", minutes: 40 },
  ],
  n2: [
    { name: "Language knowledge & reading", minutes: 105 },
    { name: "Listening", minutes: 50 },
  ],
  n1: [
    { name: "Language knowledge & reading", minutes: 110 },
    { name: "Listening", minutes: 55 },
  ],
};
