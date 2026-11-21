BEGIN;

ALTER TABLE "stories" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");

CREATE TEMP TABLE story_slug_backfill ON COMMIT DROP AS
WITH normalized AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        TRIM(BOTH '-' FROM REGEXP_REPLACE(
          TRANSLATE(
            LOWER("title"),
            'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
            'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )),
        ''
      ),
      'untitled-story'
    ) AS base_slug
  FROM "stories"
)
SELECT
  "id",
  base_slug,
  ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY "id") AS duplicate_number
FROM normalized;

-- Reserve every title's natural slug before assigning any numeric suffixes.
UPDATE "stories" AS story
SET "slug" = backfill.base_slug
FROM story_slug_backfill AS backfill
WHERE story."id" = backfill."id" AND backfill.duplicate_number = 1;

DO $$
DECLARE
  duplicate_story RECORD;
  suffix BIGINT;
  candidate TEXT;
BEGIN
  FOR duplicate_story IN
    SELECT * FROM story_slug_backfill
    WHERE duplicate_number > 1
    ORDER BY base_slug, duplicate_number
  LOOP
    suffix := duplicate_story.duplicate_number;
    LOOP
      candidate := duplicate_story.base_slug || '-' || suffix;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "stories" WHERE "slug" = candidate);
      suffix := suffix + 1;
    END LOOP;

    UPDATE "stories" SET "slug" = candidate WHERE "id" = duplicate_story."id";
  END LOOP;
END $$;

ALTER TABLE "stories" ALTER COLUMN "slug" SET NOT NULL;

COMMIT;
