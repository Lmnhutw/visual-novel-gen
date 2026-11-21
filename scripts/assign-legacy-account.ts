import { parseArgs } from "node:util";
import { Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

async function main() {
  const { values } = parseArgs({
    options: {
      "user-id": { type: "string" },
      apply: { type: "boolean", default: false },
      "expect-stories": { type: "string" },
      "expect-templates": { type: "string" },
    },
  });
  const ownerId = z.string().uuid().parse(values["user-id"]);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the target Auth project.");

  const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).auth;
  const { data, error } = await auth.admin.getUserById(ownerId);
  if (error || data.user?.id !== ownerId) {
    throw new Error("The target user could not be verified in Supabase Auth.");
  }

  const result = await prisma.$transaction(async (db) => {
    const storyWhere = { ownerId: null };
    const templateWhere = { ownerId: "local-workspace" };
    const stories = await db.story.count({ where: storyWhere });
    const templates = await db.characterTemplate.count({ where: templateWhere });
    if (!values.apply) return { preview: true, stories, templates };

    if (values["expect-stories"] !== String(stories) || values["expect-templates"] !== String(templates)) {
      throw new Error("Legacy counts differ from the expected counts. Run the preview again.");
    }

    await db.story.updateMany({ where: storyWhere, data: { ownerId } });
    await db.characterTemplate.updateMany({ where: templateWhere, data: { ownerId } });
    const auditLogs = await db.auditLog.updateMany({
      where: { ownerId: null, story: { ownerId } },
      data: { ownerId },
    });
    return { preview: false, stories, templates, auditLogs: auditLogs.count };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  console.log(JSON.stringify(result));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Prisma.PrismaClientKnownRequestError
      ? `Database operation failed (${error.code}).`
      : error instanceof Error ? error.message : "Legacy data transfer failed.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
