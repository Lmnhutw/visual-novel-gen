import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { prisma } from "@/lib/db/prisma";

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  const migrationPath = join(
    process.cwd(),
    "prisma",
    "migrations",
    "0001_initial",
    "migration.sql",
  );
  const sql = await readFile(migrationPath, "utf8");
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log(`Applied ${statements.length} migration statements.`);
}

main()
  .catch((error) => {
    console.error("Initial migration apply failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
