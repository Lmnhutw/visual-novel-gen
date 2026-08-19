import test from "node:test";
import assert from "node:assert/strict";

import { parseJsonObject } from "@/lib/ai/structured-output";

test("structured output parser accepts fenced JSON and rejects prose-only responses", () => {
  assert.deepEqual(parseJsonObject("```json\n{\"ok\":true}\n```"), { ok: true });
  assert.throws(() => parseJsonObject("No structured result available."));
});
