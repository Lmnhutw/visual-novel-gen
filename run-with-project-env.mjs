import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const loadedEnvironment = {};

config({
  path: [join(projectRoot, "env/.env.local"), join(projectRoot, "env/.env")],
  processEnv: loadedEnvironment,
  quiet: true,
});

const commandArguments = process.argv.slice(2);
const databaseOnly = commandArguments[0] === "--database-only";

if (databaseOnly) {
  commandArguments.shift();
}

const environmentEntries = databaseOnly
  ? ["DATABASE_URL", "DIRECT_URL"].flatMap((key) => {
      const value = loadedEnvironment[key];
      return value === undefined ? [] : [[key, value]];
    })
  : Object.entries(loadedEnvironment);

for (const [key, value] of environmentEntries) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

const [tool, ...args] = commandArguments;
const toolPaths = {
  next: join(projectRoot, "node_modules/next/dist/bin/next"),
  prisma: join(projectRoot, "node_modules/prisma/build/index.js"),
  tsx: join(projectRoot, "node_modules/tsx/dist/cli.mjs"),
};

const toolPath = toolPaths[tool];

if (!toolPath) {
  console.error(`Unknown project tool: ${tool ?? "(missing)"}`);
  process.exit(1);
}

const child = spawn(process.execPath, [toolPath, ...args], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
