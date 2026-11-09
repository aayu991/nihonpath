export const levels = ["n5", "n4", "n3", "n2", "n1"] as const;
export type Level = (typeof levels)[number];
export function isLevel(value: string): value is Level {
  return levels.some((level) => level === value);
}
export const courseSymbols: Record<Level, string> = {
  n5: "芽",
  n4: "葉",
  n3: "木",
  n2: "森",
  n1: "空",
};
