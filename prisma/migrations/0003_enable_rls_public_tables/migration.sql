-- Enable RLS on every application table in the exposed public schema.
-- The app currently accesses data through server-side Prisma routes, so no
-- anon/authenticated Data API policies are granted here.
ALTER TABLE "public"."stories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."story_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."characters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."character_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."character_states" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."relationships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."relationship_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scenes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."event_impacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."lore_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."secrets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."plot_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."knowledge_tracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."memories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."embeddings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."continuity_issues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."retrieval_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."generation_runs" ENABLE ROW LEVEL SECURITY;

-- Defense in depth for Supabase Data API roles. RLS denies rows by default,
-- and these revokes also remove direct table privileges where the roles exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE
      "public"."stories",
      "public"."story_settings",
      "public"."characters",
      "public"."character_profiles",
      "public"."character_states",
      "public"."relationships",
      "public"."relationship_history",
      "public"."chapters",
      "public"."scenes",
      "public"."events",
      "public"."event_impacts",
      "public"."lore_entries",
      "public"."secrets",
      "public"."plot_threads",
      "public"."knowledge_tracking",
      "public"."memories",
      "public"."embeddings",
      "public"."continuity_issues",
      "public"."retrieval_logs",
      "public"."generation_runs"
    FROM "anon";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE
      "public"."stories",
      "public"."story_settings",
      "public"."characters",
      "public"."character_profiles",
      "public"."character_states",
      "public"."relationships",
      "public"."relationship_history",
      "public"."chapters",
      "public"."scenes",
      "public"."events",
      "public"."event_impacts",
      "public"."lore_entries",
      "public"."secrets",
      "public"."plot_threads",
      "public"."knowledge_tracking",
      "public"."memories",
      "public"."embeddings",
      "public"."continuity_issues",
      "public"."retrieval_logs",
      "public"."generation_runs"
    FROM "authenticated";
  END IF;
END $$;
