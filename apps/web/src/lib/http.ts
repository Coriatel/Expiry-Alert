type ApiErrorPayload = {
  error?: string;
  message?: string;
  details?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

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
    throw new Error(getApiErrorMessage(payload, response));
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

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  return parseApiResponse<T>(response);
}
