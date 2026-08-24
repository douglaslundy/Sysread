const stages = new Set(["preview", "staging", "production"]);
const targets = new Set(["persistent", "split", "vercel"]);
const backgroundModes = new Set(["http-cron", "worker"]);

const commonRequired = [
  "AUTH_SECRET",
  "MONGODB_URI",
];

function isHttps(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function validateReleaseConfiguration({ env, legalConfig }) {
  const errors = [];
  const stage = env.RELEASE_STAGE ?? "production";
  const target = env.DEPLOY_TARGET ?? (env.VERCEL ? "vercel" : "persistent");
  const backgroundExecution = env.BACKGROUND_EXECUTION ?? (target === "vercel" ? "http-cron" : "worker");

  if (!stages.has(stage)) errors.push("RELEASE_STAGE must be preview, staging, or production.");
  if (!targets.has(target)) errors.push("DEPLOY_TARGET must be persistent, split, or vercel.");
  if (!backgroundModes.has(backgroundExecution)) errors.push("BACKGROUND_EXECUTION must be http-cron or worker.");

  const missing = commonRequired.filter((key) => !env[key]);
  if (missing.length) errors.push("Missing release configuration: " + missing.join(", ") + ".");

  if (env.APP_URL && stage === "production" && !isHttps(env.APP_URL)) errors.push("Bootstrap APP_URL must use HTTPS in production; the final public URL is completed in /admin/settings.");
  if (env.AUTH_SECRET && env.AUTH_SECRET.length < 32) {
    errors.push("AUTH_SECRET must contain at least 32 characters.");
  }

  void legalConfig;

  if (target === "vercel" || target === "split") {
    if (env.CONTENT_STORAGE_PROVIDER !== "s3") {
      errors.push("Vercel and split deployments require CONTENT_STORAGE_PROVIDER=s3.");
    }
    if (!env.CONTENT_STORAGE_BUCKET) {
      errors.push("Vercel and split deployments require CONTENT_STORAGE_BUCKET.");
    }
  }

  if (target === "vercel" && backgroundExecution !== "http-cron") {
    errors.push("Vercel deployments require BACKGROUND_EXECUTION=http-cron.");
  }

  if (backgroundExecution === "http-cron") {
    if (!env.CRON_SECRET) errors.push("HTTP cron execution requires CRON_SECRET.");
    else if (env.CRON_SECRET.length < 32) {
      errors.push("CRON_SECRET must contain at least 32 characters.");
    }
  }
  return { backgroundExecution, errors, stage, target };
}
