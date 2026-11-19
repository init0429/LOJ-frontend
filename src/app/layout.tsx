import type { Metadata } from "next";
import "./globals.css";
import AccountSettingsSync from "@/components/AccountSettingsSync";
import { DialogProvider } from "@/components/DialogProvider";
import Navbar from "@/components/Navbar";
import { codeHangul, codeLatin } from "@/lib/fonts";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  // 각 화면의 layout이 제목을 정하면 "문제 · LOJ"처럼 붙는다. 문제·대회 화면은 열린 문제 이름으로 바꾼다.
  title: { default: "LOJ", template: "%s · LOJ" },
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
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <DialogProvider>
          <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
          <Navbar />
          <AccountSettingsSync />
          <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-w-0">{children}</main>
        </DialogProvider>
      </body>
    </html>
  );
}
