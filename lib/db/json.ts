export function toJsonString(value: unknown, fallback: unknown = {}): string {
  return JSON.stringify(value ?? fallback);
}

export function optionalJsonString(value: unknown): string | undefined {
  return value === undefined ? undefined : toJsonString(value);
}

export function parseJsonString<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") {
    return value === undefined || value === null ? fallback : (value as T);
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseStringArray(value: unknown): string[] {
  const parsed = parseJsonString<unknown>(value, []);
  return Array.isArray(parsed)
    ? parsed.filter((entry): entry is string => typeof entry === "string")
    : [];
}
