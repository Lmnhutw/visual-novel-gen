import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const password = "auth-smoke-password";
const accounts = new Map();
const calls = [];
const user = {
  id: randomUUID(), aud: "authenticated", role: "authenticated", email: "reader@example.test",
  app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {},
  created_at: new Date().toISOString(), email_confirmed_at: new Date().toISOString(),
};

function session(account = user) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: account.id, aud: "authenticated", role: "authenticated", exp: now + 3600, iat: now,
  })}.${encode("test-signature")}`;
  return { access_token: token, refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 3600, user: account };
}

const auth = createServer(async (request, response) => {
  try {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : null;
    const url = new URL(request.url, "http://localhost");
    const path = url.pathname.replace(/^\/auth\/v1/u, "");
    calls.push({ method: request.method, path, body, grant: url.searchParams.get("grant_type") });
    response.setHeader("content-type", "application/json");
    const reply = (status, data) => response.writeHead(status).end(JSON.stringify(data));
    if (path === "/admin/users" && request.method === "POST") {
      if (accounts.has(body.email)) return reply(422, { code: "email_exists", msg: "User already registered" });
      const account = { ...user, email: body.email };
      accounts.set(body.email, { user: account, password: body.password });
      return reply(200, account);
    }
    if (path === "/token" && url.searchParams.get("grant_type") === "password") {
      const account = accounts.get(body.email);
      if (!account || account.password !== body.password || body.email === "login-fails@example.test") {
        return reply(400, { code: "invalid_credentials", msg: "Invalid login credentials" });
      }
      return reply(200, session(account.user));
    }
    if (path === "/token" && url.searchParams.get("grant_type") === "pkce") {
      if (body.auth_code !== "valid-code" || !body.code_verifier) {
        return reply(400, { code: "bad_code_verifier", msg: "Invalid authorization code" });
      }
      return reply(200, session());
    }
    if (path === "/verify") {
      if (body.token_hash !== "valid-token" || !["signup", "email"].includes(body.type)) {
        return reply(403, { code: "otp_expired", msg: "Token expired" });
      }
      return reply(200, session());
    }
    if (path === "/user") return reply(200, user);
    if (path === "/logout") return reply(204, null);
    return reply(404, { msg: `Unexpected fixture endpoint ${path}` });
  } catch {
    response.writeHead(500).end(JSON.stringify({ msg: "Fixture request failed" }));
  }
});

let web;
let output = "";
let baseUrl;

function cookieHeader(response) {
  return response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
}

function assertSessionCookies(response) {
  const cookies = response.headers.getSetCookie().filter((cookie) => /^vng-session(?:\.|=)/u.test(cookie));
  assert.ok(cookies.length, "Expected session cookies");
  assert.ok(cookies.every((cookie) => /; httponly/iu.test(cookie) && /; samesite=lax/iu.test(cookie)));
}

async function get(path, cookie) {
  return fetch(baseUrl + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
}

async function submitForm(path, fields = {}, index = 0, { origin = baseUrl, status = 303 } = {}) {
  const page = await get(path);
  assert.equal(page.status, 200, `GET ${path}`);
  const html = await page.text();
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gu)][index]?.[0];
  const action = form?.match(/name="(\$ACTION_ID_[^"]+)"/u)?.[1];
  assert.ok(action, `Expected form ${index} server action on ${path}`);
  const data = new FormData();
  data.set(action, "");
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  const response = await fetch(baseUrl + path, {
    method: "POST", body: data, headers: { origin }, redirect: "manual",
  });
  assert.equal(response.status, status, `POST ${path}`);
  return response;
}

function assertLocation(response, path) {
  assert.equal(new URL(response.headers.get("location"), baseUrl).href, baseUrl + path);
}

try {
  await new Promise((resolve) => auth.listen(0, "127.0.0.1", resolve));
  const authUrl = `http://127.0.0.1:${auth.address().port}`;
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  baseUrl = `http://127.0.0.1:${port}`;
  // Uses the normal .next directory; run separately from another dev server or build.
  web = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"], env: {
      ...process.env, NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1", REQUIRE_AUTH: "true",
      SUPABASE_URL: authUrl, NEXT_PUBLIC_SUPABASE_URL: authUrl,
      SUPABASE_ANON_KEY: "auth-smoke-anon", NEXT_PUBLIC_SUPABASE_ANON_KEY: "auth-smoke-anon",
      SUPABASE_SERVICE_ROLE_KEY: "auth-smoke-service-role", OPENROUTER_API_KEY: "test-only",
      OPENROUTER_BASE_URL: "http://127.0.0.1:1", ENABLE_EMBEDDINGS: "false",
      DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test", DIRECT_URL: "postgresql://test:test@127.0.0.1:1/test",
    },
  });
  for (const stream of [web.stdout, web.stderr]) stream.on("data", (chunk) => { output = (output + chunk).slice(-16000); });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (web.exitCode !== null) throw new Error(`Auth smoke server exited: ${web.exitCode}`);
    ready = await fetch(baseUrl + "/login", { signal: AbortSignal.timeout(2000) })
      .then(async (response) => { await response.text(); return response.status === 200; }).catch(() => false);
    if (ready) break;
    await delay(500);
  }
  assert.ok(ready, "Auth smoke server startup timed out");

  assert.match(await (await get("/login")).text(), /href="\/register"/u);
  assert.match(await (await get("/register")).text(), /href="\/login"/u);
  const beforeValidation = calls.length;
  for (const fields of [
    { email: "invalid", password, confirmPassword: password },
    { email: user.email, password: "short", confirmPassword: "short" },
  ]) assertLocation(await submitForm("/register", fields), "/register?error=credentials");
  assertLocation(await submitForm("/register", {
    email: user.email, password, confirmPassword: "different-password",
  }), "/register?error=password-mismatch");
  assert.equal(calls.length, beforeValidation, "Invalid registration must not reach Auth");
  await submitForm("/register", { email: user.email, password, confirmPassword: password }, 0,
    { origin: "https://example.com", status: 500 });
  assert.equal(calls.length, beforeValidation, "Cross-origin registration must not reach Auth");

  const registered = await submitForm("/register", { email: ` ${user.email} `, password, confirmPassword: password });
  assertLocation(registered, "/library");
  assertSessionCookies(registered);
  assert.deepEqual(calls.find((call) => call.path === "/admin/users")?.body,
    { email: user.email, password, email_confirm: true });
  assertLocation(await get("/register", cookieHeader(registered)), "/library");
  assertLocation(await submitForm("/register", { email: user.email, password, confirmPassword: password }), "/register?error=signup");
  const duplicateHtml = await (await get("/register?error=signup")).text();
  assert.doesNotMatch(duplicateHtml, /User already registered|auth-smoke-service-role|auth-smoke-password/u);
  assertLocation(await submitForm("/register", {
    email: "login-fails@example.test", password, confirmPassword: password,
  }), "/login?message=account-created");

  assertLocation(await submitForm("/login", { email: user.email, password: "wrong-password" }), "/login?error=credentials");
  const signedIn = await submitForm("/login", { email: user.email, password });
  assertLocation(signedIn, "/library");
  assertSessionCookies(signedIn);

  for (const path of ["/login", "/register"]) {
    const google = await submitForm(path, {}, 1);
    const location = new URL(google.headers.get("location"));
    assert.equal(location.origin, authUrl);
    assert.equal(location.pathname, "/auth/v1/authorize");
    assert.equal(location.searchParams.get("provider"), "google");
    assert.equal(location.searchParams.get("redirect_to"), baseUrl + "/auth/callback");
    assert.ok(location.searchParams.get("code_challenge"));
    const cookie = cookieHeader(google);
    assert.match(cookie, /vng-session-code-verifier=/u);
    const callback = await get("/auth/callback?code=valid-code&next=https://example.com", cookie);
    assertLocation(callback, "/library");
    assertSessionCookies(callback);
    assert.match(callback.headers.get("cache-control") ?? "", /no-store/u);
    assertLocation(await get("/auth/callback?code=bad-code", cookie), "/login?error=confirmation");
  }
  assertLocation(await get("/auth/callback"), "/login?error=confirmation");
  const beforeMissingVerifier = calls.length;
  assertLocation(await get("/auth/callback?code=valid-code"), "/login?error=confirmation");
  assert.equal(calls.length, beforeMissingVerifier, "Callback without a PKCE cookie must not exchange its code");
  assertLocation(await get("/auth/callback?error=access_denied"), "/login?error=confirmation");
  for (const type of ["signup", "email"]) {
    const confirmed = await get(`/auth/confirm?token_hash=valid-token&type=${type}&next=https://example.com`);
    assertLocation(confirmed, "/library");
    assertSessionCookies(confirmed);
    assert.match(confirmed.headers.get("cache-control") ?? "", /no-store/u);
  }
  assertLocation(await get("/auth/confirm?token_hash=expired&type=signup"), "/login?error=confirmation");
  assertLocation(await get("/auth/confirm?token_hash=valid-token&type=recovery"), "/login?error=confirmation");
  assertLocation(await get("/auth/confirm"), "/login?error=confirmation");
  console.log("Registration, sign-in, Google PKCE, confirmation and safe redirects passed against loopback Auth.");
} catch (error) {
  if (output) console.error(output);
  throw error;
} finally {
  let stillListening = false;
  if (web && web.exitCode === null) {
    const exited = once(web, "exit");
    const killTimer = setTimeout(() => web.kill("SIGKILL"), 5000);
    if (process.platform === "win32") {
      // The Next CLI owns a worker process; terminate only this fixture's process tree.
      const cleanup = spawn("taskkill", ["/PID", String(web.pid), "/T", "/F"], { stdio: "ignore" });
      await new Promise((resolve) => {
        cleanup.once("exit", resolve);
        cleanup.once("error", () => { web.kill(); resolve(); });
      });
    } else web.kill();
    await exited;
    clearTimeout(killTimer);
    stillListening = await fetch(baseUrl + "/login", { signal: AbortSignal.timeout(1000) })
      .then(() => true).catch(() => false);
  }
  auth.closeAllConnections();
  await new Promise((resolve) => auth.close(resolve));
  assert.equal(stillListening, false, "Fixture Next server must stop during cleanup");
}
