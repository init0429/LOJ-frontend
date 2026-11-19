"use client";

import { useEffect, useState } from "react";
import { loadTags } from "@/lib/problem-solvedac";
import { supabase } from "@/lib/supabase";
import type { Tag } from "@/lib/tag-search";

export interface ProblemEditorSupport {
  /** solved.ac 칸(티어, BOJ 번호, 태그)이 DB에 있는지. 모르면 null */
  solvedacReady: boolean | null;
  /** 함수 구현 칸(signature)이 DB에 있는지. 모르면 null */
  functionReady: boolean | null;
  /** 고를 수 있는 태그 */
  tags: Tag[];
  /** 태그 목록을 새로 받은 뒤 부른다 */
  reloadTags: () => void;
}

/**
 * 문제 편집기(components/admin/ProblemEditor)가 쓰는 DB 준비 상태와 태그 목록.
 * 마이그레이션 전이면 그 칸을 숨기도록 한 줄씩 읽어 보고 확인한다.
 */
export function useProblemEditorSupport(enabled: boolean): ProblemEditorSupport {
  const [solvedacReady, setSolvedacReady] = useState<boolean | null>(null);
  const [functionReady, setFunctionReady] = useState<boolean | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagReloads, setTagReloads] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void Promise.all([
      supabase.from("problems").select("solvedac_tier, boj_problem_id").limit(1),
      supabase.from("problems").select("signature").limit(1),
    ]).then(([solvedac, signature]) => {
      if (!active) return;
      setSolvedacReady(!solvedac.error);
      setFunctionReady(!signature.error);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !solvedacReady) return;
    let active = true;
    loadTags().then(
      (next) => active && setTags(next),
      () => active && setTags([]),
    );
    return () => {
      active = false;
    };
  }, [enabled, solvedacReady, tagReloads]);

  return { solvedacReady, functionReady, tags, reloadTags: () => setTagReloads((count) => count + 1) };
}
