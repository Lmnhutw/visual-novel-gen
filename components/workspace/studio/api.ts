export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & { error?: string; code?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? payload.code ?? `Request failed with ${response.status}.`);
  }

  return payload;
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
