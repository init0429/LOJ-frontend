import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/judge-api.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup({ session = { access_token: "test-token" }, body = {}, ok = true, status = 200 } = {}) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: () => ({
      supabase: { auth: { getSession: async () => ({ data: { session }, error: null }) } },
    }),
    process: { env: { NEXT_PUBLIC_API_URL: "https://judge.example/" } },
    fetch: async (...args) => {
      calls.push(args);
      return { ok, status, json: async () => body };
    },
  });
  return { api: exports, calls };
}

const input = { problem_id: 1, language: "python", code: "print(1)" };

test("submission includes authentication and normalizes the base URL", async () => {
  const { api, calls } = setup({ body: { submission_id: "submission-1" } });
  assert.equal(await api.submitCode(input), "submission-1");
  assert.equal(calls[0][0], "https://judge.example/submit");
  assert.equal(calls[0][1].headers.Authorization, "Bearer test-token");
  assert.deepEqual(JSON.parse(calls[0][1].body), input);
});

test("unauthenticated requests never reach the judge", async () => {
  const { api, calls } = setup({ session: null });
  await assert.rejects(api.submitCode(input));
  assert.equal(calls.length, 0);
});

test("HTTP 200 application errors are not accepted as submissions", async () => {
  const { api } = setup({ body: { status: "error", message: "queue unavailable" } });
  await assert.rejects(api.submitCode(input), { message: "queue unavailable" });
});

test("FastAPI error details are preserved", async () => {
  const { api } = setup({ ok: false, status: 401, body: { detail: "expired token" } });
  await assert.rejects(api.testCode(input), { message: "expired token" });
});

test("missing submission IDs and test results are rejected", async () => {
  const { api } = setup();
  await assert.rejects(api.submitCode(input));
  await assert.rejects(api.testCode(input));
});

test("valid test results are returned", async () => {
  const result = { status: "Accepted", test_cases: [] };
  const { api } = setup({ body: { status: "success", result } });
  assert.deepEqual(await api.testCode(input), result);
});
