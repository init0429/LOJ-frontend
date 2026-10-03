export interface Problem {
  id: number;
  title: string;
  description: string;
  input_description: string | null;
  output_description: string | null;
  difficulty: number | null;
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

export interface TestResult {
  status: string;
  test_cases?: {
    status: string;
    input: string;
    expected: string;
    actual: string;
  }[];
}
