import test from "node:test";
import assert from "node:assert/strict";

import { getModelConfig } from "@/lib/ai/model-config";
import { getModelForTask } from "@/lib/ai/model-routing";

test("model config defaults to OpenRouter and Qwen", () => {
  const config = getModelConfig();

  assert.equal(config.aiProvider, "openrouter");
  assert.equal(
    config.generationModel,
    process.env.GENERATION_MODEL ?? "qwen/qwen-2.5-72b-instruct",
  );
  assert.equal(config.enableEmbeddings, process.env.ENABLE_EMBEDDINGS === "true");
});

test("task model routing falls back to generation and accepts role overrides", () => {
  const previous = process.env.EVALUATION_MODEL;
  delete process.env.EVALUATION_MODEL;
  assert.equal(getModelForTask("evaluation"), getModelConfig().generationModel);

  process.env.EVALUATION_MODEL = "fast/evaluator";
  assert.equal(getModelForTask("evaluation"), "fast/evaluator");

  if (previous === undefined) delete process.env.EVALUATION_MODEL;
  else process.env.EVALUATION_MODEL = previous;
});
