"use client";

import Link from "next/link";
import { LayoutDashboard, Bookmark, Settings, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { signOut } from "@/backend/actions/auth";
import { JobakLogo } from "@/frontend/components/shared/jobak-logo";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeTab: "jobs" | "bookmarks";
  onTabChange: (tab: "jobs" | "bookmarks") => void;
  bookmarkedCount: number;
}

const NAV = [
  { id: "jobs" as const, label: "Job Matches", icon: LayoutDashboard },
  { id: "bookmarks" as const, label: "Bookmarked", icon: Bookmark },
];

export function Sidebar({ collapsed, onToggle, activeTab, onTabChange, bookmarkedCount }: SidebarProps) {
  return (
    <aside
      className={`relative flex flex-col shrink-0 h-full border-r border-border-subtle bg-(--bg-panel) transition-[width] duration-200 ease-out ${
        collapsed ? "w-[60px]" : "w-[220px]"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-[60px] px-3.5 border-b border-border-subtle shrink-0 overflow-hidden`}>
        {collapsed ? (
          <JobakLogo showText={false} size="sm" href="/" />
        ) : (
          <JobakLogo showText size="sm" href="/" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group whitespace-nowrap overflow-hidden ${
                active
                  ? "bg-accent/10 text-accent-text"
                  : "text-(--fg-tertiary) hover:text-(--fg-primary) hover:bg-white/4"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-accent" : ""}`} />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && id === "bookmarks" && bookmarkedCount > 0 && (
                <span className="ml-auto text-xs font-mono bg-accent/15 text-accent-text px-1.5 py-0.5 rounded-full">
                  {bookmarkedCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="py-3 px-2 border-t border-border-subtle space-y-0.5 shrink-0">
        <Link
          href="/onboarding"
          title={collapsed ? "Settings" : undefined}
          className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm text-(--fg-tertiary) hover:text-(--fg-primary) hover:bg-white/4 transition-all whitespace-nowrap overflow-hidden"
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <form action={signOut} className="w-full">
          <button
            type="submit"
            title={collapsed ? "Sign out" : undefined}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm text-(--fg-tertiary) hover:text-status-rose hover:bg-status-rose/5 transition-all whitespace-nowrap overflow-hidden"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>

      {/* Collapse toggle — anchored at the bottom edge of the sidebar */}
      <button
        onClick={onToggle}
        className="absolute -right-3 bottom-6 w-6 h-6 rounded-full border border-border-strong bg-bg-panel flex items-center justify-center text-(--fg-tertiary) hover:text-(--fg-primary) hover:border-border-strong transition-all z-10 shadow-sm"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
