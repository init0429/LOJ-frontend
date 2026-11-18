import type { Metadata } from "next";

export const metadata: Metadata = { title: "대회" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
