import { Nanum_Gothic_Coding } from "next/font/google";

// 코드 편집기와 입출력 칸에 쓰는 고정폭 서체. 한글 주석까지 폭이 맞는다.
// 본문은 운영체제 기본 한글 서체를 그대로 쓴다.
export const code = Nanum_Gothic_Coding({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});
