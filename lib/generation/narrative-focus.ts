import { prisma } from "@/lib/db/prisma";

type NarrativeInput = {
  storyId: string;
  activeCharacterIds?: string[];
  povCharacterId?: string;
};

export function applyNarrativeFocus<T extends NarrativeInput>(
  input: T,
  primaryProtagonistId?: string,
) {
  return {
    ...input,
    activeCharacterIds:
      input.activeCharacterIds === undefined && primaryProtagonistId
        ? [primaryProtagonistId]
        : input.activeCharacterIds,
    povCharacterId: input.povCharacterId ?? primaryProtagonistId,
    primaryProtagonistIdUsed: primaryProtagonistId,
  };
}

export async function resolveNarrativeFocus<T extends NarrativeInput>(input: T) {
  const story = await prisma.story.findUnique({
    where: { id: input.storyId },
    select: { primaryProtagonistId: true },
  });
  return applyNarrativeFocus(input, story?.primaryProtagonistId ?? undefined);
}
