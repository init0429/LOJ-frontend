import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/fetch-all.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports });
const { fetchAllRows } = exports;

function table(size) {
  const rows = Array.from({ length: size }, (_, i) => ({ id: i }));
  const calls = [];
  const page = async (from, to) => {
    calls.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  };
  return { rows, calls, page };
}

test("reads past the 1000-row page limit", async () => {
  const { rows, calls, page } = table(2500);
  const result = await fetchAllRows(page);
  assert.equal(result.data.length, 2500);
  // vm 안에서 만든 배열이라 프로토타입이 달라서, 값만 비교한다.
  assert.deepEqual([...result.data].map((row) => row.id), rows.map((row) => row.id));
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test("an exact multiple of the page size ends on an empty page", async () => {
  const { calls, page } = table(2000);
  assert.equal((await fetchAllRows(page)).data.length, 2000);
  assert.equal(calls.length, 3);
});

test("small tables take one request", async () => {
  const { calls, page } = table(3);
  assert.equal((await fetchAllRows(page)).data.length, 3);
  assert.equal(calls.length, 1);
});

test("errors stop paging and are reported", async () => {
  let n = 0;
  const failure = new Error("boom");
  const result = await fetchAllRows(async () =>
    n++ === 0 ? { data: Array(1000).fill({}), error: null } : { data: null, error: failure },
  );
  assert.equal(result.error, failure);
  assert.equal(result.data.length, 1000);
});
