export const PUBLICATION_PEN_NAME_MAX = 80;
export const STORE_PAGE_LIMIT = 10_000;

type PublicationChapter = {
  id: string;
  number: number;
  title: string;
};

export type PublicationChapterPreview = PublicationChapter & { content: string };

export type PublicationSummary = {
  penName: string;
  chapterNumbers: number[];
  publishedAt: string;
  updatedAt: string;
};

export type PublicationManagement = {
  canPublish: boolean;
  story: { slug: string; title: string; description: string | null };
  chapters: PublicationChapter[];
  publication: PublicationSummary | null;
};
