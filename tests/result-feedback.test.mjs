import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(file) {
  const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: () => ({}) });
  return exports;
}

// vm 안에서 만든 값은 프로토타입이 달라 deepEqual이 실패하므로 JSON으로 꺼낸다.
const plain = (value) => JSON.parse(JSON.stringify(value));
const { compareOutputs, describeDifference } = load("lib/output-diff.ts");
const { parseFeedback } = load("lib/submission-feedback.ts");

test("outputs are compared like the judge compares them", () => {
  const diff = compareOutputs("1 2  \r\n3\n\n", "\n1 2\n3");
  assert.equal(diff.firstDifference, null);
  assert.equal(describeDifference(diff), "");
});

test("the first differing line is found and marked on both sides", () => {
  const diff = plain(compareOutputs("1\n5\n3", "1\n2\n3"));
  assert.equal(diff.firstDifference, 2);
  assert.deepEqual(diff.actual.map((line) => line.same), [true, false, true]);
  assert.deepEqual(diff.expected.map((line) => line.same), [true, false, true]);
  assert.equal(describeDifference(compareOutputs("1\n5\n3", "1\n2\n3")), "2번째 줄부터 다릅니다.");
});

test("missing and extra lines are explained", () => {
  assert.equal(describeDifference(compareOutputs("", "1")), "출력이 없습니다.");
  assert.equal(describeDifference(compareOutputs("1", "1\n2\n3")), "내 출력은 1줄에서 끝났습니다. 기대한 출력은 3줄입니다.");
  assert.equal(describeDifference(compareOutputs("1\n2", "1")), "기대한 출력은 1줄인데 내 출력은 2줄입니다.");
  const extra = plain(compareOutputs("1\n2", "1"));
  assert.deepEqual(extra.actual.map((line) => line.same), [true, false]);
});

test("submission feedback is read only when it has the expected shape", () => {
  assert.equal(parseFeedback(null), null);
  assert.equal(parseFeedback({ passed: "1", total: 2 }), null);
  assert.deepEqual(plain(parseFeedback({ passed: 3, total: 3 })), { passed: 3, total: 3 });
  assert.deepEqual(plain(parseFeedback({ passed: 0, total: 1, message: "main.c:1: error" })), {
    passed: 0, total: 1, message: "main.c:1: error",
  });
  assert.deepEqual(
    plain(parseFeedback({ passed: 1, total: 5, failed_test: 2, example: { input: "1", expected: "2", actual: "3" } })),
    { passed: 1, total: 5, failed_test: 2, example: { input: "1", expected: "2", actual: "3" } },
  );
  // 예제 칸이 깨져 있으면 버리고 몇 번째인지만 남긴다.
  assert.deepEqual(plain(parseFeedback({ passed: 1, total: 5, failed_test: 2, example: { input: 1 } })), {
    passed: 1, total: 5, failed_test: 2,
  });
});

test("crawlers only see the front page", () => {
  const { default: robots } = load("app/robots.ts");
  const { rules } = plain(robots());
  assert.equal(rules.userAgent, "*");
  for (const path of ["/problems", "/contests", "/leaderboard", "/admin", "/settings", "/api/"]) {
    assert.ok(rules.disallow.includes(path), path);
  }
  assert.ok(!rules.disallow.includes("/"));
});
