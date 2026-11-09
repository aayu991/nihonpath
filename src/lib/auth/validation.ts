import { z } from "zod";
export const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(60),
  preferred_language: z.enum(["en", "ja", "ne", "hi"]),
  learning_goal: z.enum([
    "jlpt",
    "business",
    "conversation",
    "study",
    "work",
    "travel",
  ]),
  jlpt_target: z.enum(["n5", "n4", "n3", "n2", "n1"]),
});
export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);
export const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});
export const registrationSchema = profileSchema
  .extend({
    email: z.email().max(254),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });
export const resetSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });
export const localeSchema = z.enum(["en", "ja", "ne", "hi"]);
