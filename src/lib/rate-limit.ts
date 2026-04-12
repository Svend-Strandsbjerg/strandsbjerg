import "server-only";

type BucketEntry = {
  count: number;
  expiresAt: number;
};

const buckets = new Map<string, BucketEntry>();

export function enforceRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const existing = buckets.get(params.key);

  if (!existing || existing.expiresAt <= now) {
    buckets.set(params.key, { count: 1, expiresAt: now + params.windowMs });
    return { ok: true } as const;
  }

  if (existing.count >= params.limit) {
    return { ok: false, retryAfterMs: existing.expiresAt - now } as const;
  }

  existing.count += 1;
  buckets.set(params.key, existing);

  return { ok: true } as const;
}
