import { JetBrains_Mono, Nanum_Gothic_Coding } from "next/font/google";

// 코드 편집기와 입출력 칸에 쓰는 고정폭 서체. 본문은 운영체제 기본 한글 서체를 쓴다.
// 둘 다 SIL Open Font License 1.1이라 웹페이지에 넣어 배포해도 된다.
// next/font가 빌드할 때 받아서 이 사이트에서 직접 내려준다(외부 CDN을 부르지 않음).

// 영문, 숫자, 기호: 코드용으로 만든 서체. 0/O, 1/l/I가 잘 구분된다.
export const codeLatin = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code-latin",
  display: "swap",
});

// 한글 주석과 문자열: JetBrains Mono에는 한글이 없어서 고정폭 한글 서체로 받친다.
export const codeHangul = Nanum_Gothic_Coding({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-code-hangul",
  display: "swap",
  // 영문은 위 서체가 맡으므로 미리 받지 않는다. 한글 조각은 쓰일 때 받는다.
  preload: false,
});

export const codeFontFamily = `${codeLatin.style.fontFamily}, ${codeHangul.style.fontFamily}, ui-monospace, monospace`;
