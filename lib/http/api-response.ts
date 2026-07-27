import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class WorkflowError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function created<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof WorkflowError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.status },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "An unexpected error occurred."
            : error.message,
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { error: "An unexpected error occurred.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => {
    throw new Error("Request body must be valid JSON.");
  });
}

