import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@/lib/db/prisma";
import { retrieveContext } from "@/lib/retrieval/retrieval-service";
import { getDefaultWritingHarness } from "@/lib/writing-harness/config";

type MutableFindMany = { findMany: unknown };
type MutableFindFirst = { findFirst: unknown };

test("retrieval exposes the harness and a scoped recent approved manuscript tail", async () => {
  const storyModel = prisma.story as unknown as { findUnique: unknown };
  const characterModel = prisma.character as unknown as MutableFindMany;
  const relationshipModel = prisma.relationship as unknown as MutableFindMany;
  const eventModel = prisma.event as unknown as MutableFindMany;
  const loreModel = prisma.loreEntry as unknown as MutableFindMany;
  const secretModel = prisma.secret as unknown as MutableFindMany;
  const plotThreadModel = prisma.plotThread as unknown as MutableFindMany;
  const chapterModel = prisma.chapter as unknown as MutableFindFirst;
  const sceneModel = prisma.scene as unknown as MutableFindMany;
  const originals = {
    story: storyModel.findUnique,
    character: characterModel.findMany,
    relationship: relationshipModel.findMany,
    event: eventModel.findMany,
    lore: loreModel.findMany,
    secret: secretModel.findMany,
    plotThread: plotThreadModel.findMany,
    chapter: chapterModel.findFirst,
    scene: sceneModel.findMany,
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
  chapterModel.findFirst = async () => ({
    id: "chapter-1",
    number: 1,
    title: "Opening",
    status: "DRAFT",
    wordCount: 12,
  });
  let sceneQuery: unknown;
  sceneModel.findMany = async (args: unknown) => {
    sceneQuery = args;
    return [
      {
        id: "scene-3",
        number: 3,
        title: "Latest",
        content: "The latest approved ending.",
      },
      {
        id: "scene-2",
        number: 2,
        title: "Earlier",
        content: "The earlier approved scene.",
      },
    ];
  };

  try {
    const context = await retrieveContext({
      storyId: "story-1",
      chapterId: "chapter-1",
    });
    assert.deepEqual(context.settings?.writingHarness, harness);
    assert.deepEqual(
      context.recentApprovedScenes?.map((scene) => scene.id),
      ["scene-2", "scene-3"],
    );
    assert.deepEqual(sceneQuery, {
      where: {
        storyId: "story-1",
        chapterId: "chapter-1",
        content: { not: null },
      },
      select: { id: true, number: true, title: true, content: true },
      orderBy: { number: "desc" },
      take: 3,
    });
  } finally {
    storyModel.findUnique = originals.story;
    characterModel.findMany = originals.character;
    relationshipModel.findMany = originals.relationship;
    eventModel.findMany = originals.event;
    loreModel.findMany = originals.lore;
    secretModel.findMany = originals.secret;
    plotThreadModel.findMany = originals.plotThread;
    chapterModel.findFirst = originals.chapter;
    sceneModel.findMany = originals.scene;
  }
});
