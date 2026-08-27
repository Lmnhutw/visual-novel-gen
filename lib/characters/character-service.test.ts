import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/db/prisma";
import { updateCharacter } from "@/lib/characters/character-service";

test("a current primary protagonist cannot be demoted before replacement or clearing", async () => {
  const client = prisma as unknown as { $transaction: unknown };
  const original = client.$transaction;
  client.$transaction = async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      character: { findUnique: async () => ({ storyId: "story-1" }) },
      story: { findFirst: async () => ({ id: "story-1" }) },
    });
  try {
    await assert.rejects(
      updateCharacter("character-1", { role: "SUPPORTING" }),
      (error: unknown) =>
        typeof error === "object" && error !== null && "code" in error &&
        error.code === "PRIMARY_PROTAGONIST_ROLE_CONFLICT",
    );
  } finally {
    client.$transaction = original;
  }
});
