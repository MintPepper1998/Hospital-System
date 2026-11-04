import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z
    .string()
    .min(1, "AUTH_SECRET is required")
    .optional()
    .refine(
      (val) => process.env.NODE_ENV !== "production" || (val && val.length > 0),
      "AUTH_SECRET is required in production"
    ),

  // S3 — optional in dev, required if file uploads are enabled
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_REGION: z.string().default("ap-south-1"),
  S3_BUCKET_NAME: z.string().optional(),

  // Legacy AWS fallbacks
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_BUCKET_NAME: z.string().optional(),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")

    console.error("❌ Invalid environment variables:\n" + formatted)

    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables — refusing to start in production")
    }
  }

  return (parsed.success ? parsed.data : process.env) as Env
}

export const env = validateEnv()
