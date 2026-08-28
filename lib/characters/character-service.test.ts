import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";

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

test("clearing optional profiles writes database nulls instead of retaining hidden data", async () => {
  const client = prisma as unknown as { $transaction: unknown };
  const original = client.$transaction;
  let updatedProfile: Record<string, unknown> | undefined;
  const record = {
    id: "character-1",
    storyId: "story-1",
    name: "Mira",
    aliases: [],
    role: "SUPPORTING",
    status: "ACTIVE",
    ageConfirmed: true,
    gender: "female",
    age: 24,
    race: null,
    occupation: null,
    archetypes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      personality: { summary: "Observant." },
      appearance: { hairColor: "brown" },
      relationshipPreference: { self: "one_person" },
    },
    states: [],
  };
  client.$transaction = async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      character: {
        findUnique: async () => record,
        update: async ({
          data,
        }: {
          data: { profile: { upsert: { update: Record<string, unknown> } } };
        }) => {
          updatedProfile = data.profile.upsert.update;
          return record;
        },
      },
      story: { findFirst: async () => null },
    });

  try {
    await updateCharacter("character-1", {
      appearance: null,
      relationshipPreference: null,
    });
    assert.equal(updatedProfile?.appearance, Prisma.DbNull);
    assert.equal(updatedProfile?.relationshipPreference, Prisma.DbNull);
  } finally {
    client.$transaction = original;
  }
});
