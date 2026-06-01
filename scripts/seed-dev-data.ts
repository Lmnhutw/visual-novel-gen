import { prisma } from "@/lib/db/prisma";
import { createCharacter } from "@/lib/characters/character-service";
import { createMemory } from "@/lib/memory/memory-service";
import { createStory } from "@/lib/stories/story-service";

async function main() {
  const story = await createStory({
    title: "Dev Supabase Story",
    description: "Seed data for Supabase-backed development.",
    genre: ["mystery", "drama"],
    tone: "tense",
    pov: "third-person limited",
    tense: "past",
  });

  const chapter = await prisma.chapter.create({
    data: {
      storyId: story.id,
      number: 1,
      title: "The Locked Garden",
      summary: "The cast gathers around a place no one admits knowing.",
      status: "OUTLINE",
    },
  });

  const character = await createCharacter({
    storyId: story.id,
    name: "Mira Vale",
    role: "PROTAGONIST",
    status: "ACTIVE",
    ageConfirmed: true,
    personality: { traits: ["observant", "guarded"] },
    motivations: { current: "Learn who opened the garden gate." },
  });

  await createMemory({
    storyId: story.id,
    characterId: character.id,
    chapterId: chapter.id,
    sourceType: "seed",
    memoryType: "character",
    content: "Mira notices small inconsistencies in testimony before anyone else.",
    salience: 0.75,
    generateEmbedding: false,
  });

  console.log("Seeded development data");
  console.log(`Story: ${story.id}`);
  console.log(`Chapter: ${chapter.id}`);
  console.log(`Character: ${character.id}`);
}

main()
  .catch((error) => {
    console.error("Seed failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
