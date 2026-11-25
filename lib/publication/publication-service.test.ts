import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { WorkflowError } from "@/lib/http/api-response";

import {
  deletePublication,
  getPublicationManagement,
  getPublishedChapter,
  previewPublicationChapter,
  savePublication,
} from "./publication-service";

const storyId = "story-1";
const actorId = "8cdb482f-d12e-41e3-b7c3-03417c7af1c2";
const story = { slug: "the-story", title: "The Story", description: null };
const chapter = {
  id: "chapter-2",
  number: 2,
  title: "The chapter",
  content: "Legacy opening",
  scenes: [{ content: "Accepted prose" }],
};
const publishedAt = new Date("2026-01-01T10:00:00Z");
const publication = { penName: "The author", publishedAt, updatedAt: publishedAt };

function workflowError(code: string, status: number) {
  return (error: unknown) => error instanceof WorkflowError && error.code === code && error.status === status;
}

async function withTransactions<T>(
  runTransaction: (callback: (tx: unknown) => Promise<unknown>, options: unknown) => Promise<unknown>,
  run: () => Promise<T>,
) {
  const client = prisma as unknown as { $transaction: unknown };
  const previous = client.$transaction;
  client.$transaction = runTransaction;
  try {
    return await run();
  } finally {
    client.$transaction = previous;
  }
}

test("publication mutations hide stories owned by someone else", async () => {
  const otherOwner = "b47d7702-6009-409a-a03f-a83d865a96ad";
  const tx = {
    story: { findFirst: async ({ where }: { where: Prisma.StoryWhereInput }) => {
      assert.equal(where.id, storyId);
      return where.ownerId === actorId ? story : null;
    } },
  };
  await withTransactions((callback) => callback(tx), async () => {
    await assert.rejects(
      savePublication(storyId, otherOwner, { penName: publication.penName, chapterIds: [chapter.id] }),
      workflowError("STORY_NOT_FOUND", 404),
    );
    await assert.rejects(deletePublication(storyId, otherOwner), workflowError("STORY_NOT_FOUND", 404));
  });
});

for (const [label, permission] of [["missing", null], ["revoked", { allowToPublish: false }]] as const) {
  test(`${label} publishing permission blocks updates while allowing idempotent removal`, async () => {
    let visible = true;
    const tx = {
      story: { findFirst: async () => story },
      chapter: { findMany: async () => [chapter] },
      authorPermission: { findUnique: async ({ where }: { where: { userId: string } }) => {
        assert.equal(where.userId, actorId);
        return permission;
      } },
      publishedStory: {
        findUnique: async () => visible ? { ...publication, chapters: [{ number: 2 }] } : null,
        deleteMany: async () => { visible = false; },
      },
    };
    await withTransactions((callback) => callback(tx), async () => {
      const current = await getPublicationManagement(storyId, actorId);
      assert.equal(current.canPublish, false);
      assert.deepEqual(current.publication?.chapterNumbers, [2]);
      await assert.rejects(
        savePublication(storyId, actorId, { penName: publication.penName, chapterIds: [chapter.id] }),
        workflowError("PUBLISH_PERMISSION_REQUIRED", 403),
      );
      assert.equal(visible, true);

      await deletePublication(storyId, actorId);
      await deletePublication(storyId, actorId);
      assert.equal((await getPublicationManagement(storyId, actorId)).publication, null);
    });
  });
}

