import {
  GENERATION_SYSTEM_INSTRUCTIONS,
  JSON_ONLY_RULE,
  MATURE_CONTENT_RULES,
} from "@/lib/prompts/templates";
import type { GenerationContext } from "@/lib/retrieval/types";

export type BuildGenerationPromptInput = {
  context: GenerationContext;
  goal: string;
  mode: "scene" | "chapter" | "revision";
  chapterNumber?: number;
  sceneGoal?: string;
  povCharacterId?: string;
  maturityMode?: "safe" | "mature";
  previousDraft?: string;
};

function block(title: string, value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);

  if (!text || text === "[]" || text === "{}") {
    return "";
  }

  return `\n## ${title}\n${text}\n`;
}

export function buildGenerationPrompt(input: BuildGenerationPromptInput): string {
  const { context } = input;

  return [
    `# System\n${GENERATION_SYSTEM_INSTRUCTIONS}`,
    input.maturityMode === "mature"
      ? `# Mature Content Rules\n${MATURE_CONTENT_RULES}`
      : "",
    block("Story", context.story),
    block("Story Settings", context.settings),
    block("Active Characters", context.characters),
    block("Relationships", context.relationships),
    block("Recent Timeline Events", context.recentEvents),
    block("Lore", context.lore),
    block("Secrets And Knowledge Constraints", context.secrets),
    block("Retrieved Long-Term Memories", context.memories),
    input.previousDraft ? block("Previous Draft", input.previousDraft) : "",
    `# Task
Write a ${input.mode} for this story.
Goal: ${input.goal}
${input.chapterNumber ? `Chapter number: ${input.chapterNumber}` : ""}
${input.sceneGoal ? `Scene goal: ${input.sceneGoal}` : ""}
${input.povCharacterId ? `Preferred POV character id: ${input.povCharacterId}` : ""}

# Output
Return polished prose only. Do not explain the context. Preserve canon and character voice.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMemoryExtractionPrompt(input: {
  draft: string;
  contextSummary?: string;
}): string {
  return `${JSON_ONLY_RULE}

Extract durable canon facts from this draft. Only include facts explicitly supported by the text.

Return this shape:
{
  "memories": [
    {
      "content": "short durable memory",
      "memoryType": "character|relationship|event|lore|secret|plot_thread|summary",
      "salience": 0.0,
      "emotionalWeight": 0.0,
      "entities": {}
    }
  ],
  "events": [
    {
      "summary": "event summary",
      "eventType": "scene_event",
      "salience": 0.0,
      "participants": []
    }
  ],
  "relationshipChanges": [],
  "characterStateChanges": [],
  "secretsRevealed": [],
  "loreUpdates": [],
  "unresolvedThreads": [],
  "continuityRisks": []
}

Context:
${input.contextSummary ?? "No compact context provided."}

Draft:
${input.draft}`;
}

export function buildContinuityReviewPrompt(input: {
  context: GenerationContext;
  draft: string;
}): string {
  return `${JSON_ONLY_RULE}

Compare the draft against canon context and identify continuity issues.

Return:
{
  "issues": [
    {
      "severity": "P0|P1|P2|P3",
      "category": "timeline|personality|relationship|secret|lore|physical_state|emotional_state|plot_thread",
      "description": "specific issue",
      "evidence": {},
      "confidence": 0.0
    }
  ]
}

Canon context:
${JSON.stringify(input.context, null, 2)}

Draft:
${input.draft}`;
}

