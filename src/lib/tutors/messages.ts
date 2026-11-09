import en from "../../../messages/en.json";
export function tutorMessageKey(key: string): keyof typeof en.Tutor {
  return Object.hasOwn(en.Tutor, key)
    ? (key as keyof typeof en.Tutor)
    : "invalid";
}
