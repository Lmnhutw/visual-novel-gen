-- Expand characters with searchable Character Bible fields.
ALTER TABLE "characters"
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "gender" TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN "age" INTEGER NOT NULL DEFAULT 18,
  ADD COLUMN "race" TEXT,
  ADD COLUMN "species" TEXT,
  ADD COLUMN "occupation" TEXT,
  ADD COLUMN "archetypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE OR REPLACE FUNCTION "public"."try_parse_jsonb"("input" TEXT, "fallback" JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN COALESCE(NULLIF("input", ''), "fallback"::TEXT)::JSONB;
EXCEPTION WHEN OTHERS THEN
  RETURN "fallback";
END;
$$;

-- Convert profile documents from JSON-encoded text into native PostgreSQL JSONB.
ALTER TABLE "character_profiles"
  ALTER COLUMN "personality" DROP DEFAULT,
  ALTER COLUMN "personality" TYPE JSONB USING "public"."try_parse_jsonb"("personality", '{}'::JSONB),
  ALTER COLUMN "personality" SET DEFAULT '{}'::JSONB,
  ALTER COLUMN "appearance" DROP DEFAULT,
  ALTER COLUMN "appearance" TYPE JSONB USING "public"."try_parse_jsonb"("appearance", '{}'::JSONB),
  ALTER COLUMN "appearance" DROP NOT NULL,
  ALTER COLUMN "boundaries" DROP DEFAULT,
  ALTER COLUMN "boundaries" TYPE JSONB USING "public"."try_parse_jsonb"("boundaries", '{}'::JSONB),
  ALTER COLUMN "boundaries" DROP NOT NULL,
  ALTER COLUMN "motivations" DROP DEFAULT,
  ALTER COLUMN "motivations" TYPE JSONB USING "public"."try_parse_jsonb"("motivations", '{}'::JSONB),
  ALTER COLUMN "motivations" DROP NOT NULL;

ALTER TABLE "character_profiles"
  ADD COLUMN "talents" JSONB,
  ADD COLUMN "speech" JSONB,
  ADD COLUMN "relationship_preference" JSONB,
  ADD COLUMN "background" JSONB,
  ADD COLUMN "current_state" JSONB,
  ADD COLUMN "character_arc" JSONB;

CREATE INDEX "characters_story_id_idx" ON "characters"("story_id");
CREATE INDEX "characters_gender_idx" ON "characters"("gender");
CREATE INDEX "characters_age_idx" ON "characters"("age");

DROP FUNCTION "public"."try_parse_jsonb"(TEXT, JSONB);
