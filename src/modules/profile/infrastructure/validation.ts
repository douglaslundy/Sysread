import { z } from "zod";
import { minimumPasswordLength } from "@/modules/auth/application/password-policy";

export const profileUpdateSchema = z
  .object({
    avatarUrl: z.string().trim().url().max(2048).optional(),
    locale: z.enum(["pt-BR", "en"]).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    theme: z.enum(["system", "dark", "light"]).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required.",
  });

export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(minimumPasswordLength).max(128),
    newPassword: z.string().min(minimumPasswordLength).max(128),
  })
  .refine((input) => input.currentPassword !== input.newPassword, {
    message: "The new password must be different.",
    path: ["newPassword"],
  });
