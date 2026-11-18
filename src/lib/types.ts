export interface Problem {
  id: number;
  title: string;
  description: string;
  input_description: string | null;
  output_description: string | null;
  difficulty: number | null;
  /** solved.ac 티어(1~30). 정하지 않았거나 0(Unrated)이면 difficulty를 보여 준다. */
  solvedac_tier?: number | null;
  time_limit_ms: number;
  memory_limit_mb: number;
}

export interface Contest {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
}

export interface TestCase {
  id: number;
  input_data: string;
  expected_output: string;
}

export interface Submission {
  id: string;
  status: string;
  language: string;
  created_at: string;
}

export interface CaseResult {
  status: string;
  input: string;
  expected: string;
  actual: string;
}

export interface TestResult {
  status: string;
  /** 컴파일 오류처럼 테스트케이스와 무관한 메시지 */
  message?: string;
  test_cases?: CaseResult[];
  /** 예제 수. test_cases가 이보다 적으면 시간이 모자라 뒤쪽 예제를 돌리지 못한 것 */
  total?: number;
}

/** 제출 채점 결과의 설명(submissions.feedback) */
export interface SubmissionFeedback {
  passed: number;
  total: number;
  /** 처음 틀린 테스트의 번호(1부터). 공개 예제가 먼저 채점되므로 예제 수 이하면 그 예제다 */
  failed_test?: number;
  /** 틀린 테스트가 공개 예제일 때만 있다 */
  example?: { input: string; expected: string; actual: string };
  /** 컴파일 오류 메시지 */
  message?: string;
}
