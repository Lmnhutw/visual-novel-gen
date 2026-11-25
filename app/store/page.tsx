import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedStories } from "@/lib/publication/publication-service";
import { parseStorePage, publishedStoryHref } from "@/lib/publication/publication-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Story Store · Narrative Studio" };

const navigationLink = "inline-flex min-h-10 items-center rounded px-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

export default async function StorePage({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const page = parseStorePage((await searchParams).page);
  const { stories, hasNextPage } = await listPublishedStories(page);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 pb-12 sm:px-8">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 py-4">
        <p className="text-sm font-semibold tracking-tight text-on-surface">Narrative Studio</p>
        <Link className={navigationLink} href="/library">Open Studio</Link>
      </header>
      <div className="border-b border-white/10 pb-7 pt-10 sm:pb-9 sm:pt-14">
        <h1 className="font-story text-4xl leading-tight tracking-tight text-on-surface sm:text-6xl">Story Store</h1>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">Browse and read stories published by Studio authors.</p>
      </div>
      {stories.length ? (
        <ol aria-label="Published stories" className="divide-y divide-white/10 border-b border-white/10">
          {stories.map((story) => (
            <li key={story.slug}>
              <Link
                className="group grid items-start gap-3 rounded px-1 py-5 transition-colors hover:bg-white/[0.035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8 sm:px-3 sm:py-6"
                href={publishedStoryHref(story.slug)}
                prefetch={false}
              >
                <div className="min-w-0 break-words">
                  <h2 className="font-story text-xl leading-snug text-on-surface group-hover:text-primary sm:text-2xl">{story.title}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">By {story.penName}</p>
                  {story.description ? <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-on-surface-variant">{story.description}</p> : null}
                </div>
                <span className="text-sm text-on-surface-variant sm:pt-1">{story.chapterCount} {story.chapterCount === 1 ? "chapter" : "chapters"}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="border-b border-white/10 py-8 text-on-surface-variant">
          {page === 1 ? "No stories have been published yet." : "There are no stories on this page."}
        </p>
      )}
      {page > 1 || hasNextPage ? (
        <nav aria-label="Story Store pages" className="mt-4 flex flex-wrap items-center gap-4">
          {page > 1 ? <Link className={navigationLink} href={page === 2 ? "/store" : `/store?page=${page - 1}`} rel="prev">Previous page</Link> : null}
          <span className="text-sm text-on-surface-variant">Page {page}</span>
          {hasNextPage ? <Link className={navigationLink} href={`/store?page=${page + 1}`} rel="next">Next page</Link> : null}
        </nav>
      ) : null}
    </main>
  );
}
