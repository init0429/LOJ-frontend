import type { Metadata } from "next";
import SettingsShell from "@/components/SettingsShell";

export const metadata: Metadata = { title: "설정" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
