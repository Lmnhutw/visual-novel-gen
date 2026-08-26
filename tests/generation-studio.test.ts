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
