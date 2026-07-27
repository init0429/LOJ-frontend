"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface ProblemContentProps {
  content: string;
  className?: string;
}

/**
 * 문제 내용을 Markdown + LaTeX(KaTeX)로 렌더링하는 컴포넌트.
 * - 인라인 수식: $...$
 * - 블록 수식: $$...$$
 */
export default function ProblemContent({
  content,
  className = "",
}: ProblemContentProps) {
  return (
    <div
      className={`prose prose-invert max-w-none
        prose-p:text-slate-300 prose-p:leading-relaxed
        prose-li:text-slate-300
        prose-code:text-emerald-300 prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
        prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700
        prose-strong:text-slate-100
        ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
