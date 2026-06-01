import { prisma } from "@/lib/db/prisma";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const [version] = await prisma.$queryRaw<Array<{ version: string }>>`
    SELECT version()
  `;
  const [vector] = await prisma.$queryRaw<Array<{ installed: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'vector'
    ) AS installed
  `;

  console.log("Supabase PostgreSQL connection OK");
  console.log(`Postgres: ${version.version}`);
  console.log(`pgvector installed: ${vector.installed}`);
  console.log(`DIRECT_URL set: ${Boolean(directUrl)}`);
}

main()
  .catch((error) => {
    console.error("Supabase connection check failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
