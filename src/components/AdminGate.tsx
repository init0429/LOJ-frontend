import Link from "next/link";

/** 권한 확인이 끝나기 전과 관리자가 아닐 때 보여 줄 화면. 통과하면 null. */
export default function AdminGate({ checking, isAdmin }: { checking: boolean; isAdmin: boolean }) {
  if (checking) {
    return <p role="status" className="notice page page-narrow">권한을 확인하는 중…</p>;
  }
  if (!isAdmin) {
    return (
      <div className="page page-narrow">
        <h1 className="page-title">관리자만 볼 수 있는 화면입니다</h1>
        <p className="page-lead">문제 등록과 대회 개설은 관리자 계정으로 로그인해야 할 수 있습니다.</p>
        <Link href="/problems" className="btn btn-line mt-8">문제 목록으로 가기</Link>
      </div>
    );
  }
  return null;
}
