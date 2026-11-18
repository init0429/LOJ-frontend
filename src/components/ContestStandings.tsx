"use client";

import { useEffect, useState } from "react";
import { buildCells, rankParticipants, type RankingSubmission } from "@/lib/contest-ranking";
import { supabase } from "@/lib/supabase";

interface ResultRow extends RankingSubmission {
  username: string | null;
}

const letter = (index: number) => String.fromCharCode(65 + (index % 26));

/** 대회 시작부터 걸린 시간을 "1:05"처럼 */
const elapsed = (ms: number) => {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};

/** 끝난 대회의 최종 순위. 코드는 없이 제출 결과만 DB 함수(contest_results)로 받는다. */
export default function ContestStandings({
  contestId,
  problemIds,
  startTime,
}: {
  contestId: number;
  problemIds: number[];
  startTime: string;
}) {
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [error, setError] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setMe(data.session?.user.id ?? null);
    });
    supabase.rpc("contest_results", { target: contestId }).then(({ data, error: rpcError }) => {
      if (!active) return;
      if (rpcError) setError(true);
      else setRows((data ?? []) as ResultRow[]);
    });
    return () => {
      active = false;
    };
  }, [contestId]);

  if (error) return <p className="notice mt-3">순위를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>;
  if (!rows) return <p role="status" className="notice mt-3">순위를 불러오는 중…</p>;
  if (rows.length === 0) return <p className="notice mt-3">이 대회에는 제출한 사람이 없습니다.</p>;

  const ranking = rankParticipants(rows, problemIds);
  const names = new Map(rows.map((row) => [row.user_id, row.username]));
  const cells = buildCells(rows);
  const start = new Date(startTime).getTime();

  return (
    <div className="table-wrap mt-3">
      <table className="sheet-table">
        <thead>
          <tr>
            <th className="w-14">순위</th>
            <th>이름</th>
            {problemIds.map((id, index) => <th key={id} className="w-16 text-center!">{letter(index)}</th>)}
            <th className="num w-20">맞힌 수</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((row) => (
            <tr key={row.user_id} aria-current={row.user_id === me ? "true" : undefined} className={row.user_id === me ? "font-semibold" : undefined}>
              <td className="tabular-nums">{row.rank}</td>
              <td>
                {names.get(row.user_id) || "이름 없음"}
                {row.user_id === me && <span className="ml-1.5 text-xs text-accent">나</span>}
              </td>
              {problemIds.map((id) => {
                const cell = cells.get(`${row.user_id}:${id}`);
                return (
                  <td key={id} className="text-center text-xs tabular-nums">
                    {cell?.solvedAt != null ? (
                      <span className="text-ok" title={cell.misses ? `${cell.misses}번 틀린 뒤 맞힘` : "한 번에 맞힘"}>
                        {elapsed(cell.solvedAt - start)}
                        {cell.misses > 0 && <span className="block text-muted">-{cell.misses}</span>}
                      </span>
                    ) : cell && cell.misses > 0 ? (
                      <span className="text-bad" title={`${cell.misses}번 틀림`}>-{cell.misses}</span>
                    ) : null}
                  </td>
                );
              })}
              <td className="num">{row.solved}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">칸의 시각은 대회 시작부터 처음 맞히기까지 걸린 시간, -숫자는 틀린 횟수입니다.</p>
    </div>
  );
}
