import type { Prisma } from "@prisma/client";

export function toPrismaJson(
  value: unknown,
  fallback: unknown = {},
): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? fallback)) as Prisma.InputJsonValue;
}

export function optionalPrismaJson(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : toPrismaJson(value);
}

