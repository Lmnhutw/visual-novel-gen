export const DEFAULT_CHAPTER_LENGTH = {
  targetWords: 5_000,
  softLimitWords: 5_500,
  hardLimitWords: 6_000,
  autoAdvance: true,
} as const;

export type ChapterLengthConfig = {
  targetWords: number;
  softLimitWords: number;
  hardLimitWords: number;
  autoAdvance: boolean;
};

export type ChapterGenerationMode = "NORMAL" | "CLOSING";

export type ChapterWordBudget = {
  currentWords: number;
  addedWords: number;
  projectedWords: number;
  hardLimitWords: number;
  remainingWords: number;
  excessWords: number;
  exceedsHardLimit: boolean;
};

export function countWords(content: string): number {
  return content.match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function composeChapterManuscript(chapter: {
  content?: string | null;
  scenes: Array<{ content?: string | null }>;
}): string {
  const scenes = chapter.scenes
    .map((scene) => scene.content?.trim())
    .filter((content): content is string => Boolean(content));
  const legacyContent = chapter.content?.trim();
  if (legacyContent && !scenes.includes(legacyContent)) {
    scenes.unshift(legacyContent);
  }
  return scenes.join("\n\n");
}

export function chapterLengthConfig(
  settings?: {
    chapterTargetWords?: number;
    chapterSoftLimitWords?: number;
    chapterHardLimitWords?: number;
    chapterAutoAdvance?: boolean;
  } | null,
): ChapterLengthConfig {
  return {
    targetWords:
      settings?.chapterTargetWords ?? DEFAULT_CHAPTER_LENGTH.targetWords,
    softLimitWords:
      settings?.chapterSoftLimitWords ?? DEFAULT_CHAPTER_LENGTH.softLimitWords,
    hardLimitWords:
      settings?.chapterHardLimitWords ?? DEFAULT_CHAPTER_LENGTH.hardLimitWords,
    autoAdvance:
      settings?.chapterAutoAdvance ?? DEFAULT_CHAPTER_LENGTH.autoAdvance,
  };
}

export function chapterGenerationMode(
  currentWords: number,
  config: ChapterLengthConfig,
): ChapterGenerationMode {
  return currentWords >= config.softLimitWords ||
    config.hardLimitWords - currentWords <= 1_200
    ? "CLOSING"
    : "NORMAL";
}

export function chapterProgress(currentWords: number, config: ChapterLengthConfig) {
  return {
    currentWords,
    targetWords: config.targetWords,
    softLimitWords: config.softLimitWords,
    hardLimitWords: config.hardLimitWords,
    remainingToTarget: Math.max(0, config.targetWords - currentWords),
    remainingToHardLimit: Math.max(0, config.hardLimitWords - currentWords),
    mode: chapterGenerationMode(currentWords, config),
    autoAdvance: config.autoAdvance,
  };
}

export function chapterWordBudget(
  currentWords: number,
  addedWords: number,
  config: ChapterLengthConfig,
): ChapterWordBudget {
  const projectedWords = currentWords + addedWords;
  return {
    currentWords,
    addedWords,
    projectedWords,
    hardLimitWords: config.hardLimitWords,
    remainingWords: Math.max(0, config.hardLimitWords - currentWords),
    excessWords: Math.max(0, projectedWords - config.hardLimitWords),
    exceedsHardLimit: projectedWords > config.hardLimitWords,
  };
}
