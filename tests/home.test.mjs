import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/home.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const home = {};
vm.runInNewContext(compiled, { exports: home });
const plain = (value) => JSON.parse(JSON.stringify(value));

const sub = (problem_id, status, minute) => ({ problem_id, status, created_at: `2026-11-19T10:${String(minute).padStart(2, "0")}:00Z` });

test("stats count each solved problem once and ignore submissions still being judged", () => {
  const subs = [sub(1, "Accepted", 1), sub(1, "Accepted", 2), sub(2, "Wrong Answer", 3), sub(3, "Pending", 4), sub(3, "Running", 5)];
  assert.deepEqual(plain(home.summarize(subs)), { solved: 1, submissions: 3, acceptance: 67 });
  assert.deepEqual(plain(home.summarize([])), { solved: 0, submissions: 0, acceptance: null });
});

test("solved problems count only problems in the public list when one is given", () => {
  // 1000000001은 대회 전용 문제(공개 전). 제출 수와 정답률에는 들어가지만 푼 문제에는 넣지 않는다.
  const subs = [sub(1, "Accepted", 1), sub(1000000001, "Accepted", 2), sub(2, "Wrong Answer", 3)];
  assert.deepEqual(plain(home.summarize(subs, new Set([1, 2]))), { solved: 1, submissions: 3, acceptance: 67 });
  assert.equal(home.summarize(subs).solved, 2);
});

test("unsolved attempts are the latest touched problems that were never accepted", () => {
  const subs = [
    sub(1, "Wrong Answer", 1),
    sub(2, "Wrong Answer", 2),
    sub(1, "Compile Error", 9),
    sub(3, "Wrong Answer", 3),
    sub(3, "Accepted", 4),
    sub(4, "Runtime Error", 5),
    sub(5, "Time Limit Exceeded", 6),
  ];
  assert.deepEqual(plain(home.unsolvedAttempts(subs)), [1, 5, 4]);
  assert.deepEqual(plain(home.unsolvedAttempts(subs, 10)), [1, 5, 4, 2]);
  assert.deepEqual(plain(home.unsolvedAttempts([sub(7, "Accepted", 1)])), []);
});

test("rank follows the leaderboard order and is empty without points", () => {
  const rows = [{ user_id: "a", rating: 300 }, { user_id: "me", rating: 120 }, { user_id: "c", rating: 0 }];
  assert.deepEqual(plain(home.myRank(rows, "me")), { rank: 2, rating: 120, total: 3 });
  assert.equal(home.myRank(rows, "c"), null);
  assert.equal(home.myRank(rows, "nobody"), null);
});

test("running contests come first, then the next ones to start", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const contest = (id, start, end) => ({ id, title: `c${id}`, start_time: `2026-11-${start}Z`, end_time: `2026-11-${end}Z` });
  const contests = [
    contest(1, "20T09:00:00", "20T11:00:00"),
    contest(2, "19T11:00:00", "19T15:00:00"),
    contest(3, "19T10:00:00", "19T13:00:00"),
    contest(4, "19T13:00:00", "19T14:00:00"),
    contest(5, "18T10:00:00", "18T11:00:00"),
  ];
  assert.deepEqual(plain(home.activeContests(contests, now, 10).map((c) => c.id)), [3, 2, 4, 1]);
  assert.deepEqual(plain(home.activeContests(contests, now).map((c) => c.id)), [3, 2, 4]);
});
