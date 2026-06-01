import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { prisma } from "@/lib/db/prisma";

async function main() {
  const migrationName = "0001_initial";
  const migrationPath = join(
    process.cwd(),
    "prisma",
    "migrations",
    migrationName,
    "migration.sql",
  );
  const sql = await readFile(migrationPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "_prisma_migrations" (
        "id",
        "checksum",
        "finished_at",
        "migration_name",
        "logs",
        "rolled_back_at",
        "started_at",
        "applied_steps_count"
      )
      VALUES ($1, $2, now(), $3, NULL, NULL, now(), 112)
      ON CONFLICT ("id") DO NOTHING
    `,
    randomUUID(),
    checksum,
    migrationName,
  );

  console.log(`Marked ${migrationName} as applied.`);
}

main()
  .catch((error) => {
    console.error("Migration history update failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
