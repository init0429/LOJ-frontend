import type { SubmissionFeedback } from "./types";

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** DB의 submissions.feedback을 확인해서 읽는다. 모양이 다르면 null(판정만 보여 준다). */
export function parseFeedback(value: unknown): SubmissionFeedback | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (!isCount(raw.passed) || !isCount(raw.total)) return null;

  const feedback: SubmissionFeedback = { passed: raw.passed, total: raw.total };
  if (isCount(raw.failed_test) && raw.failed_test > 0) feedback.failed_test = raw.failed_test;
  if (typeof raw.message === "string") feedback.message = raw.message;
  const example = raw.example as Record<string, unknown> | null | undefined;
  if (
    feedback.failed_test &&
    example &&
    typeof example.input === "string" &&
    typeof example.expected === "string" &&
    typeof example.actual === "string"
  ) {
    feedback.example = { input: example.input, expected: example.expected, actual: example.actual };
  }
  return feedback;
}
