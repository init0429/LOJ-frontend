import { Gothic_A1, Nanum_Gothic_Coding, Nanum_Pen_Script } from "next/font/google";

// 인쇄된 서식의 고딕. 화면의 모든 글자는 기본으로 이 서체를 쓴다.
export const gothic = Gothic_A1({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-gothic",
  display: "swap",
});

// 빨간 펜 손글씨. 채점자가 써 준 것(판정, 점수)에만 쓴다.
export const pen = Nanum_Pen_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pen",
  display: "swap",
});

// 코드. 한글 주석까지 폭이 맞는 고정폭 서체.
export const code = Nanum_Gothic_Coding({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});
