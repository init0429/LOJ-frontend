import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { codeHangul, codeLatin } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "LOJ",
  description: "문제를 풀어 제출하면 바로 채점하는 온라인 저지입니다.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${codeLatin.variable} ${codeHangul.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t;try{t=localStorage.getItem('loj-theme')}catch(e){}if(t!=='light'&&t!=='dark')t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t})()` }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-w-0">{children}</main>
      </body>
    </html>
  );
}