test("preview and publication use nonempty completed manuscript from the selected story", async () => {
  const blank = { ...chapter, id: "blank-chapter", number: 3, content: "  ", scenes: [{ content: "\n" }] };
  const outside = { ...chapter, id: "other-chapter", storyId: "other-story", status: "COMPLETE" };
  const draft = { ...chapter, id: "open-chapter", storyId, status: "DRAFT" };
  const chapters = [{ ...chapter, storyId, status: "COMPLETE" }, { ...blank, storyId, status: "COMPLETE" }, outside, draft];
  const tx = {
    story: { findFirst: async () => story },
    authorPermission: { findUnique: async () => ({ allowToPublish: true }) },
    chapter: {
      findFirst: async ({ where }: { where: { id: string; storyId: string; status: string } }) =>
        chapters.find((candidate) => candidate.id === where.id && candidate.storyId === where.storyId && candidate.status === where.status),
      findMany: async ({ where }: { where: { id?: { in: string[] }; storyId: string; status: string } }) =>
        chapters.filter((candidate) => candidate.storyId === where.storyId && candidate.status === where.status &&
          (!where.id || where.id.in.includes(candidate.id))),
    },
    publishedStory: { findUnique: async () => null },
  };
  await withTransactions((callback) => callback(tx), async () => {
    assert.deepEqual((await getPublicationManagement(storyId, actorId)).chapters, [{ id: chapter.id, number: 2, title: chapter.title }]);
    assert.equal((await previewPublicationChapter(storyId, actorId, chapter.id)).content, "Legacy opening\n\nAccepted prose");
    for (const chapterId of [blank.id, outside.id, draft.id]) {
      await assert.rejects(previewPublicationChapter(storyId, actorId, chapterId), workflowError("CHAPTER_NOT_FOUND", 404));
      await assert.rejects(
        savePublication(storyId, actorId, { penName: publication.penName, chapterIds: [chapter.id, chapterId] }),
        workflowError("INVALID_PUBLICATION_CHAPTERS", 409),
      );
    }
  });
});

test("replacement rolls back on chapter write failure and retries a serialization conflict", async () => {
  type Snapshot = { storyId: string; number: number; title: string; content: string };
  const oldSnapshot = { storyId, number: 1, title: "Old title", content: "Old prose" };
  let persisted = [oldSnapshot];
  let attempt = 0;
  const firstFailure = new Error("Write rejected");

  await withTransactions(async (callback, options) => {
    assert.deepEqual(options, { isolationLevel: "Serializable" });
    attempt += 1;
    let staged = persisted;
    const tx = {
      story: { findFirst: async () => story },
      authorPermission: { findUnique: async () => ({ allowToPublish: true }) },
      chapter: { findMany: async () => [chapter] },
      publishedStory: { upsert: async ({ update }: { update: Partial<typeof story> }) => {
        assert.equal(update.slug, undefined);
        return publication;
      } },
      publishedChapter: {
        deleteMany: async () => { staged = []; },
        createMany: async ({ data }: { data: Snapshot[] }) => {
          if (attempt === 1) throw firstFailure;
          staged = data;
        },
      },
    };
    const result = await callback(tx);
    if (attempt === 2) {
      throw new Prisma.PrismaClientKnownRequestError("Conflict", { code: "P2034", clientVersion: Prisma.prismaVersion.client });
    }
    persisted = staged;
    return result;
  }, async () => {
    const input = { penName: publication.penName, chapterIds: [chapter.id] };
    await assert.rejects(savePublication(storyId, actorId, input), firstFailure);
    assert.deepEqual(persisted, [oldSnapshot]);

    const result = await savePublication(storyId, actorId, input);
    assert.equal(attempt, 3);
    assert.equal(result.publishedAt, publishedAt.toISOString());
    assert.deepEqual(result.chapterNumbers, [2]);
    assert.deepEqual(persisted, [{ storyId, number: 2, title: chapter.title, content: "Legacy opening\n\nAccepted prose" }]);
  });
});

test("public chapter lookup navigates gaps and returns no result after removal", async () => {
  let visible = true;
  const selected = { storyId, number: 4, title: "Four", content: "Published prose", publication: { slug: story.slug, title: story.title } };
  const previous = { number: 2, title: "Two" };
  const next = { number: 7, title: "Seven" };
  const tx = {
    publishedChapter: { findFirst: async ({ where, orderBy }: Prisma.PublishedChapterFindFirstArgs) => {
      if (where?.publication) {
        assert.deepEqual(where, { number: 4, publication: { slug: story.slug } });
        return visible ? selected : null;
      }
      assert.equal(where?.storyId, storyId);
      if (orderBy && "number" in orderBy && orderBy.number === "asc") {
        assert.deepEqual(where?.number, { gt: 4 });
        return next;
      }
      assert.deepEqual(orderBy, { number: "desc" });
      assert.deepEqual(where?.number, { lt: 4 });
      return previous;
    } },
  };
  await withTransactions((callback) => callback(tx), async () => {
    assert.deepEqual(await getPublishedChapter(story.slug, 4), {
      story: selected.publication,
      chapter: { number: 4, title: "Four", content: "Published prose" },
      previous,
      next,
    });
    visible = false;
    assert.equal(await getPublishedChapter(story.slug, 4), null);
  });
});
