import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiRequestError,
  formatRequestError,
  requestJson,
} from "../components/workspace/studio/api";

test("requestJson preserves structured API error context", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: "Generation is no longer running.",
        code: "INVALID_GENERATION_STATE",
        details: { status: "CANCELLED" },
      }),
      {
        status: 409,
        headers: { "content-type": "application/json", "x-request-id": "request-123" },
      },
    );

  try {
    await assert.rejects(
      () => requestJson("/api/generation/jobs/example"),
      (error: unknown) => {
        assert.ok(error instanceof ApiRequestError);
        assert.equal(error.status, 409);
        assert.equal(error.code, "INVALID_GENERATION_STATE");
        assert.deepEqual(error.details, { status: "CANCELLED" });
        assert.equal(error.requestId, "request-123");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestJson rejects successful non-JSON responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("not-json", { status: 200 });

  try {
    await assert.rejects(
      () => requestJson("/api/example"),
      (error: unknown) =>
        error instanceof ApiRequestError && error.code === "INVALID_RESPONSE",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("formatRequestError includes the request ID for support correlation", () => {
  const error = new ApiRequestError(
    "Generation failed.",
    500,
    "GENERATION_FAILED",
    undefined,
    "req-42",
  );
  assert.equal(formatRequestError(error, "Fallback"), "Generation failed. Request ID: req-42");
});
