import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { GenerationStudio } from "../components/workspace/studio/generation-studio";

test("failed generation renders an accessible retry affordance", () => {
  const runtime = globalThis as typeof globalThis & { React?: typeof React };
  const previousReact = runtime.React;
  runtime.React = React;

  let html: string;
  try {
    html = renderToStaticMarkup(
      React.createElement(GenerationStudio, {
      form: {
        goal: "Write a consequential scene.",
        chapterId: "",
        activeCharacterIds: [],
        maturityMode: "safe" as const,
        includeSecrets: false,
      },
      chapters: [],
      characters: [],
      jobs: [
        {
          id: "job-1",
          type: "scene",
          status: "FAILED",
          stage: "FAILED",
          progress: 44,
          error: "Provider unavailable.",
          errorCode: "GENERATION_FAILED",
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null,
        },
      ],
      selectedJobId: "job-1",
      isSubmitting: false,
      contextPreview: null,
      isContextPreviewLoading: false,
      onFormChange: () => undefined,
      onGenerate: () => undefined,
      onPreviewContext: () => undefined,
      onCloseContextPreview: () => undefined,
      onNavigate: () => undefined,
      onCancel: () => undefined,
      onRetry: () => undefined,
      story: {
        id: "story-1",
        title: "Test story",
        description: null,
        status: "ACTIVE",
        updatedAt: new Date().toISOString(),
        settings: null,
        characters: [],
        chapters: [],
        relationships: [],
        continuityIssues: [],
      },
      onReadStory: () => undefined,
      onAddChapter: () => undefined,
      onAddCharacter: () => undefined,
      onEndChapter: async () => undefined,
      }),
    );
  } finally {
    if (previousReact) runtime.React = previousReact;
    else Reflect.deleteProperty(runtime, "React");
  }

  assert.match(html, /Retry job/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuenow="44"/);
  assert.match(html, /Provider unavailable\./);
});

test("hard limit hides Continue anyway and prioritizes a chapter ending", () => {
  const runtime = globalThis as typeof globalThis & { React?: typeof React };
  const previousReact = runtime.React;
  runtime.React = React;

  let html: string;
  try {
    html = renderToStaticMarkup(
      React.createElement(GenerationStudio, {
        form: {
          goal: "Bring the chapter to a natural ending.",
          chapterId: "chapter-1",
          activeCharacterIds: [],
          maturityMode: "safe" as const,
          includeSecrets: false,
          chapterMode: "normal" as const,
        },
        chapters: [
          {
            id: "chapter-1",
            number: 1,
            title: "Chapter 1",
            summary: null,
            status: "DRAFT",
            tokenCount: 0,
            wordCount: 6_000,
            progress: {
              currentWords: 6_000,
              targetWords: 5_000,
              softLimitWords: 5_500,
              hardLimitWords: 6_000,
              remainingToTarget: 0,
              remainingToHardLimit: 0,
              mode: "CLOSING" as const,
              autoAdvance: true,
            },
          },
        ],
        characters: [],
        jobs: [],
        selectedJobId: "",
        isSubmitting: false,
        contextPreview: null,
        isContextPreviewLoading: false,
        onFormChange: () => undefined,
        onGenerate: () => undefined,
        onPreviewContext: () => undefined,
        onCloseContextPreview: () => undefined,
        onNavigate: () => undefined,
        onCancel: () => undefined,
        onRetry: () => undefined,
        story: {
          id: "story-1",
          title: "Story",
          description: null,
          status: "ACTIVE",
          updatedAt: new Date(0).toISOString(),
          settings: null,
          characters: [],
          chapters: [],
          relationships: [],
          continuityIssues: [],
        },
        onReadStory: () => undefined,
        onAddChapter: () => undefined,
        onAddCharacter: () => undefined,
        onEndChapter: async () => undefined,
      }),
    );
  } finally {
    if (previousReact) runtime.React = previousReact;
    else Reflect.deleteProperty(runtime, "React");
  }

  assert.match(html, /Chapter hard limit reached/);
  assert.match(html, /End chapter now/);
  assert.match(html, /Hard limit reached/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /Continue anyway/);
});
