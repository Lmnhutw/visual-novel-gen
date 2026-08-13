type ApiErrorPayload = {
  error?: string;
  code?: string;
  details?: unknown;
  requestId?: string;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function formatRequestError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    return error.requestId ? `${error.message} Request ID: ${error.requestId}` : error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as (T & ApiErrorPayload) | null;

  if (!response.ok) {
    throw new ApiRequestError(
      payload?.error ?? payload?.code ?? `Request failed with ${response.status}.`,
      response.status,
      payload?.code,
      payload?.details,
      payload?.requestId ?? response.headers.get("x-request-id") ?? undefined,
    );
  }

  if (payload === null) {
    throw new ApiRequestError(
      "The server returned an invalid JSON response.",
      response.status,
      "INVALID_RESPONSE",
      undefined,
      response.headers.get("x-request-id") ?? undefined,
    );
  }

  return payload as T;
}

export function formatRelativeDate(value: string | null | undefined) {
  if (!value) return "Not started";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
