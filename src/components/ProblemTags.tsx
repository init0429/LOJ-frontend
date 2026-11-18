"use client";

import { useEffect, useState } from "react";
import SpoilerTags from "@/components/SpoilerTags";
import { supabase } from "@/lib/supabase";

type Row = { tag_key: string; tags: { name_ko: string } | { name_ko: string }[] | null };
type Period = { start_time: string; end_time: string };
type ContestLink = { contests: Period | Period[] | null };

const isOngoing = ({ contests }: ContestLink) => {
  const now = Date.now();
  return (Array.isArray(contests) ? contests : contests ? [contests] : []).some(
    (contest) => new Date(contest.start_time).getTime() <= now && now < new Date(contest.end_time).getTime(),
  );
};

/** 문제 화면 아래의 알고리즘 분류. 붙은 태그가 없거나 불러오지 못하면 아무것도 그리지 않는다. */
export default function ProblemTags({ problemId }: { problemId: number }) {
  const [loaded, setLoaded] = useState<{ id: number; tags: { key: string; name: string }[] } | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.from("problem_tags").select("tag_key, tags(name_ko)").eq("problem_id", problemId),
      supabase.from("contest_problems").select("contests(start_time, end_time)").eq("problem_id", problemId),
    ]).then(([{ data, error }, contests]) => {
      if (!active || error || contests.error) return;
      // 진행 중인 대회의 문제면 대회 밖(연습)에서 열어도 분류를 숨긴다. 풀이 힌트가 되기 때문이다.
      if (((contests.data ?? []) as ContestLink[]).some(isOngoing)) return setLoaded({ id: problemId, tags: [] });
      const tags = ((data ?? []) as Row[])
        .map((row) => {
          const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
          return { key: row.tag_key, name: tag?.name_ko ?? row.tag_key };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "ko"));
      setLoaded({ id: problemId, tags });
    });
    return () => {
      active = false;
    };
  }, [problemId]);

  const tags = loaded?.id === problemId ? loaded.tags : [];
  if (tags.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="section-title">알고리즘 분류</h2>
      <div className="mt-2">
        <SpoilerTags tags={tags} />
      </div>
    </section>
  );
}
