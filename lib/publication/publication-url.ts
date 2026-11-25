import { STORE_PAGE_LIMIT } from "./publication-contract";

export function publishedStoryHref(slug: string) {
  return `/store/${encodeURIComponent(slug)}`;
}

export function publishedChapterHref(slug: string, chapterNumber: number) {
  return `${publishedStoryHref(slug)}/chapters/${chapterNumber}`;
}

export function parseStorePage(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return page <= STORE_PAGE_LIMIT ? page : 1;
}

export function parsePublishedChapterNumber(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  return number <= 2_147_483_647 ? number : null;
}
