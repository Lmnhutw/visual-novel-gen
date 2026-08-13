import assert from "node:assert/strict";
import test from "node:test";

import { OpenRouterProvider } from "../lib/ai/openrouter";

test("OpenRouter cancellation preserves the caller error and does not retry", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  const controller = new AbortController();
  const cancellation = new Error("generation cancelled");
  let attempts = 0;

  process.env.OPENROUTER_API_KEY = "test-key";
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    attempts += 1;
    assert.equal(init?.signal?.aborted, true);
    throw init?.signal?.reason;
  }) as typeof fetch;
  controller.abort(cancellation);

  try {
    await assert.rejects(
      new OpenRouterProvider().generateText({
        prompt: "Continue the scene.",
        retries: 2,
        signal: controller.signal,
      }),
      cancellation,
    );
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalKey;
    }
  }
});
