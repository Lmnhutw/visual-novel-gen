CREATE TABLE "character_templates" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "age_confirmed" BOOLEAN NOT NULL DEFAULT false,
  "gender" TEXT NOT NULL DEFAULT 'other',
  "age" INTEGER NOT NULL DEFAULT 18,
  "race" TEXT,
  "species" TEXT,
  "occupation" TEXT,
  "archetypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "profile" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "character_templates_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "characters" ADD COLUMN "source_template_id" TEXT;
ALTER TABLE "stories" ADD COLUMN "primary_protagonist_id" TEXT;

CREATE UNIQUE INDEX "stories_primary_protagonist_id_key" ON "stories"("primary_protagonist_id");
CREATE INDEX "character_templates_owner_id_name_idx" ON "character_templates"("owner_id", "name");

ALTER TABLE "stories"
  ADD CONSTRAINT "stories_primary_protagonist_id_fkey"
  FOREIGN KEY ("primary_protagonist_id") REFERENCES "characters"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
