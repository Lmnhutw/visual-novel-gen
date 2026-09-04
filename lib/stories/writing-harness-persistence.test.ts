import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/db/prisma";
import { updateStory } from "@/lib/stories/story-service";
import { getDefaultWritingHarness } from "@/lib/writing-harness/config";

async function withTransaction<T>(transaction: unknown, run: () => Promise<T>) {
  const client = prisma as unknown as { $transaction: unknown };
  const original = client.$transaction;
  client.$transaction = (callback: (tx: unknown) => Promise<T>) =>
    callback(transaction);
  try {
    return await run();
  } finally {
    client.$transaction = original;
  }
}

test("story updates persist a full versioned writing harness snapshot", async () => {
  let updateData: Record<string, unknown> | undefined;
  const transaction = {
    story: {
      findFirst: async () => ({ id: "story-1" }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updateData = data;
        return { id: "story-1", ...data };
      },
    },
    character: { findFirst: async () => null },
  };
  const harness = {
    ...getDefaultWritingHarness(),
    forbiddenPhrases: ["obviously"],
  };

  await withTransaction(transaction, () =>
    updateStory("story-1", { writingHarness: harness }, "owner-1"),
  );

  const settings = updateData?.settings as {
    upsert?: { update?: { writingHarness?: string } };
  };
  assert.deepEqual(
    JSON.parse(settings.upsert?.update?.writingHarness ?? "{}"),
    harness,
  );
});
