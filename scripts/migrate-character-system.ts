import { prisma } from "@/lib/db/prisma";
import { parseJsonString } from "@/lib/db/json";
import { archetypes, type Archetype } from "@/lib/types/character";

const approvedArchetypes = new Set<string>(archetypes);

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function normalizePersonality(value: unknown) {
  const personality = asObject(value);
  const traits = stringArray(personality.traits);
  const legacySummary =
    typeof personality.summary === "string" && personality.summary.trim()
      ? personality.summary.trim()
      : traits.length
        ? traits.join(", ")
        : "No personality summary has been recorded.";

  return {
    summary: legacySummary,
    traits,
    strengths: stringArray(personality.strengths),
    weaknesses: stringArray(personality.weaknesses),
    fears: stringArray(personality.fears),
    desires: stringArray(personality.desires),
    goals: stringArray(personality.goals),
    values: stringArray(personality.values),
    habits: stringArray(personality.habits),
    quirks: stringArray(personality.quirks),
  };
}

function collectArchetypes(value: unknown) {
  const personality = asObject(value);
  const rawValues = [
    ...stringArray(personality.archetypes),
    ...(typeof personality.archetype === "string"
      ? [personality.archetype]
      : []),
  ];
  const valid: Archetype[] = [];
  const invalid: string[] = [];

  for (const entry of rawValues) {
    if (approvedArchetypes.has(entry)) {
      valid.push(entry as Archetype);
    } else {
      invalid.push(entry);
    }
  }

  return {
    valid: Array.from(new Set(valid)),
    invalid,
  };
}

async function main() {
  const characters = await prisma.character.findMany({
    include: { profile: true },
    orderBy: { createdAt: "asc" },
  });

  let migrated = 0;
  const failed: Array<{ id: string; error: string }> = [];
  const invalidArchetypes: Array<{ id: string; values: string[] }> = [];
  const missingRequired: string[] = [];
  const unsafeRelationshipMappings: string[] = [];

  for (const character of characters) {
    try {
      const personalityInput = parseJsonString(
        character.profile?.personality,
        {},
      );
      const personality = normalizePersonality(personalityInput);
      const archetypeResult = collectArchetypes(personalityInput);

      if (!character.name || !personality.summary) {
        missingRequired.push(character.id);
      }

      if (archetypeResult.invalid.length > 0) {
        invalidArchetypes.push({
          id: character.id,
          values: archetypeResult.invalid,
        });
      }

      const boundaries = asObject(
        parseJsonString(character.profile?.boundaries, {}),
      );
      const relationshipStyle = boundaries.relationshipStyle;
      const relationshipPreference =
        typeof relationshipStyle === "string" && relationshipStyle.trim()
          ? { notes: relationshipStyle.trim() }
          : undefined;

      if (relationshipStyle !== undefined && !relationshipPreference) {
        unsafeRelationshipMappings.push(character.id);
      }

      await prisma.character.update({
        where: { id: character.id },
        data: {
          aliases: character.aliases ?? [],
          archetypes: Array.from(
            new Set([...character.archetypes, ...archetypeResult.valid]),
          ),
          profile: {
            upsert: {
              create: {
                personality,
                relationshipPreference,
              },
              update: {
                personality,
                relationshipPreference,
              },
            },
          },
        },
      });

      migrated += 1;
    } catch (error) {
      failed.push({
        id: character.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  console.log("Character system migration complete.");
  console.log(`Records scanned: ${characters.length}`);
  console.log(`Records migrated: ${migrated}`);
  console.log(`Failed records: ${failed.length}`);
  console.log(`Invalid archetype records: ${invalidArchetypes.length}`);
  console.log(`Missing required field records: ${missingRequired.length}`);
  console.log(
    `Unsafe relationship mappings: ${unsafeRelationshipMappings.length}`,
  );

  if (failed.length > 0) {
    console.log(JSON.stringify({ failed }, null, 2));
  }

  if (invalidArchetypes.length > 0) {
    console.log(JSON.stringify({ invalidArchetypes }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error("Character system migration failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
