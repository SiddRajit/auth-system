import z from "zod";

const emailSchema = z
  .string({ error: "Email is required" })
  .email("Please enter a valid email address")
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  );

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name cannot be empty")
  .max(100, "Name must not exceed 100 characters")
  .optional();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { data: T; errors: null } | { data: null; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { data: result.data, errors: null };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".") || "general";
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { data: null, errors };
}
