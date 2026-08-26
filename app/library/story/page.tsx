import Link from "next/link";
import { notFound } from "next/navigation";

import { getLibraryStory } from "@/lib/stories/story-service";

type LibraryStoryPageProps = {
  searchParams: Promise<{ story?: string; view?: string; chapter?: string }>;
};

function statusLabel(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE") return "In progress";
  if (normalized === "COMPLETE" || normalized === "COMPLETED") return "Done";
  return status.toLowerCase().replaceAll("_", " ");
}

export default async function LibraryStoryPage({ searchParams }: LibraryStoryPageProps) {
  const { story: storyId, chapter } = await searchParams;
  if (!storyId) notFound();

  let story;
  try {
    story = await getLibraryStory(storyId);
  } catch {
    notFound();
  }

  const selectedChapter = chapter
    ? story.chapters.find((entry) => entry.number === Number(chapter))
    : null;

  if (chapter && !selectedChapter) notFound();

  if (selectedChapter) {
    const content = selectedChapter.content ?? selectedChapter.draftVersions[0]?.content ?? selectedChapter.summary;
    return (
      <main className="min-h-screen bg-[#ece7dc] px-5 py-10 text-stone-800 sm:px-8 lg:px-12">
        <article className="mx-auto max-w-3xl">
          <Link className="inline-flex rounded-lg px-2 py-1 text-sm font-semibold text-violet-800 underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700" href={`/library/story?story=${encodeURIComponent(story.id)}&view=detail`}>
            ← {story.title}
          </Link>
          <header className="mt-10 border-b border-stone-300 pb-8 text-center">
            <p className="text-xs font-bold tracking-[0.16em] text-stone-500">CHAPTER {String(selectedChapter.number).padStart(2, "0")}</p>
            <h1 className="mt-3 font-story text-4xl font-semibold tracking-tight sm:text-5xl">{selectedChapter.title}</h1>
          </header>
          <div className="mx-auto mt-10 max-w-[68ch] whitespace-pre-wrap font-story text-[1.1rem] leading-9 text-stone-700 sm:text-[1.2rem] sm:leading-10">
            {content ?? "This chapter has not been written yet."}
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-on-surface sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <Link className="inline-flex rounded-lg px-2 py-1 text-sm font-semibold text-primary underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" href="/">
          ← Back to Studio
        </Link>
        <header className="mt-9 border-b border-white/[0.1] pb-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary/80">STORY LIBRARY</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{story.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-on-surface-variant">{story.description ?? "No story description yet."}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-on-surface-variant">
            <span>{story._count.chapters} chapters</span>
            <span className="capitalize">{statusLabel(story.status)}</span>
          </div>
        </header>
        <section className="mt-8" aria-labelledby="chapters-title">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold" id="chapters-title">Chapters</h2>
            <span className="text-sm text-on-surface-variant">Read from the manuscript spine</span>
          </div>
          <ol className="mt-4 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {story.chapters.map((entry) => (
              <li key={entry.id}>
                <Link className="group flex items-start gap-4 px-1 py-5 transition sm:px-3" href={`/library/story?story=${encodeURIComponent(story.id)}&chapter=${entry.number}`}>
                  <span className="mt-0.5 text-sm font-bold text-primary">{String(entry.number).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-on-surface transition group-hover:text-primary">{entry.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-on-surface-variant">{entry.summary ?? "Open chapter"}</span>
                  </span>
                  <span className="text-sm text-on-surface-variant">Read →</span>
                </Link>
              </li>
            ))}
            {!story.chapters.length ? <li className="px-1 py-8 text-sm text-on-surface-variant sm:px-3">No chapters yet. Add a chapter in Studio to start the manuscript.</li> : null}
          </ol>
        </section>
      </div>
    </main>
  );
}
