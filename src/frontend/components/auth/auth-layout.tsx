import { ReactNode } from "react";
import Link from "next/link";
import { AuthPanel } from "./auth-panel";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthPanel />
      <div className="flex flex-col min-h-screen">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 p-6 border-b border-border-subtle">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-bg-canvas text-base shrink-0">
            J
          </div>
          <span className="text-lg font-display tracking-tight">Jobak</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <footer className="px-6 py-5 text-center border-t border-border-subtle">
          <p className="text-xs text-fg-quaternary">
            &copy; {new Date().getFullYear()} Jobak. All rights reserved.{" "}
            <Link
              href="/privacy"
              className="hover:text-fg-tertiary transition-colors"
            >
              Privacy
            </Link>{" "}
            &middot;{" "}
            <Link
              href="/terms"
              className="hover:text-fg-tertiary transition-colors"
            >
              Terms
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
