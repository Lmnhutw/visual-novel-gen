ALTER TABLE "public"."generation_jobs"
  ADD COLUMN "fallback_model" TEXT,
  ADD COLUMN "fallback_expires_at" TIMESTAMP(3);

CREATE INDEX "generation_jobs_status_fallback_expires_at_idx"
  ON "public"."generation_jobs"("status", "fallback_expires_at");
