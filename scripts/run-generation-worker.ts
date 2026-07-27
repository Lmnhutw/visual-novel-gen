import { prisma } from "@/lib/db/prisma";
import { executeQueuedGenerationJobs } from "@/lib/generation/generation-job-service";

const pollIntervalMs = Math.max(1_000, Number(process.env.GENERATION_WORKER_POLL_MS ?? 5_000));
let running = false;
let shuttingDown = false;

async function tick() {
  if (running || shuttingDown) return;
  running = true;

  try {
    const result = await executeQueuedGenerationJobs();
    if (result.attempted > 0) {
      console.info(`[generation-worker] attempted=${result.attempted} failed=${result.failed}`);
    }
  } catch (error) {
    console.error("[generation-worker] queue poll failed", error);
  } finally {
    running = false;
  }
}

async function shutdown(signal: string) {
  shuttingDown = true;
  console.info(`[generation-worker] received ${signal}; shutting down`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

console.info(`[generation-worker] polling every ${pollIntervalMs}ms`);
void tick();
setInterval(() => void tick(), pollIntervalMs);
