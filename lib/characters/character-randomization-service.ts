import { getModelForTask } from "@/lib/ai/model-routing";
import { generateStructuredObject } from "@/lib/ai/structured-output";
import { parseStringArray } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import {
  randomizedCharacterSectionSchema,
  type RandomizableCharacterSection,
  type RandomizeCharacterSectionInput,
} from "@/lib/validators/character.schema";

const sectionInstructions: Record<RandomizableCharacterSection, string> = {
  personality:
    "Create a concise personality summary and grounded supporting traits.",
  archetypes:
    "Choose a balanced, non-duplicated mix of approved archetypes.",
  talents:
    "Create plausible talents with meaningful limits; do not make the character universally capable.",
  appearance:
    "Create a coherent visual profile. Respect the supplied gender when using gender-specific body details.",
  speech:
    "Create a distinctive but usable dialogue voice with concise notes and catchphrases.",
  relationshipPreference:
    "Create consensual, non-explicit romantic preferences. Do not infer morality from relationship structure.",
  background:
    "Create concise static background facts. Leave secrets empty because canonical secrets use a separate workflow.",
  currentState:
    "Create an immediately playable present-tense state for the next scene.",
  characterArc:
    "Create a long-form growth direction and unresolved internal and external conflicts.",
};

function compactStoryContext(story: {
  title: string;
  description: string | null;
  settings: { genre: string; tone: string | null } | null;
} | null) {
  if (!story) return undefined;

  return {
    title: story.title,
    description: story.description,
    genre: story.settings ? parseStringArray(story.settings.genre) : [],
    tone: story.settings?.tone ?? undefined,
  };
}

function buildRandomizationPrompt(input: {
  section: RandomizableCharacterSection;
  character: RandomizeCharacterSectionInput["character"];
  story?: ReturnType<typeof compactStoryContext>;
}) {
  return `Generate one character-profile section as valid JSON.

Section: ${input.section}
Instruction: ${sectionInstructions[input.section]}
Character constraints: ${JSON.stringify(input.character)}
Story context: ${JSON.stringify(input.story ?? {})}

Return only the requested section and include its exact section discriminator. Keep fields concise, internally consistent, and suitable for a visual novel. Do not create secrets, coercion, or explicit sexual content.`;
}

export async function randomizeCharacterSection(
  input: RandomizeCharacterSectionInput,
) {
  const story = input.storyId
    ? await prisma.story.findUnique({
        where: { id: input.storyId },
        select: {
          title: true,
          description: true,
          settings: { select: { genre: true, tone: true } },
        },
      })
    : null;

  const result = await generateStructuredObject({
    prompt: buildRandomizationPrompt({
      section: input.section,
      character: input.character,
      story: compactStoryContext(story),
    }),
    schema: randomizedCharacterSectionSchema,
    options: {
      model: getModelForTask("extraction"),
      temperature: 0.9,
      topP: 0.95,
      maxTokens: 900,
    },
  });

  if (result.data.section !== input.section) {
    throw new Error("Model returned a different character section.");
  }

  if (result.data.section === "background") {
    return {
      ...result.data,
      background: {
        ...result.data.background,
        secrets: [],
      },
    };
  }

  return result.data;
}
