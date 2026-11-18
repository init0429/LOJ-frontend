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
  vm.runInNewContext(compiled, { exports, require: () => ({}), ...context });
  return exports;
}

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
  LANGUAGE_LABELS: { python: "Python 3", cpp: "C++" },
  STARTER_CODE: { python: "# start", cpp: "// start" },
};

test("drafts are kept per problem and language, and untouched starters are not stored", () => {
  const localStorage = memoryStorage();
  const drafts = load("drafts.ts", { localStorage, require: () => LANGUAGES });
  assert.equal(drafts.loadDraft(1, "python"), "# start");
  drafts.saveDraft(1, "python", "print(3)");
  assert.equal(drafts.loadDraft(1, "python"), "print(3)");
  assert.equal(drafts.loadDraft(2, "python"), "# start");
  assert.equal(drafts.loadDraft(1, "cpp"), "// start");
  drafts.saveDraft(1, "python", "# start");
  assert.equal(localStorage.data.size, 0);
});

test("the last language is remembered and unknown ones are ignored", () => {
  const localStorage = memoryStorage();
  const drafts = load("drafts.ts", { localStorage, require: () => LANGUAGES });
  assert.equal(drafts.loadLanguage(), "python");
  drafts.saveLanguage("cpp");
  assert.equal(drafts.loadLanguage(), "cpp");
  localStorage.setItem("loj-language", "cobol");
  assert.equal(drafts.loadLanguage(), "python");
});

test("drafts survive a browser that blocks storage", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
  const drafts = load("drafts.ts", { localStorage: blocked, require: () => LANGUAGES });
  drafts.saveDraft(1, "python", "x");
  assert.equal(drafts.loadDraft(1, "python"), "# start");
  assert.equal(drafts.loadLanguage(), "python");
});

test("standing cells count misses before the first accept only", () => {
  const { buildCells } = load("contest-ranking.ts");
  const at = (minute) => new Date(Date.UTC(2026, 10, 18, 9, minute)).toISOString();
  const cells = buildCells([
    { user_id: "a", problem_id: 1, status: "Accepted", created_at: at(30) },
    { user_id: "a", problem_id: 1, status: "Wrong Answer", created_at: at(10) },
    { user_id: "a", problem_id: 1, status: "Wrong Answer", created_at: at(40) },
    { user_id: "a", problem_id: 2, status: "System Error", created_at: at(5) },
    { user_id: "a", problem_id: 2, status: "Time Limit Exceeded", created_at: at(6) },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(cells.get("a:1"))), { solvedAt: Date.parse(at(30)), misses: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(cells.get("a:2"))), { solvedAt: null, misses: 1 });
});
