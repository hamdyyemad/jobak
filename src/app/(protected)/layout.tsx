import { Suspense } from "react";
import { ProtectedShell } from "@/frontend/components/protected/shell/protected-shell";

/**
 * The signed-in frame: sidebar on the left, page on the right.
 *
 * This used to be `return children`, which is why the sidebar only existed on
 * `/dashboard` — it was rendered by the dashboard's own client component, so
 * Settings and the public-profile page had no navigation at all.
 *
 * `Suspense` is required, not decorative: the sidebar reads `useSearchParams()`
 * to decide whether Bookmarked is the active entry, and Next refuses to build a
 * page whose layout reads search params without a suspense boundary.
 */
export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense>
      <ProtectedShell>{children}</ProtectedShell>
    </Suspense>
  );
}
