import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/db/prisma";
import { updateStory } from "@/lib/stories/story-service";

async function withTransaction<T>(transaction: unknown, run: () => Promise<T>) {
  const client = prisma as unknown as { $transaction: unknown };
  const original = client.$transaction;
  client.$transaction = (callback: (tx: unknown) => Promise<T>) => callback(transaction);
  try {
    return await run();
  } finally {
    client.$transaction = original;
  }
}

test("a primary protagonist must be a protagonist in the same Story", async () => {
  let characterWhere: unknown;
  let updateData: Record<string, unknown> | undefined;
  const transaction = {
    story: {
      findFirst: async () => ({ id: "story-1" }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updateData = data;
        return { id: "story-1", ...data };
      },
    },
    character: {
      findFirst: async ({ where }: { where: unknown }) => {
        characterWhere = where;
        return { id: "character-1" };
      },
    },
  };

  await withTransaction(transaction, () =>
    updateStory("story-1", { primaryProtagonistId: "character-1" }, "owner-1"),
  );

  assert.deepEqual(characterWhere, {
    id: "character-1",
    storyId: "story-1",
    role: "PROTAGONIST",
  });
  assert.equal(updateData?.primaryProtagonistId, "character-1");
});

test("cross-Story or non-protagonist candidates are rejected and primary can be cleared", async () => {
  const invalidTransaction = {
    story: { findFirst: async () => ({ id: "story-1" }) },
    character: { findFirst: async () => null },
  };
  await assert.rejects(
    withTransaction(invalidTransaction, () =>
      updateStory("story-1", { primaryProtagonistId: "outside-or-supporting" }, "owner-1"),
    ),
    (error: unknown) =>
      typeof error === "object" && error !== null && "code" in error &&
      error.code === "INVALID_PRIMARY_PROTAGONIST",
  );

  let updateData: Record<string, unknown> | undefined;
  const clearingTransaction = {
    story: {
      findFirst: async () => ({ id: "story-1" }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updateData = data;
        return { id: "story-1", ...data };
      },
    },
    character: { findFirst: async () => { throw new Error("not needed"); } },
  };
  await withTransaction(clearingTransaction, () =>
    updateStory("story-1", { primaryProtagonistId: null }, "owner-1"),
  );
  assert.equal(updateData?.primaryProtagonistId, null);
});
