import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// lib 파일을 TypeScript에서 바로 옮겨 vm에서 읽는다. 같은 폴더의 다른 lib을 불러오면 그것도 함께 읽는다.
function load(file, context, stubs = {}) {
  const cache = {};
  const loadOne = (name) => {
    if (stubs[name]) return stubs[name];
    if (cache[name]) return cache[name];
    const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = (cache[name] = {});
    vm.runInContext(compiled, vm.createContext({ ...context, exports, require: (path) => loadOne(path.replace("./", "")) }));
    return exports;
  };
  return loadOne(file);
}

const plain = (value) => JSON.parse(JSON.stringify(value));

function browser(initial = {}) {
  const data = new Map(Object.entries(initial));
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

const stubs = { languages: { LANGUAGE_LABELS: { python: "Python 3", cpp: "C++" }, STARTER_CODE: {} } };

test("계정에서 받은 값은 검사해서 모르는 것과 틀린 것을 걸러 낸다", () => {
  const { parseAccountSettings } = load("account-settings", browser().context, stubs);
  assert.deepEqual(plain(parseAccountSettings(null)), { preferences: {}, language: null, theme: "system" });
  assert.deepEqual(plain(parseAccountSettings([1])), { preferences: {}, language: null, theme: "system" });
  assert.deepEqual(
    plain(parseAccountSettings({
      preferences: { editorFontSize: 18, editorTabSize: 3, showTags: true, extra: 1 },
      language: "cpp",
      theme: "dark",
      unknown: "x",
    })),
    { preferences: { editorFontSize: 18, showTags: true }, language: "cpp", theme: "dark" },
  );
  assert.deepEqual(
    plain(parseAccountSettings({ preferences: "nope", language: "brainfuck", theme: "blue" })),
    { preferences: {}, language: null, theme: "system" },
  );
  assert.equal(parseAccountSettings({ theme: "interrupt-dark" }).theme, "interrupt-dark");
  assert.equal(parseAccountSettings({ theme: "interrupt-light" }).theme, "interrupt-light");
});

test("이 브라우저의 설정을 같은 모양으로 읽는다", () => {
  const { context } = browser({
    "loj-preferences": JSON.stringify({ showTier: false, editorWordWrap: true }),
    "loj-language": "cpp",
    "loj-theme": "light",
  });
  const { readLocalSettings } = load("account-settings", context, stubs);
  // 항목 순서는 기본값 순서로 맞춰진다.
  assert.equal(
    JSON.stringify(readLocalSettings()),
    JSON.stringify({ preferences: { editorWordWrap: true, showTier: false }, language: "cpp", theme: "light" }),
  );
});

test("순서만 다른 설정은 같은 것으로 본다", () => {
  const { sameSettings } = load("account-settings", browser().context, stubs);
  const a = { preferences: { editorFontSize: 16, showTags: true }, language: "python", theme: "dark" };
  const b = { theme: "dark", language: "python", preferences: { showTags: true, editorFontSize: 16 } };
  assert.equal(sameSettings(a, b), true);
  assert.equal(sameSettings(a, { ...b, theme: "light" }), false);
});

test("계정 설정을 이 브라우저에 쓰고 바뀌었다고 알린다", () => {
  const { data, events, context } = browser({ "loj-preferences": "{\"showTags\":true}", "loj-language": "cpp" });
  const { writeLocalSettings } = load("account-settings", context, stubs);
  writeLocalSettings({ preferences: { editorFontSize: 18 }, language: "python", theme: "dark" });
  assert.equal(data.get("loj-preferences"), "{\"editorFontSize\":18}");
  assert.equal(data.get("loj-language"), "python");
  assert.deepEqual(events, ["loj-preferences", "loj-language"]);

  writeLocalSettings({ preferences: {}, language: null, theme: "system" });
  assert.equal(data.has("loj-preferences"), false);
  assert.equal(data.has("loj-language"), false);
});

test("이름은 앞뒤 공백을 떼고 1~20자, 제어 문자 없이", () => {
  const { normalizeUsername } = load("profile", {});
  assert.deepEqual(plain(normalizeUsername("  앨리스 ")), { name: "앨리스" });
  assert.deepEqual(plain(normalizeUsername("가".repeat(20))), { name: "가".repeat(20) });
  // 그림 글자도 한 글자로 센다(DB의 char_length와 같게).
  assert.deepEqual(plain(normalizeUsername("😀".repeat(20))), { name: "😀".repeat(20) });
  for (const bad of ["", "   ", "가".repeat(21), "tab\tname", "line\nbreak", "\u0085x"]) {
    assert.ok("error" in normalizeUsername(bad), JSON.stringify(bad));
  }
});
