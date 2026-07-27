-- Persisted, reviewable AI generation workflow.
CREATE TABLE "generation_jobs" (
  "id" TEXT NOT NULL,
  "story_id" TEXT NOT NULL,
  "chapter_id" TEXT,
  "generation_run_id" TEXT,
  "draft_version_id" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "stage" TEXT NOT NULL DEFAULT 'QUEUED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "idempotency_key" TEXT,
  "input" TEXT NOT NULL DEFAULT '{}',
  "context_snapshot" TEXT,
  "prompt" TEXT,
  "error_code" TEXT,
  "error" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "draft_versions" (
  "id" TEXT NOT NULL,
  "story_id" TEXT NOT NULL,
  "chapter_id" TEXT,
  "scene_id" TEXT,
  "generation_run_id" TEXT,
  "version_number" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "title" TEXT,
  "content" TEXT NOT NULL,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "draft_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "canon_change_proposals" (
  "id" TEXT NOT NULL,
  "story_id" TEXT NOT NULL,
  "generation_job_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "before" TEXT,
  "proposed_after" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "actionability" TEXT NOT NULL DEFAULT 'MANUAL_REVIEW',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "canon_change_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "story_id" TEXT,
  "actor_id" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "generation_jobs_generation_run_id_key" ON "generation_jobs"("generation_run_id");
CREATE UNIQUE INDEX "generation_jobs_draft_version_id_key" ON "generation_jobs"("draft_version_id");
CREATE UNIQUE INDEX "generation_jobs_story_id_idempotency_key_key" ON "generation_jobs"("story_id", "idempotency_key");
CREATE INDEX "generation_jobs_status_created_at_idx" ON "generation_jobs"("status", "created_at");
CREATE INDEX "generation_jobs_story_id_created_at_idx" ON "generation_jobs"("story_id", "created_at");
CREATE INDEX "draft_versions_story_id_created_at_idx" ON "draft_versions"("story_id", "created_at");
CREATE INDEX "draft_versions_chapter_id_version_number_idx" ON "draft_versions"("chapter_id", "version_number");
CREATE INDEX "draft_versions_generation_run_id_idx" ON "draft_versions"("generation_run_id");
CREATE INDEX "canon_change_proposals_story_id_status_created_at_idx" ON "canon_change_proposals"("story_id", "status", "created_at");
CREATE INDEX "canon_change_proposals_generation_job_id_idx" ON "canon_change_proposals"("generation_job_id");
CREATE INDEX "audit_logs_story_id_created_at_idx" ON "audit_logs"("story_id", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_generation_run_id_fkey" FOREIGN KEY ("generation_run_id") REFERENCES "generation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_draft_version_id_fkey" FOREIGN KEY ("draft_version_id") REFERENCES "draft_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "draft_versions" ADD CONSTRAINT "draft_versions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "draft_versions" ADD CONSTRAINT "draft_versions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "draft_versions" ADD CONSTRAINT "draft_versions_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "draft_versions" ADD CONSTRAINT "draft_versions_generation_run_id_fkey" FOREIGN KEY ("generation_run_id") REFERENCES "generation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "canon_change_proposals" ADD CONSTRAINT "canon_change_proposals_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "canon_change_proposals" ADD CONSTRAINT "canon_change_proposals_generation_job_id_fkey" FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "generation_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "draft_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "canon_change_proposals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- The local Docker image does not define Supabase's authenticated role or auth schema.
-- Install ownership policies only when running against a Supabase database.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     AND EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE $policy$
      CREATE POLICY "generation_jobs_owner_access" ON "generation_jobs" FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM "stories" WHERE "stories"."id" = "generation_jobs"."story_id" AND "stories"."owner_id" = (SELECT auth.uid())::text))
      WITH CHECK (EXISTS (SELECT 1 FROM "stories" WHERE "stories"."id" = "generation_jobs"."story_id" AND "stories"."owner_id" = (SELECT auth.uid())::text))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "draft_versions_owner_access" ON "draft_versions" FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM "stories" WHERE "stories"."id" = "draft_versions"."story_id" AND "stories"."owner_id" = (SELECT auth.uid())::text))
      WITH CHECK (EXISTS (SELECT 1 FROM "stories" WHERE "stories"."id" = "draft_versions"."story_id" AND "stories"."owner_id" = (SELECT auth.uid())::text))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "canon_change_proposals_owner_access" ON "canon_change_proposals" FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM "stories" WHERE "stories"."id" = "canon_change_proposals"."story_id" AND "stories"."owner_id" = (SELECT auth.uid())::text))
      WITH CHECK (EXISTS (SELECT 1 FROM "stories" WHERE "stories"."id" = "canon_change_proposals"."story_id" AND "stories"."owner_id" = (SELECT auth.uid())::text))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "audit_logs_owner_access" ON "audit_logs" FOR SELECT TO authenticated
      USING ("story_id" IS NULL OR EXISTS (SELECT 1 FROM "stories" WHERE "stories"."id" = "audit_logs"."story_id" AND "stories"."owner_id" = (SELECT auth.uid())::text))
    $policy$;
  END IF;
END $$;
