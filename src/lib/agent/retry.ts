const RETRYABLE_PATTERN =
  /429|rate.?limit|resource_exhausted|too many requests|5\d\d|overloaded|unavailable/i;

function isRetryableError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  if (typeof status === "number") return status === 429 || status >= 500;
  return RETRYABLE_PATTERN.test(err instanceof Error ? err.message : String(err));
}

/**
 * Retries a transient LLM call (rate limits, 5xx, overload) with exponential
 * backoff. Non-retryable errors (bad request, auth, schema validation) throw
 * immediately on the first attempt.
 */
export async function invokeWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 5000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isRetryableError(err)) throw err;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
