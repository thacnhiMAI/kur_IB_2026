import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Введите корректный email.")
  .max(254, "Email слишком длинный.");

export const passwordSchema = z
  .string()
  .min(10, "Пароль должен содержать минимум 10 символов.")
  .max(128, "Пароль слишком длинный.")
  .regex(/[a-zа-яё]/i, "Добавьте буквы.")
  .regex(/\d/, "Добавьте хотя бы одну цифру.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128)
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Имя должно содержать минимум 2 символа.").max(80),
  email: emailSchema,
  password: passwordSchema
});

export const emailOnlySchema = z.object({
  email: emailSchema
});

export const verificationCodeSchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Введите шестизначный код.")
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
