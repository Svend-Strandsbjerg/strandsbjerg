import "server-only";

const REQUIRED_ENV_KEYS = [
  "DATABASE_URL",
  "DISC_ENGINE_BASE_URL",
  "DISC_ENGINE_API_KEY",
  "DISC_ENGINE_ASSESSMENT_VERSION_ID",
  "RESEND_API_KEY",
] as const;

const REQUIRED_EMAIL_FROM_KEYS = ["DISC_EMAIL_FROM", "RESEND_FROM_EMAIL"] as const;

let validated = false;

export function validateEnvironment() {
  if (validated) {
    return;
  }

  const missing: string[] = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);

  const hasEmailFrom = REQUIRED_EMAIL_FROM_KEYS.some((key) => Boolean(process.env[key]));
  if (!hasEmailFrom) {
    missing.push("DISC_EMAIL_FROM or RESEND_FROM_EMAIL");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  validated = true;
}
