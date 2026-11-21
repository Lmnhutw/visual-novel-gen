import { execFileSync, spawn } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, request } from "node:http";
import { setTimeout } from "node:timers/promises";

const project = `vng-account-${randomBytes(5).toString("hex")}`;
const secret = randomBytes(32).toString("hex");
const dockerEnv = { ...process.env, ACCOUNT_TEST_JWT_SECRET: secret };
const compose = (...args) => execFileSync("docker", [
  "compose", "--project-name", project, "--file", "tests/account-isolation/compose.yaml", ...args,
], { env: dockerEnv, encoding: "utf8" }).trim();

function jwt(role) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const data = encode({ alg: "HS256", typ: "JWT" }) + "." +
    encode({ role, iss: "supabase", exp: Math.floor(Date.now() / 1000) + 3600 });
  return data + "." + createHmac("sha256", secret).update(data).digest("base64url");
}

async function waitFor(url, processToWatch) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (processToWatch?.exitCode != null) throw new Error("Test application exited.");
    const ready = await new Promise((resolve) => {
      const probe = request(url, { timeout: 2000 }, (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      });
      probe.on("timeout", () => probe.destroy());
      probe.on("error", () => resolve(false));
      probe.end();
    });
    if (ready) return;
    await setTimeout(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

let web;
let authProxy;
try {
  compose("up", "--detach", "db", "auth");
  const slugMigration = readFileSync("prisma/migrations/0013_story_slugs/migration.sql", "utf8");
  compose("exec", "-T", "db", "psql", "-U", "postgres", "-d", "account_isolation", "-v", "ON_ERROR_STOP=1",
    "-c", `CREATE TEMP TABLE stories (id TEXT PRIMARY KEY, title TEXT NOT NULL);
           INSERT INTO stories VALUES ('a', 'Example'), ('b', 'Example'), ('c', 'Example 2');`,
    "-c", slugMigration,
    "-c", `DO $$ BEGIN
             IF (SELECT array_agg(slug ORDER BY id) FROM stories)
               IS DISTINCT FROM ARRAY['example', 'example-3', 'example-2'] THEN
               RAISE EXCEPTION 'Expected the migration to preserve natural slugs and skip occupied suffixes';
             END IF;
           END $$;`);
  const authAddress = compose("port", "auth", "9999");
  await waitFor(`http://${authAddress}/health`);
  // The SDK expects Supabase's gateway prefix. The standalone Auth image serves at root.
  authProxy = createServer((incoming, outgoing) => {
    const path = incoming.url?.replace(/^\/auth\/v1\b/u, "") ?? "/";
    const upstream = request(`http://${authAddress}${path}`, {
      method: incoming.method,
      headers: incoming.headers,
    }, (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    });
    upstream.on("error", () => outgoing.writeHead(502).end());
    incoming.pipe(upstream);
  });
  await new Promise((resolve) => authProxy.listen(0, "127.0.0.1", resolve));
  const dbAddress = compose("port", "db", "5432");
  const databaseUrl = `postgresql://postgres:account-test-only@${dbAddress}/account_isolation?schema=public`;
  const env = {
    ...process.env,
    NODE_ENV: "development",
    NEXT_TELEMETRY_DISABLED: "1",
    REQUIRE_AUTH: process.argv.includes("--local") ? "false" : "",
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    SUPABASE_URL: `http://127.0.0.1:${authProxy.address().port}`,
    SUPABASE_ANON_KEY: jwt("anon"),
    SUPABASE_SERVICE_ROLE_KEY: jwt("service_role"),
    ENABLE_EMBEDDINGS: "false",
    OPENROUTER_BASE_URL: "http://127.0.0.1:1",
    OPENROUTER_API_KEY: "test-only",
  };
  const node = (args) => execFileSync(process.execPath, args, { env, stdio: "inherit" });
  node(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  const port = await new Promise((resolve) => {
    const reservation = createServer().listen(0, "127.0.0.1", () => {
      const assigned = reservation.address().port;
      reservation.close(() => resolve(assigned));
    });
  });
  env.ACCOUNT_TEST_URL = `http://127.0.0.1:${port}`;
  web = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    { env, stdio: "inherit" });
  await waitFor(env.ACCOUNT_TEST_URL + "/login", web);
  // Keep the loopback proxy responsive while the integration process is running.
  const test = spawn(process.execPath, ["--import", "tsx", "tests/account-isolation/isolation.integration.ts"], { env, stdio: "inherit" });
  const status = await new Promise((resolve, reject) => {
    test.on("error", reject);
    test.on("exit", resolve);
  });
  if (status !== 0) process.exitCode = 1;
} finally {
  web?.kill();
  authProxy?.close();
  compose("down", "--volumes");
}
