import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/contest-ranking.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports });
// vm 안에서 만든 값은 프로토타입이 달라 deepEqual이 실패하므로 JSON으로 꺼낸다.
const rank = (...args) => JSON.parse(JSON.stringify(exports.rankParticipants(...args)));

const at = (minute) => new Date(Date.UTC(2026, 10, 17, 9, minute)).toISOString();
const sub = (user_id, problem_id, status, minute) => ({ user_id, problem_id, status, created_at: at(minute) });

test("more solved problems rank first", () => {
  const result = rank([sub("a", 1, "Accepted", 5), sub("b", 1, "Accepted", 1), sub("b", 2, "Accepted", 50)], [1, 2]);
  assert.deepEqual(result.map((r) => [r.user_id, r.rank, r.solved]), [["b", 1, 2], ["a", 2, 1]]);
});

test("equal counts are broken by who finished earlier", () => {
  const result = rank([
    sub("slow", 1, "Accepted", 10), sub("slow", 2, "Accepted", 40),
    sub("fast", 2, "Accepted", 15), sub("fast", 1, "Accepted", 30),
  ], [1, 2]);
  assert.deepEqual(result.map((r) => [r.user_id, r.rank]), [["fast", 1], ["slow", 2]]);
});

test("only the first accepted submission of a problem counts", () => {
  const result = rank([
    sub("a", 1, "Accepted", 5), sub("a", 1, "Accepted", 90),
    sub("b", 1, "Accepted", 20),
  ], [1]);
  assert.deepEqual(result.map((r) => [r.user_id, r.solved, r.rank]), [["a", 1, 1], ["b", 1, 2]]);
});

test("participants with only wrong answers are listed and share the last rank", () => {
  const result = rank([
    sub("winner", 1, "Accepted", 5),
    sub("x", 1, "Wrong Answer", 3), sub("y", 1, "Compile Error", 4),
  ], [1]);
  assert.deepEqual(result.map((r) => [r.user_id, r.rank, r.solved, r.finishedAt]), [
    ["winner", 1, 1, Date.UTC(2026, 10, 17, 9, 5)],
    ["x", 2, 0, null],
    ["y", 2, 0, null],
  ]);
});

test("identical results share a rank and the next rank skips", () => {
  const result = rank([sub("a", 1, "Accepted", 5), sub("b", 1, "Accepted", 5), sub("c", 2, "Accepted", 9)], [1, 2]);
  assert.deepEqual(result.map((r) => r.rank), [1, 1, 3]);
});

test("accepted answers to problems outside the contest are ignored", () => {
  const result = rank([sub("a", 99, "Accepted", 1), sub("b", 1, "Accepted", 2)], [1]);
  assert.deepEqual(result.map((r) => [r.user_id, r.solved]), [["b", 1], ["a", 0]]);
});
