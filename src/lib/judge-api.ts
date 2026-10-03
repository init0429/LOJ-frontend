import { supabase } from "./supabase";
import type { TestResult } from "./types";

interface SubmissionInput {
  problem_id: number;
  language: string;
  code: string;
  contest_id?: number;
}

interface JudgeResponse {
  status?: string;
  message?: string;
  detail?: unknown;
  submission_id?: string;
  result?: TestResult;
}

async function request(path: string, input: SubmissionInput): Promise<JudgeResponse> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error("로그인이 필요합니다.");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });
  const data: JudgeResponse = await response.json().catch(() => ({}));
  if (!response.ok || data.status === "error") {
    throw new Error(
      data.message ||
      (typeof data.detail === "string" ? data.detail : `서버 통신 오류 (${response.status})`),
    );
  }
  return data;
}

export async function submitCode(input: SubmissionInput): Promise<string> {
  const data = await request("submit", input);
  if (typeof data.submission_id !== "string" || !data.submission_id) {
    throw new Error("제출 번호를 받지 못했습니다.");
  }
  return data.submission_id;
}

export async function testCode(input: SubmissionInput): Promise<TestResult> {
  const data = await request("test_run", input);
  if (!data.result || typeof data.result.status !== "string") {
    throw new Error("실행 결과를 받지 못했습니다.");
  }
  return data.result;
}
