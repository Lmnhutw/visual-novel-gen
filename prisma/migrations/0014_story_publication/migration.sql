BEGIN;

CREATE TABLE "author_permissions" (
    "user_id" UUID NOT NULL,
    "AllowToPubish" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "author_permissions_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "published_stories" (
    "story_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pen_name" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "published_stories_pkey" PRIMARY KEY ("story_id"),
    CONSTRAINT "published_stories_story_id_fkey" FOREIGN KEY ("story_id")
        REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "published_chapters" (
    "story_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "published_chapters_pkey" PRIMARY KEY ("story_id", "number"),
    CONSTRAINT "published_chapters_story_id_fkey" FOREIGN KEY ("story_id")
        REFERENCES "published_stories"("story_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "published_stories_slug_key" ON "published_stories"("slug");
CREATE INDEX "published_stories_published_at_story_id_idx" ON "published_stories"("published_at" DESC, "story_id" DESC);

ALTER TABLE "author_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "published_stories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "published_chapters" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "author_permissions", "published_stories", "published_chapters" FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE "author_permissions", "published_stories", "published_chapters" FROM "anon";
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE "author_permissions", "published_stories", "published_chapters" FROM "authenticated";
    END IF;
END $$;

COMMIT;
