-- Keep server-owned workflow data outside the Supabase Data API surface.
-- RLS remains enabled as defense in depth, but browser roles receive no direct
-- table privileges because all access is mediated by authenticated Next.js routes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE
      "public"."generation_jobs",
      "public"."draft_versions",
      "public"."canon_change_proposals",
      "public"."audit_logs"
    FROM "anon";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE
      "public"."generation_jobs",
      "public"."draft_versions",
      "public"."canon_change_proposals",
      "public"."audit_logs"
    FROM "authenticated";
  END IF;
END $$;

ALTER TABLE "generation_jobs"
  ADD CONSTRAINT "generation_jobs_progress_check" CHECK ("progress" BETWEEN 0 AND 100),
  ADD CONSTRAINT "generation_jobs_attempt_count_check" CHECK ("attempt_count" >= 0);

ALTER TABLE "draft_versions"
  ADD CONSTRAINT "draft_versions_version_number_check" CHECK ("version_number" >= 1);

ALTER TABLE "canon_change_proposals"
  ADD CONSTRAINT "canon_change_proposals_confidence_check" CHECK ("confidence" BETWEEN 0 AND 1);
