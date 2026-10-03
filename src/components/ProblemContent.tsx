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
      className={`prose max-w-none
        prose-p:text-(--text-dim) prose-p:leading-relaxed
        prose-li:text-(--text-dim)
        prose-code:text-(--seal) prose-code:bg-(--paper-raised) prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
        prose-pre:bg-(--paper-raised) prose-pre:border prose-pre:border-(--rule)
        prose-strong:text-(--text)
        ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
