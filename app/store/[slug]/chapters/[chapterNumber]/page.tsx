import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "@/app/library/story/story.module.css";
import { getPublishedChapter } from "@/lib/publication/publication-service";
import { parsePublishedChapterNumber, publishedChapterHref, publishedStoryHref } from "@/lib/publication/publication-url";

export const dynamic = "force-dynamic";

export default async function PublishedChapterPage({ params }: {
  params: Promise<{ slug: string; chapterNumber: string }>;
}) {
  const { slug, chapterNumber } = await params;
  const number = parsePublishedChapterNumber(chapterNumber);
  if (number === null) notFound();

  const result = await getPublishedChapter(slug, number);
  if (!result) notFound();
  const { story, chapter, previous, next } = result;
  const chapterLink = `${styles["story-reader__back-link"]} min-h-10 items-center break-words`;

  return (
    <main className={styles["story-reader"]}>
      <article className={styles["story-reader__article"]}>
        <Link className={chapterLink} href={publishedStoryHref(story.slug)} prefetch={false}>← {story.title}</Link>
        <header className={styles["story-reader__header"]}>
          <p className={styles["story-reader__eyebrow"]}>Chapter {chapter.number}</p>
          <h1 className={`${styles["story-reader__title"]} break-words`}>{chapter.title}</h1>
        </header>
        <div className={`${styles["story-reader__content"]} break-words`}>{chapter.content}</div>
        {previous || next ? (
          <nav aria-label="Chapter navigation" className="mt-10 flex flex-wrap justify-between gap-4 border-t border-black/15 pt-4">
            {previous ? <Link className={chapterLink} href={publishedChapterHref(story.slug, previous.number)} prefetch={false} rel="prev">← Chapter {previous.number}</Link> : null}
            {next ? <Link className={`${chapterLink} ml-auto`} href={publishedChapterHref(story.slug, next.number)} prefetch={false} rel="next">Chapter {next.number} →</Link> : null}
          </nav>
        ) : null}
      </article>
    </main>
  );
}
