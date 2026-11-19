import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function compile(path) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

function load(path, context = {}) {
  const exports = {};
  vm.runInNewContext(compile(path), { exports, require: () => ({}), ...context });
  return exports;
}

// vm 안에서 만든 객체는 deepEqual에서 다른 realm으로 보이므로 JSON으로 한 번 옮긴다.
const plain = (value) => JSON.parse(JSON.stringify(value));

const sig = load("../src/lib/signature.ts");

test("only non-string arrays and nodes can be modified in place", () => {
  for (const type of ["int[]", "double[][]", "list<int>", "list<list<char>>", "ListNode", "TreeNode"]) {
    assert.equal(sig.canModifyInPlace(type), true, type);
  }
  for (const type of ["int", "string", "string[]", "list<string>", "list<list<string>>"]) {
    assert.equal(sig.canModifyInPlace(type), false, type);
  }
});

test("type choices cover every type the backend accepts", () => {
  const types = sig.TYPE_GROUPS.flatMap((group) => group.types);
  assert.equal(new Set(types).size, types.length);
  assert.equal(types.length, 6 * 5 + 2);
  assert.ok(types.includes("list<list<bool>>"));
  assert.equal(sig.isKnownType("int [ ]"), false);
});

test("normalizing trims names and drops output_param unless void", () => {
  const draft = {
    function: " twoSum ",
    params: [{ name: " nums", type: "int[]" }, { name: "target ", type: "int" }],
    returns: "int[]",
    output_param: "nums",
  };
  assert.deepEqual(plain(sig.normalizeSignature(draft)), {
    function: "twoSum",
    params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }],
    returns: "int[]",
    output_param: null,
  });
  const inPlace = { ...draft, returns: "void", output_param: " nums " };
  assert.equal(sig.normalizeSignature(inPlace).output_param, "nums");
  assert.equal(sig.normalizeSignature({ ...inPlace, output_param: "  " }).output_param, null);
});

test("output candidates are named in-place parameters", () => {
  const draft = {
    function: "f",
    params: [
      { name: "nums", type: "int[]" },
      { name: "", type: "int[]" },
      { name: "words", type: "string[]" },
      { name: "head", type: "ListNode" },
    ],
    returns: "void",
    output_param: null,
  };
  assert.deepEqual(plain(sig.outputCandidates(draft)), ["nums", "head"]);
});

test("stored signatures are read defensively", () => {
  const stored = { function: "maxDepth", params: [{ name: "root", type: "TreeNode" }], returns: "int" };
  assert.deepEqual(plain(sig.parseStoredSignature(stored)), { ...stored, output_param: null });
  for (const raw of [null, "x", [], { function: "f", params: "nope", returns: "int" }, { function: "f", params: [{ name: 1 }], returns: "int" }]) {
    assert.equal(sig.parseStoredSignature(raw), null, JSON.stringify(raw));
  }
  assert.equal(
    sig.signatureLine({ function: "rotate", params: [{ name: "nums", type: "int[]" }], returns: "void", output_param: "nums" }),
    "rotate(nums: int[]) → void (nums를 제자리에서 고침)",
  );
});

function api({ session = { access_token: "token" }, body = {}, ok = true, status = 200 } = {}) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(compile("../src/lib/function-api.ts"), {
    exports,
    require: () => ({ supabase: { auth: { getSession: async () => ({ data: { session }, error: null }) } } }),
    process: { env: { NEXT_PUBLIC_API_URL: "https://judge.example/" } },
    fetch: async (...args) => {
      calls.push(args);
      return { ok, status, json: async () => body };
    },
  });
  return { api: exports, calls };
}

const TWO_SUM = { function: "twoSum", params: [{ name: "nums", type: "int[]" }], returns: "int", output_param: null };

test("preview sends the signature and tests with the admin's token", async () => {
  const body = { signature: TWO_SUM, starters: { python: "class Solution:" }, tests: [] };
  const { api: fn, calls } = api({ body });
  assert.deepEqual(plain(await fn.previewSignature(TWO_SUM, [{ input: "1\n2", output: "2" }])), body);
  assert.equal(calls[0][0], "https://judge.example/signature/preview");
  assert.equal(calls[0][1].headers.Authorization, "Bearer token");
  assert.deepEqual(JSON.parse(calls[0][1].body), { signature: TWO_SUM, tests: [{ input: "1\n2", output: "2" }] });
});

test("signature errors from the backend are shown as they are", async () => {
  const { api: fn } = api({ ok: false, status: 422, body: { detail: "알 수 없는 자료형입니다: map" } });
  await assert.rejects(fn.previewSignature(TWO_SUM), /알 수 없는 자료형입니다: map/);
  const { api: down } = api({ ok: false, status: 502, body: {} });
  await assert.rejects(down.convertExample(TWO_SUM, "[1]", ""), /서버 통신 오류 \(502\)/);
});

test("admin tools need a session", async () => {
  const { api: fn, calls } = api({ session: null });
  await assert.rejects(fn.convertExample(TWO_SUM, "[1]", ""), /로그인이 필요합니다/);
  assert.equal(calls.length, 0);
});

test("converted examples keep a missing output as null", async () => {
  const { api: fn, calls } = api({ body: { input: "1\n5\n", output: null } });
  assert.deepEqual(plain(await fn.convertExample(TWO_SUM, "nums = [5]", "")), { input: "1\n5\n", output: null });
  assert.deepEqual(JSON.parse(calls[0][1].body), { signature: TWO_SUM, input: "nums = [5]", output: "" });
});

test("templates are public and validated", async () => {
  const body = { signature: null, starters: {}, examples: [] };
  const { api: fn, calls } = api({ session: null, body });
  assert.deepEqual(plain(await fn.getTemplates(12)), body);
  assert.equal(calls[0][0], "https://judge.example/problems/12/templates");
  assert.equal(calls[0][1], undefined);
  const { api: broken } = api({ body: { signature: null } });
  await assert.rejects(broken.getTemplates(12), /시작 코드를 받지 못했습니다/);
});
