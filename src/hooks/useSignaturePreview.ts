"use client";

import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/lib/errors";
import {
  MAX_CHECKED_TESTS,
  MAX_CHECKED_TEXT,
  previewSignature,
  type SignaturePreview,
  type TestCheck,
} from "@/lib/function-api";
import { normalizeSignature, type Signature } from "@/lib/signature";

/** 테스트 하나의 확인 결과. skipped는 너무 크거나 많아서 확인하지 않은 것 */
export type CaseCheck = TestCheck | "skipped";

export interface SignaturePreviewState {
  /** 이름을 다 적지 않아 아직 묻지 않았다 */
  incomplete: boolean;
  loading: boolean;
  /** 시그니처가 잘못됐거나 백엔드에 묻지 못한 이유 */
  error: string | null;
  preview: SignaturePreview | null;
  /** testCases와 같은 순서. 아직 모르면 undefined */
  checks: (CaseCheck | undefined)[];
}

const DELAY_MS = 500;

/**
 * 관리자 화면에서 시그니처나 테스트를 고칠 때마다(잠깐 멈춘 뒤) 백엔드에 미리 보기를 묻는다.
 * 늦게 온 이전 응답은 버린다.
 */
export function useSignaturePreview(
  enabled: boolean,
  signature: Signature,
  testCases: { input_data: string; expected_output: string }[],
): SignaturePreviewState {
  const normalized = useMemo(() => normalizeSignature(signature), [signature]);
  const incomplete = !normalized.function || normalized.params.some((p) => !p.name);

  // 확인할 테스트만 골라 보낸다. picked[i]는 보낸 목록에서의 자리(보내지 않았으면 -1)
  const { tests, picked } = useMemo(() => {
    const tests: { input: string; output: string }[] = [];
    const picked = testCases.map((tc) => {
      const fits = tc.input_data.length <= MAX_CHECKED_TEXT && tc.expected_output.length <= MAX_CHECKED_TEXT;
      if (!fits || tests.length >= MAX_CHECKED_TESTS) return -1;
      tests.push({ input: tc.input_data, output: tc.expected_output });
      return tests.length - 1;
    });
    return { tests, picked };
  }, [testCases]);

  const requestKey = JSON.stringify([normalized, tests]);
  const [result, setResult] = useState<{ key: string; preview: SignaturePreview | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!enabled || incomplete) return;
    let active = true;
    const timer = setTimeout(() => {
      previewSignature(normalized, tests).then(
        (preview) => {
          if (active) setResult({ key: requestKey, preview, error: null });
        },
        (error) => {
          if (active) setResult({ key: requestKey, preview: null, error: errorMessage(error, "미리 보기를 받지 못했습니다.") });
        },
      );
    }, DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // requestKey가 normalized와 tests를 모두 담는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, incomplete, requestKey]);

  const current = result?.key === requestKey ? result : null;
  // 새 응답이 오기 전에는 바로 앞의 결과를 그대로 보여 준다(입력할 때마다 깜빡이지 않게).
  const shown = enabled && !incomplete ? result : null;
  const preview = shown?.preview ?? null;
  return {
    incomplete,
    loading: enabled && !incomplete && current === null,
    error: shown?.error ?? null,
    preview,
    checks: picked.map((index) => (index < 0 ? "skipped" : current?.preview?.tests[index])),
  };
}
