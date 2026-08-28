UPDATE "characters"
SET "race" = NULLIF(BTRIM("species"), '')
WHERE NULLIF(BTRIM("race"), '') IS NULL
  AND NULLIF(BTRIM("species"), '') IS NOT NULL;

UPDATE "character_templates"
SET "race" = NULLIF(BTRIM("species"), '')
WHERE NULLIF(BTRIM("race"), '') IS NULL
  AND NULLIF(BTRIM("species"), '') IS NOT NULL;

ALTER TABLE "characters" DROP COLUMN "species";
ALTER TABLE "character_templates" DROP COLUMN "species";
