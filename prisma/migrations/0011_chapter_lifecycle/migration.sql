ALTER TABLE "story_settings"
  ADD COLUMN "chapter_target_words" INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN "chapter_soft_limit_words" INTEGER NOT NULL DEFAULT 5500,
  ADD COLUMN "chapter_hard_limit_words" INTEGER NOT NULL DEFAULT 6000,
  ADD COLUMN "chapter_auto_advance" BOOLEAN NOT NULL DEFAULT true,
  ADD CONSTRAINT "story_settings_chapter_length_order_check"
    CHECK (
      "chapter_target_words" > 0
      AND "chapter_target_words" <= "chapter_soft_limit_words"
      AND "chapter_soft_limit_words" <= "chapter_hard_limit_words"
    );

ALTER TABLE "chapters"
  ADD COLUMN "word_count" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "chapters_word_count_nonnegative_check"
    CHECK ("word_count" >= 0);

UPDATE "chapters" AS chapter
SET "word_count" = COALESCE((
  SELECT SUM(
    CASE
      WHEN BTRIM(scene."content") = '' THEN 0
      ELSE array_length(
        regexp_split_to_array(BTRIM(scene."content"), E'\\s+'),
        1
      )
    END
  )
  FROM "scenes" AS scene
  WHERE scene."chapter_id" = chapter."id"
), 0) +
  CASE
    WHEN BTRIM(COALESCE(chapter."content", '')) = '' THEN 0
    WHEN EXISTS (
      SELECT 1
      FROM "scenes" AS scene
      WHERE scene."chapter_id" = chapter."id"
        AND BTRIM(COALESCE(scene."content", '')) = BTRIM(chapter."content")
    ) THEN 0
    ELSE array_length(
      regexp_split_to_array(BTRIM(chapter."content"), E'\\s+'),
      1
    )
  END
;
