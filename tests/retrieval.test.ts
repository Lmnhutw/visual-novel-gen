import test from "node:test";
import assert from "node:assert/strict";

import { formatVectorLiteral } from "@/lib/embeddings/embedding-service";
import { cosineSimilarity } from "@/lib/retrieval/vector-utils";

test("formatVectorLiteral serializes finite embeddings for pgvector", () => {
  assert.equal(formatVectorLiteral([0.1, 0.2, -0.3]), "[0.1,0.2,-0.3]");
  assert.throws(() => formatVectorLiteral([]));
  assert.throws(() => formatVectorLiteral([Number.NaN]));
});

test("cosineSimilarity ranks matching vectors higher than opposing vectors", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});
