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

const { searchTags, parseBojId } = load("tag-search.ts");
const TAGS = [
  { key: "dp", name_ko: "다이나믹 프로그래밍", name_en: "dynamic programming", aliases: ["디피"] },
  { key: "dp_tree", name_ko: "트리에서의 다이나믹 프로그래밍", name_en: "dp on trees", aliases: [] },
  { key: "2sat", name_ko: "2-SAT", name_en: "2-sat", aliases: ["투 셋"] },
  { key: "graphs", name_ko: "그래프 이론", name_en: "graph theory", aliases: [] },
];
// vm 안에서 만든 배열은 프로토타입이 달라 deepEqual이 실패하므로 JSON으로 꺼낸다.
const keys = (tags) => JSON.parse(JSON.stringify(tags.map((tag) => tag.key)));

test("an exact key comes first, then names that start with the query", () => {
  assert.deepEqual(keys(searchTags(TAGS, "dp")), ["dp", "dp_tree"]);
  assert.deepEqual(keys(searchTags(TAGS, "다이나믹")), ["dp", "dp_tree"]);
  assert.deepEqual(keys(searchTags(TAGS, "프로그래밍")), ["dp", "dp_tree"]);
});

test("aliases, English names and spacing all match", () => {
  assert.deepEqual(keys(searchTags(TAGS, "투셋")), ["2sat"]);
  assert.deepEqual(keys(searchTags(TAGS, "Graph Theory")), ["graphs"]);
  assert.deepEqual(keys(searchTags(TAGS, "디피")), ["dp"]);
});

test("chosen tags and empty queries are left out", () => {
  assert.deepEqual(keys(searchTags(TAGS, "dp", ["dp"])), ["dp_tree"]);
  assert.deepEqual(keys(searchTags(TAGS, "   ")), []);
  assert.equal(searchTags(TAGS, "a", [], 2).length, 2);
});

test("BOJ numbers must be positive whole numbers", () => {
  assert.equal(parseBojId(" 1000 "), 1000);
  for (const bad of ["", "0", "-1", "1.5", "abc", "12345678", "1e3"]) {
    assert.equal(parseBojId(bad), null, bad);
  }
});

function setupApi(body) {
  const calls = [];
  const api = load("solvedac-api.ts", {
    require: () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "t" } }, error: null }) } } }),
    process: { env: { NEXT_PUBLIC_API_URL: "https://loj.example/api" } },
    fetch: async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, json: async () => body };
    },
  });
  return { api, calls };
}

test("admins look up BOJ problems and sync tags through the backend", async () => {
  const problem = { boj_problem_id: 1000, title: "A+B", tier: 1, tags: ["math"] };
  const lookup = setupApi(problem);
  assert.deepEqual(JSON.parse(JSON.stringify(await lookup.api.getBojProblem(1000))), problem);
  assert.equal(lookup.calls[0][0], "https://loj.example/api/integrations/solvedac/problems/1000");
  assert.equal(lookup.calls[0][1].method, "GET");

  const sync = setupApi({ count: 229 });
  assert.equal(await sync.api.syncSolvedacTags(), 229);
  assert.equal(sync.calls[0][0], "https://loj.example/api/integrations/solvedac/tags/sync");
  assert.equal(sync.calls[0][1].method, "POST");
});

test("recommendations are read with the login token", async () => {
  const calls = [];
  const body = { basis: { source: null, tier: null, linked: false, handle: null, synced_at: null }, starter: true, weak_tags: [], loj: [], boj: [] };
  const api = load("recommend-api.ts", {
    require: () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "t" } }, error: null }) } } }),
    process: { env: { NEXT_PUBLIC_API_URL: "https://loj.example/api/" } },
    fetch: async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, json: async () => body };
    },
  });
  const result = await api.getRecommendations();
  assert.equal(result.starter, true);
  assert.equal(calls[0][0], "https://loj.example/api/recommendations");
  assert.equal(calls[0][1].headers.Authorization, "Bearer t");
});

test("a broken recommendation response is reported", async () => {
  const api = load("recommend-api.ts", {
    require: () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "t" } }, error: null }) } } }),
    process: { env: {} },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }),
  });
  await assert.rejects(api.getRecommendations(), { message: "추천 결과를 받지 못했습니다." });
});
