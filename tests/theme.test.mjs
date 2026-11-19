import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/theme.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load(saved = null) {
  const exports = {};
  const localStorage = { getItem: (key) => (key === "loj-theme" ? saved : null) };
  vm.runInNewContext(compiled, { exports, localStorage });
  return exports;
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const MODES = ["system", "light", "dark", "interrupt-light", "interrupt-dark"];

test("theme choices are the five modes, with the system default first", () => {
  const theme = load();
  assert.deepEqual(plain(theme.THEME_OPTIONS.map((option) => option.value)), MODES);
  assert.equal(theme.isThemeMode("interrupt-dark"), true);
  assert.equal(theme.isThemeMode("blue"), false);
  assert.equal(load("interrupt-light").readThemeMode(), "interrupt-light");
  assert.equal(load("neon").readThemeMode(), "system");
  assert.equal(load(null).readThemeMode(), "system");
});

test("each mode resolves to a brightness and a palette", () => {
  const { resolveTheme } = load();
  const expected = {
    system: [{ brightness: "light", palette: "default" }, { brightness: "dark", palette: "default" }],
    light: [{ brightness: "light", palette: "default" }, { brightness: "light", palette: "default" }],
    dark: [{ brightness: "dark", palette: "default" }, { brightness: "dark", palette: "default" }],
    "interrupt-light": [{ brightness: "light", palette: "interrupt" }, { brightness: "light", palette: "interrupt" }],
    "interrupt-dark": [{ brightness: "dark", palette: "interrupt" }, { brightness: "dark", palette: "interrupt" }],
  };
  for (const mode of MODES) {
    assert.deepEqual(plain(resolveTheme(mode, false)), expected[mode][0], `${mode} on a light system`);
    assert.deepEqual(plain(resolveTheme(mode, true)), expected[mode][1], `${mode} on a dark system`);
  }
});

test("the sun and moon button keeps the palette and flips the brightness", () => {
  const { toggledThemeMode } = load();
  assert.equal(toggledThemeMode("system", "light"), "dark");
  assert.equal(toggledThemeMode("system", "dark"), "light");
  assert.equal(toggledThemeMode("light", "light"), "dark");
  assert.equal(toggledThemeMode("interrupt-dark", "dark"), "interrupt-light");
  assert.equal(toggledThemeMode("interrupt-light", "light"), "interrupt-dark");
});

test("the boot script applies the same theme as resolveTheme before React loads", () => {
  const { THEME_BOOT_SCRIPT, resolveTheme } = load();
  for (const mode of [...MODES, "garbage"]) {
    for (const prefersDark of [false, true]) {
      const dataset = { palette: "interrupt" };
      vm.runInNewContext(THEME_BOOT_SCRIPT, {
        localStorage: { getItem: () => (mode === "system" ? null : mode) },
        window: { matchMedia: () => ({ matches: prefersDark }) },
        document: { documentElement: { dataset } },
      });
      const want = resolveTheme(mode === "garbage" ? "system" : mode, prefersDark);
      assert.equal(dataset.theme, want.brightness, `${mode} / dark system: ${prefersDark}`);
      assert.equal(dataset.palette, want.palette === "default" ? undefined : want.palette, `${mode} palette`);
    }
  }
});

test("a broken storage still boots with the system brightness", () => {
  const { THEME_BOOT_SCRIPT } = load();
  const dataset = {};
  vm.runInNewContext(THEME_BOOT_SCRIPT, {
    localStorage: { getItem: () => { throw new Error("blocked"); } },
    window: { matchMedia: () => ({ matches: true }) },
    document: { documentElement: { dataset } },
  });
  assert.equal(dataset.theme, "dark");
  assert.equal(dataset.palette, undefined);
});
