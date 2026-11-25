import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "@/app/library/story/story.module.css";
import { getPublishedStory } from "@/lib/publication/publication-service";
import { publishedChapterHref } from "@/lib/publication/publication-url";

export const dynamic = "force-dynamic";

export default async function PublishedStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const story = await getPublishedStory((await params).slug);
  if (!story) notFound();

  return (
    <main className={styles["story-library"]}>
      <div className={styles["story-library__container"]}>
        <Link className={styles["story-library__back-link"]} href="/store">← Story Store</Link>
        <header className={styles["story-library__header"]}>
          <h1 className={`${styles["story-library__title"]} break-words`}>{story.title}</h1>
          <div className={`${styles["story-library__meta"]} break-words`}>
            <span className="min-w-0">By {story.penName}</span>
            <span>{story.chapters.length} {story.chapters.length === 1 ? "chapter" : "chapters"}</span>
          </div>
          {story.description ? <p className={`${styles["story-library__description"]} whitespace-pre-wrap break-words`}>{story.description}</p> : null}
        </header>
        <section aria-labelledby="published-chapters" className={styles["story-library__chapters"]}>
          <h2 className={styles["story-library__chapters-title"]} id="published-chapters">Contents</h2>
          <ol className={styles["story-library__chapter-list"]}>
            {story.chapters.map((chapter) => (
              <li className={styles["story-library__chapter-item"]} key={chapter.number}>
                <Link
                  className={`${styles["story-library__chapter-link"]} rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
                  href={publishedChapterHref(story.slug, chapter.number)}
                  prefetch={false}
                >
                  <span className={styles["story-library__chapter-number"]}>{String(chapter.number).padStart(2, "0")}</span>
                  <span className={`${styles["story-library__chapter-copy"]} break-words`}>{chapter.title}</span>
                  <span aria-hidden="true" className={styles["story-library__chapter-action"]}>Read →</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
