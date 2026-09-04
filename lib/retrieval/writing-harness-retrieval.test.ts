import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/db/prisma";
import { retrieveContext } from "@/lib/retrieval/retrieval-service";
import { getDefaultWritingHarness } from "@/lib/writing-harness/config";

type MutableMethod = { findMany: unknown };

test("retrieval validates stored harness JSON and exposes the effective config", async () => {
  const storyModel = prisma.story as unknown as { findUnique: unknown };
  const characterModel = prisma.character as unknown as MutableMethod;
  const relationshipModel = prisma.relationship as unknown as MutableMethod;
  const eventModel = prisma.event as unknown as MutableMethod;
  const loreModel = prisma.loreEntry as unknown as MutableMethod;
  const secretModel = prisma.secret as unknown as MutableMethod;
  const plotThreadModel = prisma.plotThread as unknown as MutableMethod;
  const originals = {
    story: storyModel.findUnique,
    character: characterModel.findMany,
    relationship: relationshipModel.findMany,
    event: eventModel.findMany,
    lore: loreModel.findMany,
    secret: secretModel.findMany,
    plotThread: plotThreadModel.findMany,
  };
  const harness = {
    ...getDefaultWritingHarness(),
    forbiddenPhrases: ["obviously"],
  };

  storyModel.findUnique = async () => ({
    id: "story-1",
    title: "Harness story",
    description: null,
    settings: {
      genre: "[]",
      tone: null,
      pov: null,
      tense: null,
      styleGuide: null,
      nsfwPolicy: "{}",
      modelConfig: "{}",
      writingHarness: JSON.stringify(harness),
    },
  });
  characterModel.findMany = async () => [];
  relationshipModel.findMany = async () => [];
  eventModel.findMany = async () => [];
  loreModel.findMany = async () => [];
  secretModel.findMany = async () => [];
  plotThreadModel.findMany = async () => [];

  try {
    const context = await retrieveContext({ storyId: "story-1" });
    assert.deepEqual(context.settings?.writingHarness, harness);
  } finally {
    storyModel.findUnique = originals.story;
    characterModel.findMany = originals.character;
    relationshipModel.findMany = originals.relationship;
    eventModel.findMany = originals.event;
    loreModel.findMany = originals.lore;
    secretModel.findMany = originals.secret;
    plotThreadModel.findMany = originals.plotThread;
  }
});
