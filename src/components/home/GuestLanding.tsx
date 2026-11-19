"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Braces, ListChecks, LoaderCircle, Sparkles, Trophy } from "lucide-react";
import { errorMessage } from "@/lib/errors";
import { LANGUAGE_LABELS } from "@/lib/languages";
import { countPublicProblems } from "@/lib/public-problems";
import { supabase } from "@/lib/supabase";

// 로그인할 수 있는 학교 이메일 도메인. Google 로그인 화면에서 이 도메인 계정을 먼저 보여 준다.
// 실제로 막는 것은 백엔드의 ALLOWED_EMAIL_DOMAINS이므로 두 값을 같게 맞출 것.
const SCHOOL_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN?.trim().replace(/^@/, "") || null;

const FEATURES = [
  {
    icon: Braces,
    title: "두 가지로 풀기",
    text: "표준 입출력으로 전체 프로그램을 쓰거나, class Solution처럼 함수만 써서 풉니다. 문제마다 편한 쪽을 고르세요.",
  },
  {
    icon: ListChecks,
    title: "바로 채점",
    text: "제출하면 숨겨진 테스트로 곧바로 채점합니다. 예제 실행에서는 내 출력과 기대한 출력이 어디서 다른지 보여 줍니다.",
  },
  {
    icon: Trophy,
    title: "대회",
    text: "정해진 시간 동안 문제를 풀고 순위를 겨룹니다. 쓰던 코드는 자동으로 저장됩니다.",
  },
  {
    icon: Sparkles,
    title: "맞춤 추천",
    text: "푼 기록과 solved.ac 티어를 보고 지금 풀기 좋은 문제와 약한 유형을 골라 줍니다.",
  },
];

// 첫 화면의 코드 카드. 실제 편집기처럼 보이도록 몇 낱말만 칠한다.
const SAMPLE = `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
            if (seen.count(target - nums[i]))
                return {seen[target - nums[i]], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};`;
const KEYWORDS = /\b(class|public|int|for|if|return|vector|unordered_map)\b/g;

function highlight(line: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(KEYWORDS)) {
    parts.push(line.slice(last, match.index));
    parts.push(<span key={match.index} className="text-accent">{match[0]}</span>);
    last = match.index + match[0].length;
  }
  parts.push(line.slice(last));
  return parts;
}

/** 로그인하지 않은 사람이 보는 첫 화면 */
export default function GuestLanding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ problems: number | null; contests: number | null }>({
    problems: null,
    contests: null,
  });

  useEffect(() => {
    let active = true;
    void Promise.all([
      countPublicProblems(),
      supabase.from("contests").select("id", { count: "exact", head: true }),
    ]).then(([problems, contests]) => {
      if (active) setCounts({ problems, contests: contests.count ?? null });
    });
    return () => {
      active = false;
    };
  }, []);

  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          ...(SCHOOL_DOMAIN && { queryParams: { hd: SCHOOL_DOMAIN } }),
        },
      });
      if (error) throw error;
    } catch (error) {
      setError(errorMessage(error, "Google 로그인에 연결하지 못했습니다. 다시 시도해 주세요."));
      setLoading(false);
    }
  };

  const loginButton = (
    <button type="button" onClick={() => void login()} disabled={loading} className="btn btn-fill h-11 px-5 text-[15px]">
      {loading && <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />}
      학교 Google 계정으로 시작하기
    </button>
  );

  const stats = [
    { label: "문제", value: counts.problems },
    { label: "대회", value: counts.contests },
    { label: "지원 언어", value: Object.keys(LANGUAGE_LABELS).length },
  ];

  return (
    <div className="page">
      <section className="grid items-center gap-10 py-6 lg:grid-cols-[1.05fr_1fr] lg:py-14">
        <div>
          <p className="text-sm font-semibold text-accent">LOJ · 학교 온라인 저지</p>
          <h1 className="mt-3 text-[32px] leading-tight font-bold tracking-tight sm:text-[40px]">
            문제를 풀고,
            <br />
            바로 채점받으세요
          </h1>
          <p className="mt-4 max-w-[34em] text-[15px] leading-relaxed text-muted">
            브라우저에서 코드를 쓰고 실행해 보고, 제출하면 숨겨진 테스트로 곧바로 채점합니다. 대회로 실력을 겨루고, 수준에 맞는 문제를 추천받으세요.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {loginButton}
            <Link href="/problems" className="btn btn-line h-11 px-5 text-[15px]">
              문제 둘러보기
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {error && <p role="alert" className="notice-error mt-3 text-sm">{error}</p>}
          {SCHOOL_DOMAIN && <p className="mt-3 text-sm text-muted">@{SCHOOL_DOMAIN} 계정으로 로그인합니다.</p>}
        </div>

        <figure className="box overflow-hidden shadow-sm" aria-label="함수 구현으로 푼 예시 코드와 채점 결과">
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[13px]">
            <span className="font-semibold">두 수의 합</span>
            <span className="flex gap-1">
              <span className="chip h-6! text-fg">함수 구현</span>
              <span className="chip h-6!">C++</span>
            </span>
          </div>
          <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed">
            {SAMPLE.split("\n").map((line, index) => (
              <span key={index} className="flex">
                <span aria-hidden="true" className="w-6 flex-none pr-3 text-right text-muted select-none">{index + 1}</span>
                <span>{highlight(line)}</span>
              </span>
            ))}
          </pre>
          <figcaption className="flex items-baseline gap-3 border-t border-line px-4 py-3">
            <span className="text-lg font-semibold text-ok">정답</span>
            <span className="text-sm text-muted">테스트 3개 중 3개 통과</span>
          </figcaption>
        </figure>
      </section>

      <section aria-label="LOJ 한눈에 보기" className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="box px-4 py-4 text-center sm:py-5">
            <p className="text-2xl font-bold tabular-nums sm:text-3xl">{stat.value ?? "–"}</p>
            <p className="mt-1 text-sm text-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-16" aria-labelledby="features-title">
        <h2 id="features-title" className="text-xl font-semibold">LOJ에서 할 수 있는 것</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="box p-5">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-fill text-accent">
                <Icon size={18} aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16" aria-labelledby="languages-title">
        <h2 id="languages-title" className="text-xl font-semibold">지원 언어</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {Object.values(LANGUAGE_LABELS).map((label) => (
            <li key={label} className="chip h-8 px-3 text-[13px] text-fg">{label}</li>
          ))}
        </ul>
      </section>

      <section className="box mt-16 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-lg font-semibold">지금 첫 문제를 풀어 보세요</h2>
          <p className="mt-1 text-sm text-muted">로그인하면 제출 기록, 대회, 맞춤 추천을 쓸 수 있습니다.</p>
        </div>
        {loginButton}
      </section>
    </div>
  );
}
