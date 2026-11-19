import { redirect } from "next/navigation";

// /admin으로 들어오면 관리 화면의 첫 탭(문제 등록)으로 보낸다.
export default function AdminIndex() {
  redirect("/admin/problems");
}
