/**
 * Fetch wrapper with automatic retry on 429 (rate limit) responses.
 * Retries up to `maxRetries` times with `delayMs` between attempts.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  { maxRetries = 2, delayMs = 2000 } = {}
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(input, init);
    if (resp.status === 429 && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    return resp;
  }
  // Should never reach here, but just in case
  return fetch(input, init);
}
