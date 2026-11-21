import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db/prisma";

const run = promisify(execFile);
const baseUrl = process.env.ACCOUNT_TEST_URL!;
const authUrl = process.env.SUPABASE_URL!;
const localMode = process.env.REQUIRE_AUTH === "false";
const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(authUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, authOptions);

async function createAccount() {
  const email = `${randomUUID()}@example.com`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error);
  assert.ok(data.user);
  const auth = createClient(authUrl, process.env.SUPABASE_ANON_KEY!, authOptions);
  const login = await auth.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);
  assert.ok(login.data.session);
  return { id: data.user.id, email, password, token: login.data.session.access_token };
}

async function request(path: string, status: number, options?: {
  token?: string;
  cookie?: string;
  method?: string;
  body?: object;
  origin?: string;
}) {
  const headers = new Headers();
  if (options?.token) headers.set("authorization", `Bearer ${options.token}`);
  if (options?.cookie) headers.set("cookie", options.cookie);
  if (options?.origin) headers.set("origin", options.origin);
  if (options?.body) headers.set("content-type", "application/json");
  const response = await fetch(baseUrl + path, {
    redirect: "manual",
    method: options?.method,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers,
  });
  assert.equal(response.status, status, `${options?.method ?? "GET"} ${path}`);
  return response;
}

async function submitForm(path: string, fields: Record<string, string>, cookie?: string) {
  const page = await request(path, 200, { cookie });
  const html = await page.text();
  const action = html.match(/name="(\$ACTION_ID_[^"]+)"/u)?.[1];
  assert.ok(action, `Expected a server action on ${path}`);
  const data = new FormData();
  data.set(action, "");
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  const headers = new Headers({ origin: baseUrl });
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(baseUrl + path, { method: "POST", body: data, headers, redirect: "manual" });
  assert.equal(response.status, 303, `POST form ${path}`);
  return response;
}

