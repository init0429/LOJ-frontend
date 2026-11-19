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

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const LANGUAGES = {
  LANGUAGE_LABELS: { python: "Python 3", cpp: "C++", sql: "SQL (SQLite)", java: "Java" },
  STARTER_CODE: { python: "# start", cpp: "// start", sql: "SELECT 1;", java: "class Main {}" },
};

test("function drafts are kept apart and program drafts keep their old key", () => {
  const localStorage = memoryStorage();
  const drafts = load("../src/lib/drafts.ts", { localStorage, require: () => LANGUAGES });
  drafts.saveDraft(7, "python", "print(1)");
  assert.equal(localStorage.data.get("loj-draft:7:python"), "print(1)");
  const starter = "class Solution:\n    pass\n";
  assert.equal(drafts.loadDraft(7, "python", "function", starter), starter);
  drafts.saveDraft(7, "python", "class Solution: ...", "function", starter);
  assert.equal(localStorage.data.get("loj-draft:7:python:function"), "class Solution: ...");
  assert.equal(drafts.loadDraft(7, "python"), "print(1)");
  // 손대지 않은 함수 구현 시작 코드는 남기지 않는다.
  drafts.saveDraft(7, "python", starter, "function", starter);
  assert.equal(localStorage.data.has("loj-draft:7:python:function"), false);
});

test("the last mode is remembered per problem", () => {
  const localStorage = memoryStorage();
  const drafts = load("../src/lib/drafts.ts", { localStorage, require: () => LANGUAGES });
  assert.equal(drafts.loadMode(7), null);
  drafts.saveMode(7, "program");
  assert.equal(drafts.loadMode(7), "program");
  assert.equal(drafts.loadMode(8), null);
  localStorage.setItem("loj-mode:8", "class");
  assert.equal(drafts.loadMode(8), null);
});

test("the default code mode is a validated preference", () => {
  const prefs = load("../src/lib/preferences.ts");
  assert.equal(prefs.DEFAULT_PREFERENCES.codeMode, "function");
  assert.equal(prefs.parsePreferences(JSON.stringify({ codeMode: "program" })).codeMode, "program");
  assert.equal(prefs.parsePreferences(JSON.stringify({ codeMode: "class" })).codeMode, "function");
  assert.deepEqual(plain(prefs.compactPreferences(prefs.parsePreferences(JSON.stringify({ codeMode: "program" })))), {
    codeMode: "program",
  });
});

function codeMode(getTemplates = async () => ({})) {
  return load("../src/lib/code-mode.ts", {
    require: (name) => (name === "./languages" ? LANGUAGES : { getTemplates }),
  });
}

const TEMPLATES = {
  signature: TWO_SUM,
  starters: { java: "class Solution {}", python: "class Solution:\n    pass\n" },
  examples: [{ id: 4, input: "nums = [1]", output: "0" }],
};

test("function mode offers only languages with a starter and falls back to Python", () => {
  const cm = codeMode();
  assert.deepEqual(plain(cm.modeLanguages("program", TEMPLATES)), ["python", "cpp", "sql", "java"]);
  assert.deepEqual(plain(cm.modeLanguages("function", TEMPLATES)), ["python", "java"]);
  assert.deepEqual(plain(cm.modeLanguages("function", null)), ["python", "cpp", "sql", "java"]);
  assert.equal(cm.languageFor("function", TEMPLATES, "sql"), "python");
  assert.equal(cm.languageFor("function", TEMPLATES, "java"), "java");
  assert.equal(cm.languageFor("function", { ...TEMPLATES, starters: { java: "x" } }, "sql"), "java");
  assert.equal(cm.starterCode("java", "function", TEMPLATES), "class Solution {}");
  assert.equal(cm.starterCode("java", "program", TEMPLATES), "class Main {}");
});

test("untouched code is any starter of either mode", () => {
  const cm = codeMode();
  for (const code of ["", "  \n", "# start", "SELECT 1;", "class Solution {}"]) {
    assert.equal(cm.isUntouchedStarter(code, TEMPLATES), true, code);
  }
  assert.equal(cm.isUntouchedStarter("class Solution {}", null), false);
  assert.equal(cm.isUntouchedStarter("print(1)", TEMPLATES), false);
  assert.equal(cm.exampleViews(TEMPLATES).get(4).input, "nums = [1]");
  assert.equal(cm.exampleViews(null).size, 0);
});

test("templates are asked for only when the problem has a signature", async () => {
  const asked = [];
  const cm = codeMode(async (id) => {
    asked.push(id);
    return id === 1 ? TEMPLATES : id === 2 ? { signature: null, starters: {}, examples: [] } : Promise.reject(new Error("down"));
  });
  assert.deepEqual(plain(await cm.loadFunctionTemplates({ id: 9, signature: null })), { templates: null, failed: false });
  assert.deepEqual(asked, []);
  assert.equal((await cm.loadFunctionTemplates({ id: 1, signature: TWO_SUM })).templates.signature.function, "twoSum");
  assert.deepEqual(plain(await cm.loadFunctionTemplates({ id: 2, signature: TWO_SUM })), { templates: null, failed: false });
  assert.deepEqual(plain(await cm.loadFunctionTemplates({ id: 3, signature: TWO_SUM })), { templates: null, failed: true });
});
