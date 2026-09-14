ALTER TABLE "chapters"
  ADD COLUMN "brief" TEXT,
  ADD COLUMN "brief_version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "brief_updated_at" TIMESTAMP(3),
  ADD CONSTRAINT "chapters_brief_version_nonnegative_check"
    CHECK ("brief_version" >= 0);
