import "server-only";

type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function sanitizeValue(key: string, value: unknown, depth = 0): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (depth > 3) {
    return "[max-depth]";
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (typeof value === "string") {
    return value.length > 800 ? `${value.slice(0, 800)}…` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeValue(key, entry, depth + 1));
  }

  if (typeof value === "object") {
    if (key.toLowerCase().includes("token")) {
      return "[redacted]";
    }

    const entries = Object.entries(value as Record<string, unknown>).slice(0, 30);
    return Object.fromEntries(
      entries
        .map(([entryKey, entryValue]) => [entryKey, sanitizeValue(entryKey, entryValue, depth + 1)] as const)
        .filter(([, entryValue]) => entryValue !== undefined),
    );
  }

  return String(value);
}

function sanitizeMeta(meta: LogMeta): LogMeta {
  const sanitized: LogMeta = {};

  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) {
      continue;
    }
    sanitized[key] = key.toLowerCase().includes("token") ? "[redacted]" : sanitizeValue(key, value);
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
