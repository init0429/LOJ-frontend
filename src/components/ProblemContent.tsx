"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * 문제 내용을 Markdown + LaTeX(KaTeX)로 렌더링하는 컴포넌트.
 * - 인라인 수식: $...$
 * - 블록 수식: $$...$$
 */
export default function ProblemContent({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={`prose-problem ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
