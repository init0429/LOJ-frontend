/** LOJ 글자표. 가운데 O는 사인펜으로 채운 답안지 버블이다. */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span role="img" aria-label="LOJ" className={`inline-flex items-center font-black tracking-tight leading-none ${className}`}>
      <span aria-hidden="true">L</span>
      <span
        aria-hidden="true"
        className="inline-block mx-[0.07em] w-[0.62em] h-[0.84em] rounded-[50%] bg-marker"
      />
      <span aria-hidden="true">J</span>
    </span>
  );
}