async function browserLogin(account: Awaited<ReturnType<typeof createAccount>>) {
  const response = await submitForm("/login", { email: account.email, password: account.password });
  assert.equal(response.headers.get("location"), "/library");
  const cookies = response.headers.getSetCookie();
  assert.ok(cookies.length);
  assert.ok(cookies.every((cookie) => /; httponly/iu.test(cookie) && /; samesite=lax/iu.test(cookie)));
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

try {
  const [alice, bob] = await Promise.all([createAccount(), createAccount()]);
  const legacy = await prisma.story.create({ data: { title: "Legacy manuscript", slug: "legacy-manuscript" } });
  const template = await prisma.characterTemplate.create({ data: { name: "Legacy template", ownerId: "local-workspace" } });
  const legacyAudit = await prisma.auditLog.create({ data: {
    storyId: legacy.id, action: "legacy.fixture", entityType: "story",
  } });
  const aStoryResponse = await request("/api/stories", 201, { token: alice.token, method: "POST", body: { title: "Alice manuscript" } });
  const { story: aStory } = await aStoryResponse.json();
  const bStoryResponse = await request("/api/stories", 201, { token: bob.token, method: "POST", body: { title: "Bob manuscript" } });
  const { story: bStory } = await bStoryResponse.json();
  assert.equal(aStory.ownerId, alice.id);
  assert.equal(bStory.ownerId, bob.id);

  const aChapter = await prisma.chapter.create({ data: { storyId: aStory.id, title: "Alice chapter", number: 1, content: "Alice private prose" } });
  const bChapter = await prisma.chapter.create({ data: { storyId: bStory.id, title: "Bob chapter", number: 1 } });
  const aCharacter = await prisma.character.create({ data: { storyId: aStory.id, name: "Alice character" } });
  const aFriend = await prisma.character.create({ data: { storyId: aStory.id, name: "Alice supporting character" } });
  const bCharacter = await prisma.character.create({ data: { storyId: bStory.id, name: "Bob character" } });
  // Simulate rows saved before story membership checks were enforced.
  const legacyRelationship = await prisma.relationship.create({ data: {
    storyId: aStory.id, characterAId: aCharacter.id, characterBId: bCharacter.id, type: "legacy",
  } });
  await prisma.scene.create({ data: {
    storyId: bStory.id, chapterId: aChapter.id, number: 1, content: "Mismatched legacy scene",
  } });
  const job = await prisma.generationJob.create({ data: { storyId: aStory.id, chapterId: aChapter.id, type: "scene" } });
  const audit = await prisma.auditLog.create({ data: { storyId: aStory.id, action: "test", entityType: "job", entityId: job.id } });
  assert.equal(audit.ownerId, alice.id);
  await prisma.memory.create({ data: { storyId: aStory.id, sourceType: "test", memoryType: "FACT", content: "Alice memory" } });
  for (const role of ["anon", "authenticated"]) {
    const [permission] = await prisma.$queryRaw<{ allowed: boolean }[]>`
      SELECT has_table_privilege(${role}, 'public.character_templates', 'SELECT')
        OR has_table_privilege(${role}, 'public.audit_logs', 'SELECT') AS allowed
    `;
    assert.equal(permission.allowed, false);
  }

  const aliceCookie = await browserLogin(alice);
  const bobCookie = await browserLogin(bob);
  const reader = `/library/story?story=${aStory.slug}&chapter=1`;
  const legacyReader = `/library/story?story=${aStory.id}&chapter=1`;
  await request(reader, localMode ? 404 : 307);
  const anonymous = await request("/api/stories", localMode ? 200 : 401);
  if (localMode) {
    const { stories } = await anonymous.json();
    assert.deepEqual(stories.map((story: { id: string }) => story.id), [legacy.id]);
    await request(`/api/chapters?storyId=${legacy.id}`, 200);
    await request(`/api/chapters?storyId=${aStory.id}`, 404);
    await request(`/api/characters/${aCharacter.id}`, 404);
  }
  await request("/api/stories", 401, { cookie: bobCookie, token: "invalid" });
  const aliceManuscript = await (await request(reader, 200, { cookie: aliceCookie })).text();
  assert.match(aliceManuscript, /Alice private prose/);
  assert.doesNotMatch(aliceManuscript, /Mismatched legacy scene/);
  assert.doesNotMatch(await (await request(reader, 404, { cookie: bobCookie })).text(), /Alice private prose/);
  assert.equal((await request(legacyReader, 307, { cookie: aliceCookie })).headers.get("location"), reader);
  await request(legacyReader, 404, { cookie: bobCookie });

  const aliceList = await (await request("/api/stories", 200, { token: alice.token })).json();
  const bobList = await (await request("/api/stories", 200, { token: bob.token })).json();
  assert.deepEqual(aliceList.stories.map((story: { id: string }) => story.id), [aStory.id]);
  assert.deepEqual(bobList.stories.map((story: { id: string }) => story.id), [bStory.id]);
  for (const [path, method, body] of [
    [`/api/stories/${aStory.id}`, "GET"],
    [`/api/stories/${aStory.id}`, "PATCH", { title: "Other title" }],
    [`/api/stories/${aStory.id}`, "DELETE"],
    [`/api/characters/${aCharacter.id}`, "GET"],
    [`/api/generation/jobs/${job.id}/run`, "POST"],
    [`/api/memories/search?storyId=${aStory.id}`, "GET"],
    ["/api/retrieval/context", "POST", { storyId: aStory.id }],
  ] as const) {
    await request(path, 404, { method, token: bob.token, body });
  }
  await request("/api/relationships", 404, { token: bob.token, method: "POST", body: {
    storyId: bStory.id, characterAId: bCharacter.id, characterBId: aCharacter.id, type: "ally",
  } });
  const { relationship } = await (await request("/api/relationships", 201, {
    token: alice.token, method: "POST",
    body: { storyId: aStory.id, characterAId: aCharacter.id, characterBId: aFriend.id, type: "ally" },
  })).json();
  const { story: storyDetail } = await (await request(`/api/stories/${aStory.id}`, 200, { token: alice.token })).json();
  assert.deepEqual(storyDetail.relationships.map((row: { id: string }) => row.id), [relationship.id]);
  const { context } = await (await request("/api/retrieval/context", 200, {
    token: alice.token, method: "POST", body: { storyId: aStory.id, chapterId: aChapter.id },
  })).json();
  assert.ok(context.relationships.some((row: { id: string }) => row.id === relationship.id));
  assert.doesNotMatch(JSON.stringify(context), /Bob character|Mismatched legacy scene/u);
  assert.doesNotMatch(JSON.stringify(context), new RegExp(legacyRelationship.id, "u"));
  const foreignScene = await prisma.scene.create({
    data: { storyId: bStory.id, chapterId: bChapter.id, number: 1 },
  });
  await request(`/api/relationships/${relationship.id}`, 404, {
    token: alice.token, method: "PATCH",
    body: { trust: 10, sceneId: foreignScene.id, changeSummary: "Invalid scene" },
  });
  assert.equal((await prisma.relationship.findUniqueOrThrow({ where: { id: relationship.id } })).trust, 0);
  await request(`/api/characters/${bCharacter.id}/state`, 404, {
    token: bob.token, method: "POST", body: { chapterId: aChapter.id },
  });
  await request(`/api/chapters/${bChapter.id}/revise`, 404, { token: bob.token, method: "POST", body: {
    storyId: aStory.id, goal: "Revise this fictional chapter", previousDraft: "draft", previewOnly: true,
  } });
  await request("/api/continuity/check", 404, { token: bob.token, method: "POST", body: {
    storyId: bStory.id, chapterId: aChapter.id, draft: "Bob's draft", useLlm: false,
  } });
  assert.equal((await prisma.generationJob.findUniqueOrThrow({ where: { id: job.id } })).status, "QUEUED");

  const transfer = (args: string[]) => run(process.execPath, [
    "--import", "tsx", "scripts/assign-legacy-account.ts", "--user-id", alice.id, ...args,
  ]);
  const { stdout: preview } = await transfer([]);
  assert.deepEqual(JSON.parse(preview.trim().split(/\r?\n/u).at(-1)!), { preview: true, stories: 1, templates: 1 });
  assert.equal((await prisma.story.findUniqueOrThrow({ where: { id: legacy.id } })).ownerId, null);
  await assert.rejects(transfer(["--apply", "--expect-stories", "0", "--expect-templates", "1"]));
  await transfer(["--apply", "--expect-stories", "1", "--expect-templates", "1"]);
  assert.equal((await prisma.auditLog.findUniqueOrThrow({ where: { id: legacyAudit.id } })).ownerId, alice.id);
  await request(`/api/stories/${legacy.id}`, 200, { token: alice.token });
  await request(`/api/stories/${legacy.id}`, 404, { token: bob.token });
  const ownTemplates = await (await request("/api/character-templates", 200, { token: alice.token })).json();
  const otherTemplates = await (await request("/api/character-templates", 200, { token: bob.token })).json();
  assert.deepEqual(ownTemplates.templates.map((row: { id: string }) => row.id), [template.id]);
  assert.deepEqual(otherTemplates.templates, []);
  await request(`/api/character-templates/${template.id}`, 404, { token: bob.token, method: "DELETE" });
  await request(`/api/stories/${legacy.id}`, 200, { cookie: aliceCookie });
  await request(`/api/stories/${legacy.id}`, 404, { cookie: bobCookie });

  await request(`/api/stories/${aStory.id}`, 200, { token: alice.token, method: "DELETE" });
  const retained = await prisma.auditLog.findUniqueOrThrow({ where: { id: audit.id } });
  assert.equal(retained.storyId, null);
  assert.equal(retained.ownerId, alice.id);
  const logout = await submitForm("/library", {}, aliceCookie);
  assert.equal(logout.headers.get("location"), "/login");
  assert.ok(logout.headers.getSetCookie().some((cookie) => /max-age=0/iu.test(cookie)));
  console.log("Reader, Bearer API isolation, database privileges and legacy transfer passed.");

  const cookieResponse = await request("/api/stories", 200, { cookie: bobCookie });
  assert.match(cookieResponse.headers.get("cache-control") ?? "", /no-store/u);
  const cookieList = await cookieResponse.json();
  assert.deepEqual(cookieList.stories.map((story: { id: string }) => story.id), [bStory.id]);
  await request("/api/stories", 403, {
    cookie: bobCookie, method: "POST", origin: "https://example.com", body: { title: "Wrong origin" },
  });
  const createdByCookie = await (await request("/api/stories", 201, {
    cookie: bobCookie, method: "POST", origin: baseUrl, body: { title: "Bob's new manuscript" },
  })).json();
  assert.equal(createdByCookie.story.ownerId, bob.id);
  console.log("Account isolation passed with two real local Supabase Auth accounts.");
} finally {
  await prisma.$disconnect();
}
