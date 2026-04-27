export function getSafeRedirectPath(candidate: string | null | undefined, fallbackPath: string): string {
  if (!candidate) {
    return fallbackPath;
  }

  const value = candidate.trim();

  if (!value) {
    return fallbackPath;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallbackPath;
  }

  return value;
}

export function getSafeLoginDestination(params: {
  next?: string | null;
  callbackUrl?: string | null;
  fallbackPath: string;
}): string {
  const fromNext = getSafeRedirectPath(params.next, "");

  if (fromNext) {
    return fromNext;
  }

  return getSafeRedirectPath(params.callbackUrl, params.fallbackPath);
}
