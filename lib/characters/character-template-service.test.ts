import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/db/prisma";
import {
  copyCharacterTemplateToStory,
  deleteCharacterTemplate,
  duplicateCharacterForEdit,
  profileForTemplate,
} from "@/lib/characters/character-template-service";
import type { CreateCharacterTemplateInput } from "@/lib/validators/character.schema";

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

test("a library profile is a reusable snapshot without story-state fields", () => {
  const input: CreateCharacterTemplateInput = {
    name: "Mira",
    gender: "female",
    age: 24,
    personality: { summary: "Observant and guarded." },
    characterArc: { initialState: "Guarded", completedMilestones: ["Met Rowan"] },
  };
  const profile = profileForTemplate(input);

  assert.deepEqual(profile.characterArc, { initialState: "Guarded", completedMilestones: [] });
  assert.equal("currentState" in profile, false);
  (profile.personality as { summary: string }).summary = "Changed copy";
  assert.equal(input.personality.summary, "Observant and guarded.");
});

test("the same Library template creates isolated Story copies", async () => {
  const template = {
    id: "template-1",
    ownerId: "owner-1",
    name: "Mira",
    aliases: ["M"],
    ageConfirmed: true,
    gender: "female",
    age: 24,
    race: null,
    occupation: "Detective",
    archetypes: ["intellectual"],
    profile: { personality: { summary: "Observant and guarded." } },
  };
  const created: Array<Record<string, unknown>> = [];
  const transaction = {
    story: { findFirst: async () => ({ id: "story" }) },
    characterTemplate: { findFirst: async () => template },
    character: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const copy = { id: `character-${created.length + 1}`, ...data };
        created.push(copy);
        return copy;
      },
    },
  };

  await withTransaction(transaction, () =>
    copyCharacterTemplateToStory({ actorId: "owner-1", storyId: "story-a", templateId: template.id }),
  );
  await withTransaction(transaction, () =>
    copyCharacterTemplateToStory({ actorId: "owner-1", storyId: "story-b", templateId: template.id }),
  );

  assert.equal(created[0].sourceTemplateId, template.id);
  assert.equal(created[0].status, "ACTIVE");
  assert.equal(created[0].role, "SUPPORTING");
  const firstProfile = (created[0].profile as { create: { personality: { summary: string } } }).create;
  const secondProfile = (created[1].profile as { create: { personality: { summary: string } } }).create;
  firstProfile.personality.summary = "Story A edit";
  assert.equal(secondProfile.personality.summary, "Observant and guarded.");
  (template.profile.personality as { summary: string }).summary = "Library edit";
  assert.equal(secondProfile.personality.summary, "Observant and guarded.");
  assert.equal((template.profile.personality as { summary: string }).summary, "Library edit");
});

test("copy rejects name conflicts and unauthorized Story or Library access", async () => {
  const template = {
    id: "template-1", ownerId: "owner-1", name: "Mira", aliases: [], ageConfirmed: false,
    gender: "female", age: 24, race: null, occupation: null, archetypes: [], profile: {},
  };
  const conflictTransaction = {
    story: { findFirst: async () => ({ id: "story-1" }) },
    characterTemplate: { findFirst: async () => template },
    character: { findFirst: async () => ({ id: "existing" }) },
  };
  await assert.rejects(
    withTransaction(conflictTransaction, () =>
      copyCharacterTemplateToStory({ actorId: "owner-1", storyId: "story-1", templateId: template.id }),
    ),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "CHARACTER_NAME_CONFLICT",
  );

  const unauthorizedTransaction = {
    story: { findFirst: async () => null },
    characterTemplate: { findFirst: async () => template },
    character: { findFirst: async () => null, create: async () => null },
  };
  await assert.rejects(
    withTransaction(unauthorizedTransaction, () =>
      copyCharacterTemplateToStory({ actorId: "owner-1", storyId: "another-story", templateId: template.id }),
    ),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "STORY_NOT_FOUND",
  );

  const privateTemplateTransaction = {
    story: { findFirst: async () => ({ id: "story-1" }) },
    characterTemplate: { findFirst: async () => null },
    character: { findFirst: async () => null, create: async () => null },
  };
  await assert.rejects(
    withTransaction(privateTemplateTransaction, () =>
      copyCharacterTemplateToStory({ actorId: "other-owner", storyId: "story-1", templateId: template.id }),
    ),
    (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "CHARACTER_TEMPLATE_NOT_FOUND",
  );
});

test("Duplicate & Edit keeps reusable profile data and clears Story history", async () => {
  const source = {
    storyId: "story-1",
    name: "Mira",
    aliases: ["M"],
    ageConfirmed: true,
    gender: "female",
    age: 24,
    race: "human",
    occupation: "Detective",
    archetypes: ["intellectual"],
    profile: {
      personality: { summary: "Observant and guarded." },
      currentState: { location: "The harbor" },
      characterArc: { initialState: "Guarded", completedMilestones: ["Met Rowan"] },
    },
  };
  const transaction = {
    character: {
      findFirst: async () => source,
      findMany: async () => [{ name: "Mira" }, { name: "Mira Copy" }],
    },
  };
  const duplicate = await withTransaction(transaction, () =>
    duplicateCharacterForEdit("owner-1", "character-1"),
  );

  assert.equal(duplicate.name, "Mira Copy 2");
  assert.equal(duplicate.role, "SUPPORTING");
  assert.equal(duplicate.status, "ACTIVE");
  assert.deepEqual(duplicate.aliases, ["M"]);
  assert.deepEqual(duplicate.characterArc, { initialState: "Guarded", completedMilestones: [] });
  assert.equal("currentState" in duplicate, false);
  assert.equal("sourceTemplateId" in duplicate, false);
  assert.equal("memories" in duplicate, false);
  assert.equal("relationships" in duplicate, false);
});

test("deleting a Library item never invokes a Story-character deletion", async () => {
  let deletedTemplateId: string | undefined;
  const transaction = {
    characterTemplate: {
      findFirst: async () => ({ id: "template-1", ownerId: "owner-1" }),
      delete: async ({ where }: { where: { id: string } }) => {
        deletedTemplateId = where.id;
      },
    },
  };
  const result = await withTransaction(transaction, () =>
    deleteCharacterTemplate("owner-1", "template-1"),
  );

  assert.deepEqual(result, { deleted: true });
  assert.equal(deletedTemplateId, "template-1");
});
