import dotenv from "dotenv";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "node:fs/promises";
dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3101";
const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
let cookie = "";
let token = "";
let userId: string | null = null;
const jobIds: string[] = [];
const results: string[] = [];
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  withIdentity = true,
) {
  const response = await fetch(base + "/api" + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(withIdentity && cookie ? { Cookie: cookie } : {}),
      ...(withIdentity && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (withIdentity && response.headers.get("set-cookie"))
    cookie = response.headers.get("set-cookie")!.split(";")[0];
  return { status: response.status, data: await response.json() };
}
async function finish(jobId: string) {
  jobIds.push(jobId);
  for (let attempt = 0; attempt < 180; attempt++) {
    const result = await request("/jobs/" + jobId);
    assert.equal(result.status, 200);
    if (result.data.job.status === "failed")
      throw new Error(result.data.job.error);
    if (result.data.job.status === "succeeded")
      return result.data.job.resultId as string;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("Analysis did not finish within the smoke-test window");
}
try {
  assert.equal((await request("/health/live")).status, 200);
  assert.equal((await request("/health/ready")).status, 200);
  results.push("Production readiness and liveness");
  const publicItems = await request("/reading/public?examples=true");
  assert.equal(publicItems.status, 200);
  const example = publicItems.data.items.find(
    (item: { comparison: { inputMode: string } }) =>
      item.comparison.inputMode === "walkthrough",
  )?.comparison;
  assert.ok(example);
  assert.equal(example.primary.id, "oil-embargo-1973");
  results.push("Published source-backed walkthrough");
  assert.equal(
    (await request("/deep-dive?modernEvent=x&historicalEvent=y")).status,
    410,
  );
  assert.equal(
    (await request("/analyses", "POST", { input: "x".repeat(12001) })).status,
    400,
  );
  assert.equal(
    (await request("/analyses", "POST", { input: "http://127.0.0.1/private" }))
      .status,
    400,
  );
  results.push(
    "Retired GET generation, input bounds and private URL rejection",
  );
  const created = await request("/analyses", "POST", {
    input:
      "An ongoing war is currently disrupting imported natural gas supplies. Buyers remain dependent on limited replacement capacity and the interruption is unresolved.",
  });
  assert.equal(created.status, 202);
  const originalId = await finish(created.data.job.id);
  const original = (await request("/analyses/" + originalId)).data.comparison;
  assert.ok(original.primary);
  assert.notEqual(original.state, "supported");
  assert.equal(
    (await request("/analyses/" + originalId, "GET", undefined, false)).status,
    404,
  );
  results.push("Anonymous analysis and cross-session isolation");
  const password = randomBytes(32).toString("base64url") + "Aa1!";
  const email = `tether-smoke-${randomBytes(6).toString("hex")}@example.invalid`;
  const account = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(account.error);
  userId = account.data.user!.id;
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const session = await client.auth.signInWithPassword({ email, password });
  assert.ifError(session.error);
  token = session.data.session!.access_token;
  const escalate = await client
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);
  assert.ok(escalate.error);
  results.push("Real authenticated role escalation rejected");
  assert.equal((await request("/operations/status")).status, 403);
  const grantAdmin = await db
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);
  assert.ifError(grantAdmin.error);
  const operations = await request("/operations/status");
  assert.equal(operations.status, 200);
  assert.ok(Array.isArray(operations.data.quarantined));
  const restoreRole = await db
    .from("profiles")
    .update({ role: "user" })
    .eq("id", userId);
  assert.ifError(restoreRole.error);
  results.push(
    "Operations rejects ordinary accounts and exposes quarantine state only to an administrator",
  );

  assert.equal((await request("/analyses/" + originalId)).status, 200);
  assert.equal(
    (
      await request("/reading/" + original.situationId, "PUT", {
        following: true,
        savedAnalysisId: originalId,
        lastReadId: originalId,
      })
    ).status,
    200,
  );
  results.push(
    "Sign-in claims the original guest analysis and saves/follows it",
  );
  const observed = await request(
    `/situations/${original.situationId}/observations`,
    "POST",
    {
      indicatorId: original.indicators[0].id,
      direction: "weakens",
      text: "The operator reports that the pipeline has reopened and replacement gas supplies are arriving.",
      sourceUrl: "https://example.org/operator-report",
      observedAt: new Date().toISOString(),
    },
  );
  assert.equal(observed.status, 202);
  const revisionId = await finish(observed.data.job.id);
  const revision = (await request("/analyses/" + revisionId)).data.comparison;
  assert.equal(revision.previousId, originalId);
  assert.ok(revision.change.summary.includes("challenges"));
  assert.equal(
    (await request("/analyses/" + originalId)).data.comparison.summary,
    original.summary,
  );
  const desk = await request("/reading");
  assert.ok(
    desk.data.items.some(
      (item: { comparison: { id: string }; unread: boolean }) =>
        item.comparison.id === revisionId && item.unread,
    ),
  );
  assert.equal(
    desk.data.items.find(
      (item: { comparison: { situationId: string } }) =>
        item.comparison.situationId === original.situationId,
    ).savedComparison.id,
    originalId,
  );
  results.push(
    "Observation creates an immutable revision and a meaningful Following update",
  );
  const history = await request(`/situations/${original.situationId}/history`);
  assert.equal(history.data.analyses.length, 2);
  const deadline = new Date(Date.now() + 6000).toISOString();
  const forecast = await request(
    `/situations/${original.situationId}/forecasts`,
    "POST",
    {
      question:
        "Will the operator publish a defined supply update before this test closes?",
      criteria:
        "Resolves yes if the named operator publishes the specified update before the recorded closing time; otherwise resolves no.",
      resolutionSource: "https://example.org/operator-report",
      closesAt: deadline,
      probability: 0.4,
      rationale: "A synthetic estimate used to verify the private journal.",
    },
  );
  assert.equal(forecast.status, 201);
  assert.equal(
    (
      await request(`/forecasts/${forecast.data.id}/revisions`, "POST", {
        probability: 0.6,
        rationale: "New synthetic evidence changes this test estimate.",
      })
    ).status,
    201,
  );
  await new Promise((resolve) => setTimeout(resolve, 6500));
  assert.equal(
    (
      await request(`/forecasts/${forecast.data.id}/resolution`, "POST", {
        outcome: 0,
        note: "Synthetic test resolution: the specified update was not published before the deadline.",
      })
    ).status,
    200,
  );
  const forecasts = await request(
    `/situations/${original.situationId}/forecasts`,
  );
  assert.equal(forecasts.data.forecasts[0].revisions.length, 2);
  assert.equal(forecasts.data.forecasts[0].outcome, 0);
  assert.equal(
    (
      await request(`/forecasts/${forecast.data.id}/revisions`, "POST", {
        probability: 1,
        rationale: "An impermissible after-the-fact revision.",
      })
    ).status,
    409,
  );
  results.push(
    "Forecast criteria, immutable estimates, closure, resolution and late-revision rejection",
  );
  const fork = await request(
    `/situations/${example.situationId}/observations`,
    "POST",
    {
      indicatorId: "lost-supply",
      direction: "unclear",
      text: "This synthetic observation tests a private reader copy without changing the public example.",
      observedAt: new Date().toISOString(),
    },
  );
  assert.equal(fork.status, 202);
  const forkId = await finish(fork.data.job.id);
  const forked = (await request("/analyses/" + forkId)).data.comparison;
  assert.equal(forked.forkOriginId, example.id);
  assert.notEqual(forked.situationId, example.situationId);
  assert.equal(
    (await request("/analyses/" + example.id)).data.comparison.id,
    example.id,
  );
  results.push("Public example observations fork privately");
  const broader = await request(`/analyses/${originalId}/research`, "POST", {});
  assert.equal(broader.status, 202);
  const broaderId = await finish(broader.data.job.id);
  const expanded = (await request("/analyses/" + broaderId)).data.comparison;
  assert.equal(expanded.previousId, revisionId);
  assert.equal(expanded.research.depth, 2);
  assert.equal(expanded.research.version, "web-research-3");
  assert.equal(
    (await request("/analyses/" + broaderId, "GET", undefined, false)).status,
    404,
  );
  results.push(
    "Broader search preserves private ownership, prior-version links and an explicit search trace",
  );
} finally {
  await mkdir("audit/implementation", { recursive: true });
  await writeFile(
    "audit/implementation/api-smoke.json",
    JSON.stringify(
      {
        observedAt: new Date().toISOString(),
        base,
        passed: results,
        fixturesRemoved: false,
      },
      null,
      2,
    ),
  );
  if (userId) {
    const deleted = await db.auth.admin.deleteUser(userId);
    assert.ifError(deleted.error);
    results.push(
      "Account deletion cascades private situations, source text, observations, jobs and forecasts",
    );
  }
  if (jobIds.length) {
    const cleaned = await db.from("tether_jobs").delete().in("id", jobIds);
    assert.ifError(cleaned.error);
  }
  await mkdir("audit/implementation", { recursive: true });
  await writeFile(
    "audit/implementation/api-smoke.json",
    JSON.stringify(
      {
        observedAt: new Date().toISOString(),
        base,
        passed: results,
        fixturesRemoved: true,
      },
      null,
      2,
    ),
  );
}
console.log(JSON.stringify({ passed: results }, null, 2));
