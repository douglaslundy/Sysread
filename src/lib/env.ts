import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

const environmentBoolean = z.preprocess(
  (value) => value === true || value === "true",
  z.boolean(),
);

const serverEnvSchema = z.object({
  AI_API_KEY: optionalSecret,
  AI_MODEL: z.string().min(1).default("gpt-5.6-terra"),
  AI_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
  ALERT_WEBHOOK_SECRET: optionalSecret,
  ALERT_WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().max(30_000).default(5_000),
  ALERT_WEBHOOK_URL: optionalUrl,
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32),
  CONTENT_STORAGE_ACCESS_KEY_ID: optionalSecret,
  CONTENT_STORAGE_BUCKET: optionalSecret,
  CONTENT_STORAGE_DIR: z.string().min(1).default(".data/uploads"),
  CONTENT_STORAGE_ENDPOINT: optionalUrl,
  CONTENT_STORAGE_FORCE_PATH_STYLE: environmentBoolean.default(false),
  CONTENT_STORAGE_PREFIX: z.string().regex(/^[a-zA-Z0-9/_-]*$/u).default("readcoach"),
  CONTENT_STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  CONTENT_STORAGE_REGION: z.string().min(1).default("auto"),
  CONTENT_STORAGE_SECRET_ACCESS_KEY: optionalSecret,
  CRON_SECRET: optionalSecret,
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  MAX_URL_IMPORT_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  URL_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().max(60_000).default(15_000),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, "must be a MongoDB connection URI"),
  USER_UPLOAD_QUOTA_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(250 * 1024 * 1024),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  MERCADOPAGO_ANNUAL_PLAN_ID: optionalSecret,
  MERCADOPAGO_ACCESS_TOKEN: optionalSecret,
  MERCADOPAGO_WEEKLY_PLAN_ID: optionalSecret,
  MERCADOPAGO_WEBHOOK_SECRET: optionalSecret,
}).superRefine((env, context) => {
  if (env.CONTENT_STORAGE_PROVIDER === "s3" && !env.CONTENT_STORAGE_BUCKET) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "is required for S3 storage",
      path: ["CONTENT_STORAGE_BUCKET"],
    });
  }
  const hasAccessKey = Boolean(env.CONTENT_STORAGE_ACCESS_KEY_ID);
  const hasSecretKey = Boolean(env.CONTENT_STORAGE_SECRET_ACCESS_KEY);
  if (hasAccessKey !== hasSecretKey) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "access key and secret key must be configured together",
      path: [hasAccessKey ? "CONTENT_STORAGE_SECRET_ACCESS_KEY" : "CONTENT_STORAGE_ACCESS_KEY_ID"],
    });
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(
  source: Record<string, string | undefined> = process.env,
): ServerEnv {
  if (source === process.env && cachedEnv) return cachedEnv;

  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const fields = Array.from(
      new Set(
        result.error.issues.map((issue) => issue.path.join(".") || "environment"),
      ),
    ).sort();

    throw new Error("Invalid server environment: " + fields.join(", "));
  }

  if (source === process.env) cachedEnv = result.data;
  return result.data;
}