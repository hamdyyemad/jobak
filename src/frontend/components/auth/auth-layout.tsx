import { ReactNode } from "react";
import Link from "next/link";
import { JobakLogo } from "@/frontend/components/shared/jobak-logo";
import { AuthPanel } from "./auth-panel";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <AuthPanel />
      <div className="flex flex-col min-h-dvh">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center p-6 border-b border-border-subtle">
          <JobakLogo size="sm" showText />
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
