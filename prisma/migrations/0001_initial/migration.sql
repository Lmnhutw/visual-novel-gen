-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "story_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "genre" TEXT NOT NULL DEFAULT '[]',
    "tone" TEXT,
    "pov" TEXT,
    "tense" TEXT,
    "nsfw_policy" TEXT NOT NULL DEFAULT '{}',
    "style_guide" TEXT,
    "model_config" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "story_settings_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPPORTING',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "age_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'canon',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "characters_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "character_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "character_id" TEXT NOT NULL,
    "personality" TEXT NOT NULL DEFAULT '{}',
    "voice_rules" TEXT,
    "backstory" TEXT,
    "appearance" TEXT NOT NULL DEFAULT '{}',
    "boundaries" TEXT NOT NULL DEFAULT '{}',
    "motivations" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "character_profiles_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "character_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "character_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "scene_id" TEXT,
    "location" TEXT,
    "emotional_state" TEXT NOT NULL DEFAULT '{}',
    "physical_state" TEXT NOT NULL DEFAULT '{}',
    "goals" TEXT NOT NULL DEFAULT '{}',
    "valid_from" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "character_states_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "character_states_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "character_states_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "character_a_id" TEXT NOT NULL,
    "character_b_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "trust" INTEGER NOT NULL DEFAULT 0,
    "intimacy" INTEGER NOT NULL DEFAULT 0,
    "conflict" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "boundaries" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "relationships_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "relationships_character_a_id_fkey" FOREIGN KEY ("character_a_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "relationships_character_b_id_fkey" FOREIGN KEY ("character_b_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "relationship_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "relationship_id" TEXT NOT NULL,
    "scene_id" TEXT,
    "event_id" TEXT,
    "change_summary" TEXT NOT NULL,
    "delta" TEXT NOT NULL DEFAULT '{}',
    "emotional_weight" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "relationship_history_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "relationship_history_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "relationship_history_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OUTLINE',
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "chapters_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "content" TEXT,
    "pov_character_id" TEXT,
    "location" TEXT,
    "started_at_story_time" DATETIME,
    "is_flashback" BOOLEAN NOT NULL DEFAULT false,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scenes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "scenes_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "scenes_pov_character_id_fkey" FOREIGN KEY ("pov_character_id") REFERENCES "characters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "scene_id" TEXT,
    "chapter_id" TEXT,
    "event_time" DATETIME,
    "summary" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "participants" TEXT NOT NULL DEFAULT '[]',
    "salience" REAL NOT NULL DEFAULT 0.5,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "events_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "events_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "events_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_impacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "impact_type" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_impacts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lore_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "canon_level" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "lore_entries_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "secrets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "truth_status" TEXT NOT NULL DEFAULT 'hidden',
    "holder_character_id" TEXT,
    "revealed_at_scene_id" TEXT,
    "salience" REAL NOT NULL DEFAULT 0.7,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "secrets_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "secrets_holder_character_id_fkey" FOREIGN KEY ("holder_character_id") REFERENCES "characters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "secrets_revealed_at_scene_id_fkey" FOREIGN KEY ("revealed_at_scene_id") REFERENCES "scenes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "knowledge_tracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "secret_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "knowledge_state" TEXT NOT NULL,
    "learned_at_scene_id" TEXT,
    "evidence" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "knowledge_tracking_secret_id_fkey" FOREIGN KEY ("secret_id") REFERENCES "secrets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "knowledge_tracking_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "knowledge_tracking_learned_at_scene_id_fkey" FOREIGN KEY ("learned_at_scene_id") REFERENCES "scenes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "memories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT,
    "memory_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "salience" REAL NOT NULL DEFAULT 0.5,
    "emotional_weight" REAL NOT NULL DEFAULT 0,
    "entities" TEXT NOT NULL DEFAULT '{}',
    "embedding" TEXT,
    "embedding_model" TEXT,
    "embedding_dimensions" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "memories_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "embeddings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "chunk_text" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "embeddings_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "continuity_issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "scene_id" TEXT,
    "chapter_id" TEXT,
    "generation_run_id" TEXT,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT NOT NULL DEFAULT '{}',
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "continuity_issues_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "continuity_issues_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "continuity_issues_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "continuity_issues_generation_run_id_fkey" FOREIGN KEY ("generation_run_id") REFERENCES "generation_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "retrieval_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "generation_run_id" TEXT,
    "query" TEXT NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '{}',
    "results" TEXT NOT NULL DEFAULT '[]',
    "token_budget" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "retrieval_logs_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "retrieval_logs_generation_run_id_fkey" FOREIGN KEY ("generation_run_id") REFERENCES "generation_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generation_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "story_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "input" TEXT NOT NULL DEFAULT '{}',
    "prompt" TEXT,
    "output" TEXT,
    "model" TEXT NOT NULL,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "generation_runs_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "stories_owner_id_idx" ON "stories"("owner_id");

-- CreateIndex
CREATE INDEX "stories_status_updated_at_idx" ON "stories"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "story_settings_story_id_key" ON "story_settings"("story_id");

-- CreateIndex
CREATE INDEX "characters_story_id_status_idx" ON "characters"("story_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "characters_story_id_name_key" ON "characters"("story_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "character_profiles_character_id_key" ON "character_profiles"("character_id");

-- CreateIndex
CREATE INDEX "character_states_character_id_valid_from_idx" ON "character_states"("character_id", "valid_from");

-- CreateIndex
CREATE INDEX "character_states_chapter_id_idx" ON "character_states"("chapter_id");

-- CreateIndex
CREATE INDEX "character_states_scene_id_idx" ON "character_states"("scene_id");

-- CreateIndex
CREATE INDEX "relationships_story_id_status_idx" ON "relationships"("story_id", "status");

-- CreateIndex
CREATE INDEX "relationships_character_a_id_idx" ON "relationships"("character_a_id");

-- CreateIndex
CREATE INDEX "relationships_character_b_id_idx" ON "relationships"("character_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "relationships_story_id_character_a_id_character_b_id_key" ON "relationships"("story_id", "character_a_id", "character_b_id");

-- CreateIndex
CREATE INDEX "relationship_history_relationship_id_created_at_idx" ON "relationship_history"("relationship_id", "created_at");

-- CreateIndex
CREATE INDEX "relationship_history_scene_id_idx" ON "relationship_history"("scene_id");

-- CreateIndex
CREATE INDEX "relationship_history_event_id_idx" ON "relationship_history"("event_id");

-- CreateIndex
CREATE INDEX "chapters_story_id_status_idx" ON "chapters"("story_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_story_id_number_key" ON "chapters"("story_id", "number");

-- CreateIndex
CREATE INDEX "scenes_story_id_started_at_story_time_idx" ON "scenes"("story_id", "started_at_story_time");

-- CreateIndex
CREATE INDEX "scenes_pov_character_id_idx" ON "scenes"("pov_character_id");

-- CreateIndex
CREATE UNIQUE INDEX "scenes_chapter_id_number_key" ON "scenes"("chapter_id", "number");

-- CreateIndex
CREATE INDEX "events_story_id_event_time_idx" ON "events"("story_id", "event_time");

-- CreateIndex
CREATE INDEX "events_scene_id_idx" ON "events"("scene_id");

-- CreateIndex
CREATE INDEX "events_chapter_id_idx" ON "events"("chapter_id");

-- CreateIndex
CREATE INDEX "event_impacts_event_id_idx" ON "event_impacts"("event_id");

-- CreateIndex
CREATE INDEX "event_impacts_target_type_target_id_idx" ON "event_impacts"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "lore_entries_story_id_category_idx" ON "lore_entries"("story_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "lore_entries_story_id_category_name_key" ON "lore_entries"("story_id", "category", "name");

-- CreateIndex
CREATE INDEX "secrets_story_id_truth_status_idx" ON "secrets"("story_id", "truth_status");

-- CreateIndex
CREATE INDEX "secrets_holder_character_id_idx" ON "secrets"("holder_character_id");

-- CreateIndex
CREATE INDEX "secrets_revealed_at_scene_id_idx" ON "secrets"("revealed_at_scene_id");

-- CreateIndex
CREATE INDEX "knowledge_tracking_character_id_idx" ON "knowledge_tracking"("character_id");

-- CreateIndex
CREATE INDEX "knowledge_tracking_learned_at_scene_id_idx" ON "knowledge_tracking"("learned_at_scene_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_tracking_secret_id_character_id_key" ON "knowledge_tracking"("secret_id", "character_id");

-- CreateIndex
CREATE INDEX "memories_story_id_memory_type_salience_idx" ON "memories"("story_id", "memory_type", "salience");

-- CreateIndex
CREATE INDEX "memories_source_type_source_id_idx" ON "memories"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "embeddings_story_id_owner_type_idx" ON "embeddings"("story_id", "owner_type");

-- CreateIndex
CREATE INDEX "embeddings_owner_type_owner_id_idx" ON "embeddings"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "continuity_issues_story_id_status_severity_idx" ON "continuity_issues"("story_id", "status", "severity");

-- CreateIndex
CREATE INDEX "continuity_issues_scene_id_idx" ON "continuity_issues"("scene_id");

-- CreateIndex
CREATE INDEX "continuity_issues_chapter_id_idx" ON "continuity_issues"("chapter_id");

-- CreateIndex
CREATE INDEX "continuity_issues_generation_run_id_idx" ON "continuity_issues"("generation_run_id");

-- CreateIndex
CREATE INDEX "retrieval_logs_story_id_created_at_idx" ON "retrieval_logs"("story_id", "created_at");

-- CreateIndex
CREATE INDEX "retrieval_logs_generation_run_id_idx" ON "retrieval_logs"("generation_run_id");

-- CreateIndex
CREATE INDEX "generation_runs_story_id_created_at_idx" ON "generation_runs"("story_id", "created_at");

-- CreateIndex
CREATE INDEX "generation_runs_status_idx" ON "generation_runs"("status");

