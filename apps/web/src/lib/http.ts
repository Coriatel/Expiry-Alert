type ApiErrorPayload = {
  error?: string;
  message?: string;
  details?: string;
  code?: string;
};

export type ApiError = Error & { code?: string | null; status?: number };

function getApiErrorCode(payload: unknown): string | null {
  if (payload && typeof payload === "object") {
    const c = (payload as { code?: unknown }).code;
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
export const AUTH_EXPIRED_EVENT = "expiry-alert:auth-expired";
export const REQUEST_TIMEOUT_CODE = "REQUEST_TIMEOUT";
const REQUEST_TIMEOUT_MS = 20_000;

// A stalled mobile connection otherwise leaves the caller awaiting forever,
// which shows up as a dialog stuck on "saving".
function withTimeout(signal: AbortSignal | null | undefined) {
  if (typeof AbortSignal === "undefined") return { signal: signal ?? undefined };

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  if (!signal) return { signal: timeoutSignal };
  if (typeof AbortSignal.any === "function") {
    return { signal: AbortSignal.any([signal, timeoutSignal]) };
  }
  return { signal };
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function tryParseJson(text: string, contentType: string): unknown | null {
  if (!text.trim()) return null;
  const trimmed = text.trim();
  const looksLikeJson =
    contentType.includes("application/json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed === "null";

  if (!looksLikeJson) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function getApiErrorMessage(
  payload: unknown,
  response: Response,
): string {
  if (payload && typeof payload === "object") {
    const errorPayload = payload as ApiErrorPayload;
    if (typeof errorPayload.error === "string" && errorPayload.error.trim()) {
      return errorPayload.error.trim();
    }
    if (typeof errorPayload.message === "string" && errorPayload.message.trim()) {
      return errorPayload.message.trim();
    }
    if (typeof errorPayload.details === "string" && errorPayload.details.trim()) {
      return errorPayload.details.trim();
    }
  }

  return `Request failed (${response.status})`;
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  const payload = tryParseJson(text, contentType);

  if (!response.ok) {
    const err = new Error(getApiErrorMessage(payload, response)) as ApiError;
    err.code = getApiErrorCode(payload);
    err.status = response.status;
    throw err;
  }

  if (!text.trim()) {
    return undefined as T;
  }

  return (payload ?? (text as unknown)) as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
      headers,
      ...withTimeout(options.signal),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      const timeoutError = new Error("Request timed out") as ApiError;
      timeoutError.code = REQUEST_TIMEOUT_CODE;
      throw timeoutError;
    }
    throw error;
  }

  if (
    response.status === 401 &&
    typeof window !== "undefined" &&
    path !== "/api/auth/login" &&
    path !== "/api/auth/register"
  ) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  return parseApiResponse<T>(response);
}
