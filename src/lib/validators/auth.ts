import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Введите корректный email."),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов.")
});

export const signUpSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа."),
  email: z.string().email("Введите корректный email."),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов.")
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
