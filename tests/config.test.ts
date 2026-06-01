import test from "node:test";
import assert from "node:assert/strict";

import { getModelConfig } from "@/lib/ai/model-config";

test("model config defaults to OpenRouter and Qwen", () => {
  const config = getModelConfig();

  assert.equal(config.aiProvider, "openrouter");
  assert.equal(
    config.generationModel,
    process.env.GENERATION_MODEL ?? "qwen/qwen-2.5-72b-instruct",
  );
  assert.equal(config.enableEmbeddings, process.env.ENABLE_EMBEDDINGS === "true");
});
