import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/problem-label.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const lib = {};
vm.runInNewContext(compiled, { exports: lib });
const plain = (value) => JSON.parse(JSON.stringify(value));

test("contest-only problems are named without their temporary number", () => {
  assert.equal(lib.problemLabel({ id: 3, title: "피보나치 수" }), "3번 “피보나치 수”");
  assert.equal(lib.problemLabel({ id: 3, title: "피보나치 수", contest_only: false }), "3번 “피보나치 수”");
  assert.equal(lib.problemLabel({ id: 1000000001, title: "보물 지도", contest_only: true }), "대회 전용 “보물 지도”");
});

test("the contest picker hides contest-only problems already used by another contest", () => {
  const problems = [
    { id: 1, title: "A+B" },
    { id: 2, title: "대회에 쓴 공개 문제" },
    { id: 1000000001, title: "다른 대회 전용", contest_only: true },
    { id: 1000000002, title: "아직 대회 없음", contest_only: true },
  ];
  assert.deepEqual(plain(lib.pickableProblems(problems, [2, 1000000001]).map((p) => p.id)), [1, 2, 1000000002]);
  assert.deepEqual(plain(lib.pickableProblems(problems, new Set()).map((p) => p.id)), [1, 2, 1000000001, 1000000002]);
});
