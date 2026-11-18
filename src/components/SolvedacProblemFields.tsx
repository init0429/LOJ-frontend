"use client";

import { useId, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { errorMessage } from "@/lib/errors";
import type { SolvedacInfo } from "@/lib/problem-solvedac";
import { getBojProblem, syncSolvedacTags } from "@/lib/solvedac-api";
import { tierName } from "@/lib/solvedac-tier";
import { parseBojId, searchTags, type Tag } from "@/lib/tag-search";

const TIERS = Array.from({ length: 31 }, (_, tier) => tier);

/**
 * 관리자 화면에서 문제에 solved.ac 티어와 태그를 붙이는 칸.
 * BOJ 문제 번호를 적고 "가져오기"를 누르면 solved.ac의 티어와 태그로 채운다.
 */
export default function SolvedacProblemFields({
  value,
  onChange,
  tags,
  onTagsSynced,
}: {
  value: SolvedacInfo;
  onChange: (next: SolvedacInfo) => void;
  /** 고를 수 있는 태그(tags 표) */
  tags: Tag[];
  /** 태그 목록을 새로 받은 뒤 부른다. 부모가 tags를 다시 읽는다. */
  onTagsSynced: () => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<"fetch" | "sync" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const names = new Map(tags.map((tag) => [tag.key, tag.name_ko]));
  const suggestions = searchTags(tags, query, value.tags);
  const bojId = parseBojId(value.bojId);

  const addTag = (key: string) => {
    onChange({ ...value, tags: [...value.tags, key] });
    setQuery("");
  };

  const fill = async () => {
    if (bojId === null) return;
    setBusy("fetch");
    setMessage(null);
    try {
      const problem = await getBojProblem(bojId);
      const known = problem.tags.filter((key) => names.has(key));
      const unknown = problem.tags.filter((key) => !names.has(key));
      onChange({ ...value, tier: problem.tier, tags: known });
      setMessage({
        ok: unknown.length === 0,
        text:
          `${problem.boj_problem_id}. ${problem.title} · ${tierName(problem.tier)} · 태그 ${known.length}개를 채웠습니다.` +
          (unknown.length ? ` 태그 목록에 없는 ${unknown.join(", ")}는 뺐습니다. 태그 목록을 받은 뒤 다시 가져오세요.` : ""),
      });
    } catch (error) {
      setMessage({ ok: false, text: errorMessage(error, "solved.ac에서 문제 정보를 받지 못했습니다.") });
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy("sync");
    setMessage(null);
    try {
      const count = await syncSolvedacTags();
      setMessage({ ok: true, text: `solved.ac 태그 ${count}개를 받았습니다.` });
      onTagsSynced();
    } catch (error) {
      setMessage({ ok: false, text: errorMessage(error, "태그 목록을 받지 못했습니다.") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-boj`} className="field-label">
            BOJ 문제 번호<span className="field-hint">BOJ에서 가져온 문제만</span>
          </label>
          <div className="flex gap-2">
            <input
              id={`${id}-boj`}
              inputMode="numeric"
              value={value.bojId}
              onChange={(event) => onChange({ ...value, bojId: event.target.value })}
              placeholder="예: 1000"
              aria-invalid={value.bojId.trim() !== "" && bojId === null}
              className="input"
            />
            <button type="button" onClick={() => void fill()} disabled={bojId === null || busy !== null} className="btn btn-line flex-none">
              {busy === "fetch" && <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />}
              가져오기
            </button>
          </div>
        </div>
        <div>
          <label htmlFor={`${id}-tier`} className="field-label">solved.ac 티어</label>
          <select
            id={`${id}-tier`}
            value={value.tier ?? ""}
            onChange={(event) => onChange({ ...value, tier: event.target.value === "" ? null : Number(event.target.value) })}
            className="input"
          >
            <option value="">정하지 않음</option>
            {TIERS.map((tier) => <option key={tier} value={tier}>{tierName(tier)}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={tags.length ? `${id}-tag` : undefined} className="field-label">
          태그<span className="field-hint">한국어·영어 이름이나 key로 찾기</span>
        </label>
        {value.tags.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="고른 태그">
            {value.tags.map((key) => (
              <li key={key} className="chip h-7 pr-1 text-fg">
                {names.get(key) ?? key}
                <button
                  type="button"
                  onClick={() => onChange({ ...value, tags: value.tags.filter((tag) => tag !== key) })}
                  aria-label={`${names.get(key) ?? key} 태그 빼기`}
                  className="inline-flex size-5 items-center justify-center rounded-full text-muted hover:bg-fill-strong hover:text-fg"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {tags.length === 0 ? (
          <p className="text-sm text-muted">
            태그 목록이 비어 있습니다.{" "}
            <button type="button" onClick={() => void sync()} disabled={busy !== null} className="text-link">
              {busy === "sync" ? "받는 중…" : "solved.ac에서 태그 목록 받기"}
            </button>
          </p>
        ) : (
          <>
            <input
              id={`${id}-tag`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && suggestions[0]) {
                  event.preventDefault();
                  addTag(suggestions[0].key);
                }
              }}
              placeholder="예: 다이나믹, dp, graphs"
              autoComplete="off"
              className="input"
            />
            {suggestions.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="찾은 태그">
                {suggestions.map((tag) => (
                  <li key={tag.key}>
                    <button type="button" onClick={() => addTag(tag.key)} className="chip h-7 bg-fill hover:bg-fill-strong hover:text-fg">
                      + {tag.name_ko}
                      <span className="text-xs opacity-70">{tag.key}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-muted" : "notice-error"}`}>
          {message.text}
          {!message.ok && tags.length > 0 && message.text.includes("태그 목록") && (
            <>
              {" "}
              <button type="button" onClick={() => void sync()} disabled={busy !== null} className="text-link">
                태그 목록 받기
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
