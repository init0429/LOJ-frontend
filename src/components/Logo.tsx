/** 파비콘과 같은 L_ 표식과 이름. 표식은 글자 크기를 따라 커진다. */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <svg viewBox="0 0 16 16" className="size-[1.2em] flex-none" aria-hidden="true">
        <rect width="16" height="16" rx="3" fill="#1f5fd1" />
        <path fill="#fff" d="M3 3h2v7h3v2H3zM9 12h4v1.5H9z" />
      </svg>
      LOJ
    </span>
  );
}
