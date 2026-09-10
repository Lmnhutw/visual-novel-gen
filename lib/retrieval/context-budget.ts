import type {
  GenerationContext,
  RecentApprovedScene,
} from "@/lib/retrieval/types";

export const DEFAULT_CONTEXT_TOKEN_BUDGET = 6_000;
export const RECENT_APPROVED_SCENE_LIMIT = 3;
export const RECENT_APPROVED_SCENE_CHAR_LIMIT = 4_000;

type ContextListKey =
  | "characters"
  | "recentApprovedScenes"
  | "relationships"
  | "secrets"
  | "recentEvents"
  | "plotThreads"
  | "lore"
  | "memories";

const contextPriority: ContextListKey[] = [
  "characters",
  "recentApprovedScenes",
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

function boundSceneContent(scene: RecentApprovedScene): RecentApprovedScene | null {
  const content = scene.content.trim();
  if (!content) {
    return null;
  }

  if (content.length <= RECENT_APPROVED_SCENE_CHAR_LIMIT) {
    return { ...scene, content };
  }

  return {
    ...scene,
    content: content.slice(-RECENT_APPROVED_SCENE_CHAR_LIMIT),
    truncatedAtStart: true,
  };
}

function fitSceneSuffix(
  scene: RecentApprovedScene,
  availableTokens: number,
): RecentApprovedScene | null {
  if (availableTokens <= 0) {
    return null;
  }

  if (estimateTokens(scene) <= availableTokens) {
    return scene;
  }

  let low = 0;
  let high = scene.content.length;
  let fitted: RecentApprovedScene | null = null;

  while (low <= high) {
    const length = Math.floor((low + high) / 2);
    const candidate = {
      ...scene,
      content: scene.content.slice(-length),
      truncatedAtStart: true,
    };

    if (length > 0 && estimateTokens(candidate) <= availableTokens) {
      fitted = candidate;
      low = length + 1;
    } else {
      high = length - 1;
    }
  }

  return fitted;
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
    recentApprovedScenes: [],
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
    chapter: context.chapter,
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

  const boundedScenes = (context.recentApprovedScenes ?? [])
    .slice(-RECENT_APPROVED_SCENE_LIMIT)
    .map(boundSceneContent)
    .filter((scene): scene is RecentApprovedScene => scene !== null);
  const selectedScenes: RecentApprovedScene[] = [];

  for (const scene of boundedScenes.slice().reverse()) {
    const fitted = fitSceneSuffix(scene, maxTokens - estimatedTokens);
    if (!fitted) {
      omitted.recentApprovedScenes += 1;
      continue;
    }

    selectedScenes.push(fitted);
    estimatedTokens += estimateTokens(fitted);
  }

  result.recentApprovedScenes = selectedScenes.reverse();
  omitted.recentApprovedScenes +=
    (context.recentApprovedScenes?.length ?? 0) - boundedScenes.length;

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
