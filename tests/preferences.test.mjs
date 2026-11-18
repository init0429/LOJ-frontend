import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(context = {}) {
  const source = readFileSync(new URL("../src/lib/preferences.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: () => ({}), ...context });
  return exports;
}

// vm 안에서 만든 객체는 deepEqual에서 다른 realm으로 보이므로 JSON으로 한 번 옮긴다.
const plain = (value) => JSON.parse(JSON.stringify(value));

function browser() {
  const data = new Map();
  const events = [];
  return {
    data,
    events,
    context: {
      localStorage: {
        getItem: (key) => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: (key) => data.delete(key),
      },
      window: { dispatchEvent: (event) => events.push(event.type) },
      Event: class { constructor(type) { this.type = type; } },
    },
  };
}

test("저장된 설정이 없거나 망가졌으면 기본값을 쓴다", () => {
  const { parsePreferences, DEFAULT_PREFERENCES } = load();
  const defaults = plain(DEFAULT_PREFERENCES);
  for (const raw of [null, "", "not json", "[1,2]", "null", "42"]) {
    assert.deepEqual(plain(parsePreferences(raw)), defaults, String(raw));
  }
});

test("틀린 항목만 기본값으로 돌리고 나머지는 살린다", () => {
  const { parsePreferences, DEFAULT_PREFERENCES } = load();
  const parsed = plain(parsePreferences(JSON.stringify({
    editorFontSize: 18, editorTabSize: 3, editorWordWrap: "yes", showTags: true, showTier: false, extra: 1,
  })));
  assert.deepEqual(parsed, {
    ...plain(DEFAULT_PREFERENCES),
    editorFontSize: 18,
    showTags: true,
    showTier: false,
  });
  assert.equal(plain(parsePreferences(JSON.stringify({ editorFontSize: 99 }))).editorFontSize, 14);
});

test("기본값과 다른 항목만 저장하고, 바뀌었다고 알린다", () => {
  const { data, events, context } = browser();
  const { savePreferences, PREFERENCES_KEY, PREFERENCES_EVENT } = load(context);

  const next = plain(savePreferences({ editorFontSize: 16 }));
  assert.equal(next.editorFontSize, 16);
  assert.deepEqual(JSON.parse(data.get(PREFERENCES_KEY)), { editorFontSize: 16 });

  savePreferences({ showTags: true });
  assert.deepEqual(JSON.parse(data.get(PREFERENCES_KEY)), { editorFontSize: 16, showTags: true });

  // 모두 기본값으로 돌아가면 저장한 것을 지운다.
  savePreferences({ editorFontSize: 14, showTags: false });
  assert.equal(data.has(PREFERENCES_KEY), false);
  assert.deepEqual(events, [PREFERENCES_EVENT, PREFERENCES_EVENT, PREFERENCES_EVENT]);
});

test("허용하지 않는 값은 저장하지 않는다", () => {
  const { data, context } = browser();
  const { savePreferences, PREFERENCES_KEY } = load(context);
  assert.equal(plain(savePreferences({ editorTabSize: 3 })).editorTabSize, 4);
  assert.equal(data.has(PREFERENCES_KEY), false);
});

test("저장소를 쓸 수 없어도 오류 없이 바뀐 값을 돌려준다", () => {
  const { savePreferences } = load({
    localStorage: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } },
    window: { dispatchEvent: () => {} },
    Event: class {},
  });
  assert.equal(plain(savePreferences({ editorWordWrap: true })).editorWordWrap, true);
});
