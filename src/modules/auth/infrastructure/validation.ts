import { z } from "zod";
import { minimumPasswordLength } from "../application/password-policy";

export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(minimumPasswordLength).max(128),
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(120),
});
