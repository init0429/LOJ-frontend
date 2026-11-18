import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(file, context = {}) {
  const source = readFileSync(new URL(`../src/lib/${file}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, ...context });
  return exports;
}

test("tier numbers map to solved.ac tier names", () => {
  const { tierName } = load("solvedac-tier.ts");
  assert.equal(tierName(0), "Unrated");
  assert.equal(tierName(1), "Bronze V");
  assert.equal(tierName(5), "Bronze I");
  assert.equal(tierName(6), "Silver V");
  assert.equal(tierName(13), "Gold III");
  assert.equal(tierName(30), "Ruby I");
  assert.equal(tierName(31), "Master");
  assert.equal(tierName(null), "알 수 없음");
  assert.equal(tierName(2.5), "알 수 없음");
});

function setupApi({ session = { access_token: "test-token" }, body = {}, ok = true, status = 200 } = {}) {
  const calls = [];
  const api = load("solvedac-api.ts", {
    require: () => ({ supabase: { auth: { getSession: async () => ({ data: { session }, error: null }) } } }),
    process: { env: { NEXT_PUBLIC_API_URL: "https://loj.example/api/" } },
    fetch: async (...args) => {
      calls.push(args);
      return { ok, status, json: async () => body };
    },
  });
  return { api, calls };
}

test("linking starts with the login token and accepts the browser cookie", async () => {
  const url = "https://solved.ac/oauth/authorize?state=s";
  const { api, calls } = setupApi({ body: { authorize_url: url } });
  assert.equal(await api.startSolvedacLink(), url);
  assert.equal(calls[0][0], "https://loj.example/api/integrations/solvedac/start");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].headers.Authorization, "Bearer test-token");
  assert.equal(calls[0][1].credentials, "include");
});

test("only https authorize URLs are followed", async () => {
  const { api } = setupApi({ body: { authorize_url: "javascript:alert(1)" } });
  await assert.rejects(api.startSolvedacLink());
});

test("signed-out users never call the API", async () => {
  const { api, calls } = setupApi({ session: null });
  await assert.rejects(api.getSolvedacStatus());
  assert.equal(calls.length, 0);
});

test("API error details are shown", async () => {
  const { api } = setupApi({ ok: false, status: 503, body: { detail: "solved.ac 연동이 아직 설정되지 않았습니다." } });
  await assert.rejects(api.startSolvedacLink(), { message: "solved.ac 연동이 아직 설정되지 않았습니다." });
});

test("unlink sends DELETE", async () => {
  const { api, calls } = setupApi({ body: { linked: false } });
  await api.unlinkSolvedac();
  assert.equal(calls[0][0], "https://loj.example/api/integrations/solvedac");
  assert.equal(calls[0][1].method, "DELETE");
});
