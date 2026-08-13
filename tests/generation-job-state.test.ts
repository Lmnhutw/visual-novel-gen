import assert from "node:assert/strict";
import test from "node:test";

import {
  canWriteGenerationStage,
  isRetryableGenerationStatus,
  isTerminalGenerationStatus,
} from "../lib/generation/job-state";

test("generation terminal states cannot be revived by stage writes", () => {
  for (const status of ["READY_FOR_REVIEW", "FAILED", "CANCELLED"]) {
    assert.equal(isTerminalGenerationStatus(status), true);
    assert.equal(canWriteGenerationStage(status), false);
  }

  assert.equal(canWriteGenerationStage("RUNNING"), true);
  assert.equal(isTerminalGenerationStatus("RUNNING"), false);
});

test("only failed or cancelled jobs are retryable", () => {
  assert.equal(isRetryableGenerationStatus("FAILED"), true);
  assert.equal(isRetryableGenerationStatus("CANCELLED"), true);
  assert.equal(isRetryableGenerationStatus("RUNNING"), false);
  assert.equal(isRetryableGenerationStatus("READY_FOR_REVIEW"), false);
});
