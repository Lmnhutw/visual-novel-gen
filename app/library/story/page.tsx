import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./story.module.css";

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
      <main className={styles["story-reader"]}>
        <article className={styles["story-reader__article"]}>
          <Link className={styles["story-reader__back-link"]} href={`/library/story?story=${encodeURIComponent(story.id)}&view=detail`}>
            ← {story.title}
          </Link>
          <header className={styles["story-reader__header"]}>
            <p className={styles["story-reader__eyebrow"]}>CHAPTER {String(selectedChapter.number).padStart(2, "0")}</p>
            <h1 className={styles["story-reader__title"]}>{selectedChapter.title}</h1>
          </header>
          <div className={styles["story-reader__content"]}>
            {content ?? "This chapter has not been written yet."}
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className={styles["story-library"]}>
      <div className={styles["story-library__container"]}>
        <Link className={styles["story-library__back-link"]} href="/">
          ← Back to Studio
        </Link>
        <header className={styles["story-library__header"]}>
          <p className={styles["story-library__eyebrow"]}>STORY LIBRARY</p>
          <h1 className={styles["story-library__title"]}>{story.title}</h1>
          <p className={styles["story-library__description"]}>{story.description ?? "No story description yet."}</p>
          <div className={styles["story-library__meta"]}>
            <span>{story._count.chapters} chapters</span>
            <span className={styles["story-library__status"]}>{statusLabel(story.status)}</span>
          </div>
        </header>
        <section className={styles["story-library__chapters"]} aria-labelledby="chapters-title">
          <div className={styles["story-library__chapters-header"]}>
            <h2 className={styles["story-library__chapters-title"]} id="chapters-title">Chapters</h2>
            <span className={styles["story-library__chapters-note"]}>Read from the manuscript spine</span>
          </div>
          <ol className={styles["story-library__chapter-list"]}>
            {story.chapters.map((entry) => (
              <li className={styles["story-library__chapter-item"]} key={entry.id}>
                <Link className={styles["story-library__chapter-link"]} href={`/library/story?story=${encodeURIComponent(story.id)}&chapter=${entry.number}`}>
                  <span className={styles["story-library__chapter-number"]}>{String(entry.number).padStart(2, "0")}</span>
                  <span className={styles["story-library__chapter-copy"]}>
                    <span className={styles["story-library__chapter-title"]}>{entry.title}</span>
                    <span className={styles["story-library__chapter-summary"]}>{entry.summary ?? "Open chapter"}</span>
                  </span>
                  <span className={styles["story-library__chapter-action"]}>Read →</span>
                </Link>
              </li>
            ))}
            {!story.chapters.length ? <li className={styles["story-library__empty"]}>No chapters yet. Add a chapter in Studio to start the manuscript.</li> : null}
          </ol>
        </section>
      </div>
    </main>
  );
}
