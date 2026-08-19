import type { GenerationContext } from "@/lib/retrieval/types";

export const DEFAULT_CONTEXT_TOKEN_BUDGET = 6_000;

type ContextListKey =
  | "characters"
  | "relationships"
  | "secrets"
  | "recentEvents"
  | "plotThreads"
  | "lore"
  | "memories";

const contextPriority: ContextListKey[] = [
  "characters",
  "relationships",
  "secrets",
  "recentEvents",
  "plotThreads",
  "lore",
  "memories",
];

export function estimateTokens(value: unknown): number {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return Math.max(1, Math.ceil(serialized.length / 4));
}

export function applyContextBudget(
  context: Omit<GenerationContext, "budget">,
  requestedBudget = DEFAULT_CONTEXT_TOKEN_BUDGET,
  requiredCharacterIds: string[] = [],
): GenerationContext {
  const maxTokens = Math.max(1_000, Math.min(requestedBudget, 20_000));
  const requiredIds = new Set(requiredCharacterIds);
  const result: GenerationContext = {
    ...context,
    characters: [],
    relationships: [],
    secrets: [],
    recentEvents: [],
    plotThreads: [],
    lore: [],
    memories: [],
  };
  const omitted = Object.fromEntries(
    contextPriority.map((key) => [key, 0]),
  ) as Record<ContextListKey, number>;
  let estimatedTokens = estimateTokens({
    story: context.story,
    settings: context.settings,
  });

  const requiredCharacters = context.characters.filter((character) =>
    requiredIds.has(character.id),
  );
  const optionalCharacters = context.characters.filter(
    (character) => !requiredIds.has(character.id),
  );

  for (const character of requiredCharacters) {
    result.characters.push(character);
    estimatedTokens += estimateTokens(character);
  }

  const sections: Array<[ContextListKey, readonly unknown[]]> = [
    ["characters", optionalCharacters],
    ["relationships", context.relationships],
    ["secrets", context.secrets],
    ["recentEvents", context.recentEvents],
    ["plotThreads", context.plotThreads],
    ["lore", context.lore],
    ["memories", context.memories],
  ];

  for (const [key, items] of sections) {
    for (const item of items) {
      const itemTokens = estimateTokens(item);
      if (estimatedTokens + itemTokens > maxTokens) {
        omitted[key] += 1;
        continue;
      }

      (result[key] as unknown[]).push(item);
      estimatedTokens += itemTokens;
    }
  }

  result.budget = {
    maxTokens,
    estimatedTokens,
    overBudget: estimatedTokens > maxTokens,
    omitted,
  };

  return result;
}
