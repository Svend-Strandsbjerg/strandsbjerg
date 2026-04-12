import "server-only";

type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function sanitizeMeta(meta: LogMeta): LogMeta {
  const sanitized: LogMeta = {};

  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) {
      continue;
    }

    if (value instanceof Error) {
      sanitized[`${key}Message`] = value.message;
      continue;
    }

    if (key.toLowerCase().includes("token")) {
      sanitized[key] = "[redacted]";
      continue;
    }

    if (key.toLowerCase().includes("response") && Array.isArray(value)) {
      sanitized[key] = `[array:${value.length}]`;
      continue;
    }

    if (typeof value === "object" && value !== null) {
      sanitized[key] = "[object]";
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

export function logServerEvent(level: LogLevel, event: string, meta: LogMeta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...sanitizeMeta(meta),
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
}
