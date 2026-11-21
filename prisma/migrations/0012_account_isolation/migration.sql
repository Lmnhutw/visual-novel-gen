BEGIN;

ALTER TABLE "public"."character_templates" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."character_templates", "public"."audit_logs" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "public"."character_templates", "public"."audit_logs" FROM "anon";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "public"."character_templates", "public"."audit_logs" FROM "authenticated";
  END IF;
END $$;
DROP POLICY IF EXISTS "audit_logs_owner_access" ON "public"."audit_logs";

ALTER TABLE "public"."audit_logs" ADD COLUMN "owner_id" TEXT;
UPDATE "public"."audit_logs" AS audit
SET "owner_id" = story."owner_id"
FROM "public"."stories" AS story
WHERE audit."story_id" = story."id";

-- Keep the owner even after the story reference is cleared on deletion.
CREATE FUNCTION "public"."set_audit_log_owner"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW."story_id" IS NOT NULL THEN
    SELECT "owner_id" INTO NEW."owner_id"
    FROM "public"."stories"
    WHERE "id" = NEW."story_id";
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "audit_logs_set_owner"
BEFORE INSERT ON "public"."audit_logs"
FOR EACH ROW EXECUTE FUNCTION "public"."set_audit_log_owner"();

COMMIT;
