"use client";

import { useState } from "react";
import { useSubmissionState } from "../hooks/useSubmissionState";

const LANGUAGE_TEMPLATES: Record<string, { label: string; code: string }> = {
  python: {
    label: "Python",
    code: "a, b = map(int, input().split())\nprint(a + b)",
  },
  cpp: {
    label: "C++",
    code:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}\n",
  },
  java: {
    label: "Java",
    code:
      "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        System.out.println(a + b);\n    }\n}\n",
  },
};

export default function CodeSubmitter() {
  const [language, setLanguage] = useState<string>("python");
  const [subId, setSubId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = useSubmissionState(subId);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setSubId(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: 1,
          language,
          code: LANGUAGE_TEMPLATES[language].code,
        }),
      });

      if (!response.ok) {
        throw new Error(`서버 에러: ${response.status}`);
      }

      const data = await response.json();
      setSubId(data.submission_id);
    } catch (err: any) {
      setError(err.message || "제출 중 알 수 없는 에러가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 items-start">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        disabled={isLoading}
        className="border rounded p-2"
      >
        {Object.entries(LANGUAGE_TEMPLATES).map(([value, { label }]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className={`cursor-pointer p-2 text-white rounded transition-colors ${isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          }`}
      >
        {isLoading ? "제출 중..." : "제출하기"}
      </button>

      {error && <p className="text-red-500 font-medium">{error}</p>}

      {!error && (
        <p className="font-medium">
          상태: <span className="text-blue-600">{status}</span>
        </p>
      )}
    </div>
  );
}