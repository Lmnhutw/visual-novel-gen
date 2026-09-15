ALTER TABLE "stories" ADD COLUMN "slug" TEXT;

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
), numbered AS (
  SELECT
    "id",
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY "id") AS duplicate_number
  FROM normalized
)
UPDATE "stories" AS story
SET "slug" = CASE
  WHEN numbered.duplicate_number = 1 THEN numbered.base_slug
  ELSE numbered.base_slug || '-' || numbered.duplicate_number
END
FROM numbered
WHERE story."id" = numbered."id";

ALTER TABLE "stories" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");
