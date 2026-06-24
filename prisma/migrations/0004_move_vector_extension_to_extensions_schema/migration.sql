-- Keep extension-owned objects out of the exposed public schema.
CREATE SCHEMA IF NOT EXISTS "extensions";

ALTER EXTENSION "vector" SET SCHEMA "extensions";
