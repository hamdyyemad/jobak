"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { ParticleBackground } from "@/frontend/components/shared/particle-background";

/**
 * The frame every signed-in page sits in.
 *
 * The sidebar used to live inside `dashboard-client.tsx`, which meant it only
 * existed on `/dashboard` — Settings and the public-profile page rendered with
 * no navigation at all and no way back except the browser's own button.
 *
 * Moving it into the layout also settles what the sidebar is *for*. It is
 * navigation between pages, not a control for one page's internal state, so its
 * entries are links driven by the current route rather than tab callbacks. The
 * dashboard's own jobs/bookmarks split moved down into the dashboard, next to
 * the search and source filters it belongs with.
 */
export function ProtectedShell({ children }: { children: React.ReactNode }) {
    /*
     * Collapse state lives here rather than in each page, so it survives
     * navigating between Dashboard, Profile and Settings — a sidebar that
     * re-expands on every route change is worse than one that does not collapse.
     */
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-(--bg-canvas) relative">
            <ParticleBackground />

            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

            <div className="relative z-10 flex flex-col flex-1 min-w-0 overflow-hidden">{children}</div>
        </div>
    );
}
