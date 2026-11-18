import type { Metadata } from "next";

export const metadata: Metadata = { title: "문제" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
