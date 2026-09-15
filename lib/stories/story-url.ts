export type StoryUrlIdentity = {
  id: string;
  slug?: string;
  title: string;
};

export function storySlug(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled-story";
}

export function storyQueryValue(story: StoryUrlIdentity) {
  return story.slug || storySlug(story.title);
}

/** Parses only pre-slug URLs, preserving existing shared links. */
export function storyIdFromQuery(value: string | null | undefined) {
  const reference = value?.trim() ?? "";
  if (!reference) return "";

  const separatorIndex = reference.lastIndexOf("--");
  if (separatorIndex < 0) return reference.startsWith("c") ? reference : "";

  return reference.slice(separatorIndex + 2).replaceAll("-", "");
}

export function libraryStoryHref(
  story: StoryUrlIdentity,
  options: { chapter?: number; view?: "detail" } = {},
) {
  const searchParams = new URLSearchParams({ story: storyQueryValue(story) });
  if (options.chapter !== undefined) {
    searchParams.set("chapter", String(options.chapter));
  }
  if (options.view) searchParams.set("view", options.view);

  return `/library/story?${searchParams.toString()}`;
}
