import test from "node:test";
import assert from "node:assert/strict";

import { evaluateDraft } from "@/lib/evaluation/generation-evaluator";

test("draft evaluation routes blocking continuity issues to rewrite", () => {
  const evaluation = evaluateDraft([
    {
      severity: "P0",
      category: "timeline",
      description: "Impossible event order.",
      evidence: {},
      confidence: 1,
    },
  ]);

  assert.equal(evaluation.decision, "rewrite_recommended");
  assert.equal(evaluation.counts.P0, 1);
});

test("draft evaluation passes advisory-only findings", () => {
  const evaluation = evaluateDraft([
    {
      severity: "P3",
      category: "style",
      description: "Optional review.",
      evidence: {},
      confidence: 0.5,
    },
  ]);

  assert.equal(evaluation.decision, "pass");
});
