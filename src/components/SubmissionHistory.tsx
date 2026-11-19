"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import SubmissionResult from "@/components/SubmissionResult";
import Verdict from "@/components/Verdict";
import { CODE_MODE_LABELS, isCodeMode, type CodeMode } from "@/lib/code-mode";
import { formatDateTime } from "@/lib/format";
import { LANGUAGE_LABELS } from "@/lib/languages";
import { parseFeedback } from "@/lib/submission-feedback";
import { supabase } from "@/lib/supabase";
import type { Submission, SubmissionFeedback } from "@/lib/types";
import { isJudging } from "@/lib/verdict";

type Detail = { code: string; feedback: SubmissionFeedback | null } | "error";

async function loadDetail(id: string): Promise<Detail> {
  const full = await supabase.from("submissions").select("code, feedback").eq("id", id).single();
  if (!full.error && full.data) return { code: full.data.code ?? "", feedback: parseFeedback(full.data.feedback) };
  // 채점 설명 칸이 없는 DB에서도 코드는 보여 준다.
  const basic = await supabase.from("submissions").select("code").eq("id", id).single();
  return basic.error || !basic.data ? "error" : { code: basic.data.code ?? "", feedback: null };
}

/** 이 문제의 내 제출. 줄을 펼치면 그때의 코드와 채점 설명이 보이고, 코드를 편집기로 불러올 수 있다. */
export default function SubmissionHistory({
  history,
  onLoadCode,
}: {
  history: Submission[];
  onLoadCode: (language: string, code: string, mode: CodeMode) => void | Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});

  const toggle = (id: string) => {
    if (openId === id) return setOpenId(null);
    setOpenId(id);
    if (!details[id] || details[id] === "error") {
      void loadDetail(id).then(
        (detail) => setDetails((prev) => ({ ...prev, [id]: detail })),
        () => setDetails((prev) => ({ ...prev, [id]: "error" })),
      );
    }
  };

  return (
    <table className="sheet-table mt-3">
      <thead>
        <tr>
          <th>결과</th>
          <th>언어</th>
          <th>제출한 때</th>
          <th className="w-16"><span className="sr-only">자세히</span></th>
        </tr>
      </thead>
      <tbody>
        {history.map((sub) => {
          const open = openId === sub.id;
          const detail = details[sub.id];
          return (
            <Fragment key={sub.id}>
              <tr>
                <td className="py-2!"><Verdict status={sub.status} size="sm" /></td>
                <td>
                  {LANGUAGE_LABELS[sub.language] ?? sub.language}
                  {sub.mode === "function" && <span className="text-muted"> · {CODE_MODE_LABELS.function}</span>}
                </td>
                <td className="text-muted">{formatDateTime(sub.created_at)}</td>
                <td className="py-1.5!">
                  <button
                    type="button"
                    onClick={() => toggle(sub.id)}
                    aria-expanded={open}
                    aria-label={`${formatDateTime(sub.created_at)} 제출 ${open ? "접기" : "자세히 보기"}`}
                    className="btn btn-sm px-2 text-muted hover:bg-fill hover:text-fg"
                  >
                    {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                    {open ? "접기" : "보기"}
                  </button>
                </td>
              </tr>
              {open && (
                <tr>
                  <td colSpan={4} className="bg-transparent! pt-1 pb-5">
                    {!detail ? (
                      <p role="status" className="notice text-sm">불러오는 중…</p>
                    ) : detail === "error" ? (
                      <p role="alert" className="notice-error text-sm">제출 내용을 불러오지 못했습니다. 다시 펼쳐 주세요.</p>
                    ) : (
                      <div className="space-y-3">
                        {!isJudging(sub.status) && (
                          <SubmissionResult submitting={false} submitted status={sub.status} feedback={detail.feedback} error={null} />
                        )}
                        <pre className="code-box max-h-80 overflow-auto">{detail.code}</pre>
                        <button type="button" onClick={() => void onLoadCode(sub.language, detail.code, isCodeMode(sub.mode) ? sub.mode : "program")} className="btn btn-sm btn-line">
                          이 코드를 편집기로 불러오기
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
