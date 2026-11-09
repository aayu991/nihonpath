export const subjects = [
  "vocabulary",
  "kanji",
  "grammar",
  "reading",
  "listening",
] as const;
export type Subject = (typeof subjects)[number];
export interface StudyExample {
  japanese: string;
  english: string;
}
export interface StudyBody {
  richText?: {type:"paragraph"|"heading"|"bullet";text:string}[];
  text?: string;
  subject?: Subject;
  explanationEn?: string;
  explanationJa?: string;
  examples?: StudyExample[];
}
export interface StudyLesson {
  id: string;
  courseId: string;
  level: string;
  subject: Subject;
  title: string;
  position: number;
  body: StudyBody;
  completed?: boolean;
  demo?: boolean;
}
export interface StudyBank {
  id: string;
  title: string;
  subject: Subject;
  level: string;
  demo?: boolean;
}
