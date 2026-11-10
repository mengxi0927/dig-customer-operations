"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export function PrototypeBoundary({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (path === "/" || path === "/data") ? <>{children}</> : <AppShell>{children}</AppShell>;
}
