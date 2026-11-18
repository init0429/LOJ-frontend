import Link from "next/link";

export const metadata = { title: "페이지를 찾을 수 없음" };

export default function NotFound() {
  return (
    <div className="page page-narrow">
      <p className="text-sm font-semibold text-muted tabular-nums">404</p>
      <h1 className="page-title mt-1">페이지를 찾을 수 없습니다</h1>
      <p className="page-lead">주소가 바뀌었거나 없는 페이지입니다.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/problems" className="btn btn-fill">문제 목록</Link>
        <Link href="/" className="btn btn-line">처음으로</Link>
      </div>
    </div>
  );
}
