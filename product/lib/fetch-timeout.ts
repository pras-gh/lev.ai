export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

export class FetchTimeoutError extends Error {
  timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    this.name = "FetchTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal, ...rest } = init;
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortListener = () => {
    controller.abort();
  };

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException("The operation was aborted", "AbortError");
    }
    signal.addEventListener("abort", abortListener, { once: true });
  }

  try {
    const response = await fetch(input, {
      ...rest,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (
      timedOut ||
      (error instanceof Error &&
        error.name === "AbortError" &&
        !signal?.aborted)
    ) {
      throw new FetchTimeoutError(timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", abortListener);
    }
  }
}
