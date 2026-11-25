"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/modal";
import {
  PUBLICATION_PEN_NAME_MAX,
  type PublicationChapterPreview,
  type PublicationManagement,
  type PublicationSummary,
} from "@/lib/publication/publication-contract";
import { publishedStoryHref } from "@/lib/publication/publication-url";

import { formatRequestError, requestJson } from "./api";

export function PublicationDialog({
  storyId,
  onClose,
}: {
  storyId: string;
  onClose: () => void;
}) {
  const endpoint = `/api/stories/${encodeURIComponent(storyId)}/publication`;
  const [management, setManagement] = useState<PublicationManagement | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [penName, setPenName] = useState("");
  const [chapterIds, setChapterIds] = useState(() => new Set<string>());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [pending, setPending] = useState<"publish" | "unpublish" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const publication = management?.publication;

  useEffect(() => {
    const controller = new AbortController();
    void requestJson<PublicationManagement>(endpoint, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        const publishedNumbers = new Set(result.publication?.chapterNumbers);
        setManagement(result);
        setPenName(result.publication?.penName ?? "");
        setChapterIds(new Set(result.chapters.filter((chapter) => publishedNumbers.has(chapter.number)).map((chapter) => chapter.id)));
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(formatRequestError(requestError, "Could not load publication settings."));
        }
      });
    return () => controller.abort();
  }, [endpoint, loadAttempt]);

  function reloadSettings() {
    setManagement(null);
    setError("");
    setNotice("");
    setConfirmUnpublish(false);
    setPreviewId(null);
    setLoadAttempt((attempt) => attempt + 1);
  }

  const canSubmit = Boolean(
    management?.canPublish && penName.trim() && chapterIds.size && !pending && !confirmUnpublish,
  );

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!management || !canSubmit) return;
    setPending("publish");
    setError("");
    setNotice("");

    try {
      const result = await requestJson<{ publication: PublicationSummary }>(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penName: penName.trim(), chapterIds: [...chapterIds] }),
      });
      setManagement({ ...management, publication: result.publication });
      setPenName(result.publication.penName);
      setNotice(publication ? "Public version updated." : "Story published to the Story Store.");
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not publish this story."));
    } finally {
      setPending(null);
    }
  }

  async function unpublish() {
    if (!management || !publication || pending) return;
    setPending("unpublish");
    setError("");
    setNotice("");

    try {
      await requestJson(endpoint, { method: "DELETE" });
      setManagement({ ...management, publication: null });
      setConfirmUnpublish(false);
      setNotice("Story removed from the Story Store.");
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not remove this story from the Story Store."));
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog title="Manage publication" onClose={() => { if (!pending) onClose(); }}>
      <div className="max-h-[min(70dvh,42rem)] space-y-4 overflow-y-auto p-1">
        {error ? (
          <div className="space-y-1">
            <p className="text-sm text-error" role="alert">{error}</p>
            <Button variant="ghost" onClick={reloadSettings}>Reload publication settings</Button>
          </div>
        ) : null}
        {notice ? <p className="text-sm text-primary" role="status">{notice}</p> : null}
        {!management && !error ? <p className="text-sm text-on-surface-variant" role="status">Loading publication settings…</p> : null}
        {management ? (
          <>
            <div className="space-y-1 break-words">
              <h3 className="text-lg font-semibold">{management.story.title}</h3>
              {management.story.description ? <p className="text-sm text-on-surface-variant">{management.story.description}</p> : null}
              {publication ? (
                <Link className="inline-block rounded text-sm text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" href={publishedStoryHref(management.story.slug)} prefetch={false}>
                  View public story ({publication.chapterNumbers.length} {publication.chapterNumbers.length === 1 ? "chapter" : "chapters"})
                </Link>
              ) : <p className="text-sm text-on-surface-variant">Private</p>}
            </div>
            <form className="space-y-4" onSubmit={publish}>
              {management.canPublish ? (
                <fieldset className="min-w-0 space-y-4" disabled={Boolean(pending) || confirmUnpublish}>
                  <legend className="sr-only">Publication details</legend>
                  <label className="block text-sm font-medium">
                    Public pen name
                    <input
                      className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-surface-dim px-3 outline-none focus:border-primary"
                      maxLength={PUBLICATION_PEN_NAME_MAX}
                      required
                      value={penName}
                      onChange={(event) => setPenName(event.target.value)}
                    />
                  </label>
                  <fieldset className="min-w-0">
                    <legend className="text-sm font-medium">Chapters to publish</legend>
                    <p className="mb-2 mt-1 text-sm text-on-surface-variant">
                      {management.chapters.length
                        ? `${chapterIds.size} selected. Preview a chapter to check what readers will see.`
                        : "Complete a chapter with manuscript text to publish this story."}
                    </p>
                    {management.chapters.length ? (
                      <ul className="divide-y divide-white/10 border-y border-white/10">
                        {management.chapters.map((chapter) => {
                          const checked = chapterIds.has(chapter.id);
                          const previewOpen = previewId === chapter.id;
                          return (
                            <li className="py-1" key={chapter.id}>
                              <div className="flex items-center justify-between gap-2">
                                <label className="flex min-h-10 min-w-0 flex-1 items-center gap-3 break-words text-sm">
                                  <input
                                    checked={checked}
                                    className="size-4 shrink-0 accent-primary"
                                    type="checkbox"
                                    onChange={(event) => {
                                      const selected = event.target.checked;
                                      setChapterIds((current) => {
                                        const next = new Set(current);
                                        if (selected) next.add(chapter.id);
                                        else next.delete(chapter.id);
                                        return next;
                                      });
                                    }}
                                  />
                                  <span className="min-w-0">{chapter.number}. {chapter.title}</span>
                                </label>
                                <Button
                                  aria-expanded={previewOpen}
                                  aria-label={`${previewOpen ? "Close preview of" : "Preview"} chapter ${chapter.number}: ${chapter.title}`}
                                  className="shrink-0"
                                  variant="ghost"
                                  onClick={() => setPreviewId(previewOpen ? null : chapter.id)}
                                >
                                  {previewOpen ? "Close preview" : "Preview"}
                                </Button>
                              </div>
                              {previewOpen ? (
                                <ManuscriptPreview url={`${endpoint}?${new URLSearchParams({ chapterId: chapter.id })}`} />
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </fieldset>
                </fieldset>
              ) : (
                <p className="text-sm text-on-surface-variant">Your account needs publishing permission to publish or update a story.</p>
              )}
              {confirmUnpublish ? (
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <p className="text-sm text-on-surface-variant">Remove this story and its chapters from public view?</p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button disabled={Boolean(pending)} onClick={() => setConfirmUnpublish(false)}>Keep public</Button>
                    <Button disabled={Boolean(pending)} variant="danger" onClick={() => void unpublish()}>
                      {pending === "unpublish" ? "Removing…" : "Remove from Story Store"}
                    </Button>
                  </div>
                </div>
              ) : publication || management.canPublish ? (
                <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
                  {publication ? <Button disabled={Boolean(pending)} variant="ghost" onClick={() => setConfirmUnpublish(true)}>Unpublish</Button> : null}
                  {management.canPublish ? (
                    <Button disabled={!canSubmit} type="submit" variant="primary">
                      {pending === "publish" ? "Saving…" : publication ? "Update public version" : "Publish to Story Store"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </form>
          </>
        ) : null}
      </div>
    </Dialog>
  );
}

function ManuscriptPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<PublicationChapterPreview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void requestJson<{ chapter: PublicationChapterPreview }>(url, { signal: controller.signal })
      .then(({ chapter }) => {
        if (!controller.signal.aborted) setPreview(chapter);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(formatRequestError(requestError, "Could not load the chapter preview."));
        }
      });
    return () => controller.abort();
  }, [url]);

  return (
    <section aria-label="Chapter preview" className="mb-2 rounded-lg border border-white/10 bg-surface-dim p-3 text-sm">
      {error ? <p className="text-error" role="alert">{error}</p> : null}
      {!preview && !error ? <p role="status">Loading chapter preview…</p> : null}
      {preview ? (
        <div aria-label="Manuscript text" className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words leading-6 text-on-surface-variant" role="region" tabIndex={0}>
          {preview.content}
        </div>
      ) : null}
    </section>
  );
}
