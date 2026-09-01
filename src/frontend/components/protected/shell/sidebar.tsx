"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
    Bookmark,
    ChevronLeft,
    ChevronRight,
    FileText,
    LayoutDashboard,
    LogOut,
    Settings,
    UserRound,
} from "lucide-react";
import { signOut } from "@/backend/actions/auth";
import { JobakLogo } from "@/frontend/components/shared/jobak-logo";

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

/**
 * Route-driven navigation for every signed-in page.
 *
 * Previously this took `activeTab` and `onTabChange` from the dashboard, which
 * is why it could not be lifted into a layout: it was a control for one page's
 * state wearing a navigation bar's clothes. Now every entry is a real link and
 * "which one is active" is read from the URL, so the same component works on
 * Dashboard, Profile and Settings without any of them knowing about it.
 *
 * Bookmarks stays a query parameter rather than becoming its own route. It is a
 * filter over the same list, sharing the same data fetch — but it is a link
 * rather than local state, so it can be deep-linked and can live up here.
 */
const NAV = [
    { href: "/dashboard", label: "Job Matches", icon: LayoutDashboard, exact: true },
    { href: "/dashboard?view=bookmarks", label: "Bookmarked", icon: Bookmark, view: "bookmarks" },
    { href: "/dashboard/documents", label: "Documents", icon: FileText },
    { href: "/dashboard/profile", label: "Public profile", icon: UserRound },
    { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const view = useSearchParams().get("view");

    function isActive(item: (typeof NAV)[number]): boolean {
        const [path] = item.href.split("?");
        if (path !== pathname) return false;

        // `/dashboard` and `/dashboard?view=bookmarks` are the same path, so the
        // query decides which of the two is lit.
        if (item.view) return view === item.view;
        if (item.exact) return !view;
        return true;
    }

    return (
        <aside
            className={`relative flex flex-col shrink-0 h-full border-r border-border-subtle bg-(--bg-panel) transition-[width] duration-200 ease-out ${
                collapsed ? "w-[60px]" : "w-[220px]"
            }`}
        >
            <div className="flex items-center h-[60px] px-3.5 border-b border-border-subtle shrink-0 overflow-hidden">
                <JobakLogo showText={!collapsed} size="sm" href="/" />
            </div>

            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
                {NAV.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed ? item.label : undefined}
                            aria-current={active ? "page" : undefined}
                            className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-control text-sm font-medium transition-all duration-150 whitespace-nowrap overflow-hidden ${
                                active
                                    ? "bg-accent/10 text-accent-text"
                                    : "text-(--fg-tertiary) hover:text-(--fg-primary) hover:bg-white/4"
                            }`}
                        >
                            <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-accent" : ""}`} />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className="py-3 px-2 border-t border-border-subtle shrink-0">
                <form action={signOut} className="w-full">
                    <button
                        type="submit"
                        title={collapsed ? "Sign out" : undefined}
                        className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-control text-sm text-fg-tertiary hover:text-status-rose hover:bg-status-rose/5 transition-all whitespace-nowrap overflow-hidden"
                    >
                        <LogOut className="w-[18px] h-[18px] shrink-0" />
                        {!collapsed && <span>Sign out</span>}
                    </button>
                </form>
            </div>

            <button
                onClick={onToggle}
                className="absolute -right-3 bottom-6 w-6 h-6 rounded-full border border-border-strong bg-bg-panel flex items-center justify-center text-(--fg-tertiary) hover:text-(--fg-primary) transition-all z-10 shadow-sm"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
        </aside>
    );
}
