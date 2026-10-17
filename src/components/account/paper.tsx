import type { ReactNode } from "react";
import { Fraunces } from "next/font/google";
import { cn } from "@/lib/utils";
import "@/app/insights/theme.css";
import "./account.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

/** Warm-paper page shell for account pages (login, boards, invite). */
export function PaperPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bs-scope acct-paper min-h-dvh w-full", fraunces.variable, className)}>
      {children}
    </div>
  );
}
