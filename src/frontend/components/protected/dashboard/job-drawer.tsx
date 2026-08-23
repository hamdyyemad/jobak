"use client";

import { useEffect } from "react";
import { X, ArrowUpRight, Bookmark, BookmarkCheck, MapPin, Clock, Banknote, Wifi, ExternalLink, CheckCircle2 } from "lucide-react";
import { Job } from "@/frontend/types/dashboard";
import { sourceColor } from "./data";
import { ScoreBadge } from "./score-badge";

interface JobDrawerProps {
  job: Job | null;
  onClose: () => void;
  onToggleBookmark: (id: string) => void;
}

export function JobDrawer({ job, onClose, onToggleBookmark }: JobDrawerProps) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = job !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={job?.title ?? "Job detail"}
        className={`fixed top-0 right-0 bottom-0 z-40 w-full max-w-[480px] flex flex-col bg-(--bg-panel) border-l border-border-standard shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {job && <DrawerContent job={job} onClose={onClose} onToggleBookmark={onToggleBookmark} />}
      </div>
    </>
  );
}

function DrawerContent({ job, onClose, onToggleBookmark }: { job: Job; onClose: () => void; onToggleBookmark: (id: string) => void }) {
  const score = job.score;
  const scoreRing =
    score === null
      ? "border-border-standard bg-white/3"
      : score >= 90
      ? "border-green-500/40 bg-green-500/8"
      : score >= 75
      ? "border-yellow-500/40 bg-yellow-500/8"
      : "border-border-standard bg-white/3";

  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-4 px-6 pt-6 pb-5 border-b border-border-subtle shrink-0">
        {/* Company avatar */}
        <div className="w-12 h-12 rounded-xl bg-white/6 border border-border-standard flex items-center justify-center text-lg font-bold text-(--fg-secondary) shrink-0">
          {job.company[0]}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-(--fg-primary) leading-snug">{job.title}</h2>
          <p className="text-sm text-(--fg-tertiary) mt-0.5">{job.company}</p>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-(--fg-tertiary) hover:text-(--fg-primary) hover:bg-white/5 transition-all shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Score ring */}
        <div className={`flex items-center justify-between p-4 rounded-xl border ${scoreRing}`}>
          <div>
            <p className="text-xs text-(--fg-tertiary) uppercase tracking-wide font-medium">Match Score</p>
            {score === null ? (
              <p className="text-sm text-(--fg-tertiary) mt-1 max-w-[15rem]">
                Not scored yet — your AI provider rates this against your profile on the next run.
              </p>
            ) : (
              <p className="text-3xl font-mono font-bold text-(--fg-primary) mt-0.5">
                {score}
                <span className="text-base text-(--fg-tertiary) font-normal">%</span>
              </p>
            )}
          </div>
          <ScoreBadge score={job.score} />
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          <MetaPill icon={MapPin} label={job.location} />
          <MetaPill icon={Clock} label={job.type} capitalize />
          {job.salary && <MetaPill icon={Banknote} label={job.salary} />}
          {job.remote && <MetaPill icon={Wifi} label="Remote" accent />}
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${sourceColor(job.source)}`}>
            {job.source}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-standard text-(--fg-quaternary) text-xs">
            {job.postedAt}
          </span>
        </div>

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div>
            <SectionLabel>Skills & Tags</SectionLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {job.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg text-xs bg-accent/8 border border-accent/20 text-accent-text">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Why it matches */}
        {job.matchReasons && job.matchReasons.length > 0 && (
          <div>
            <SectionLabel>Why it matches your CV</SectionLabel>
            <ul className="mt-2 space-y-2">
              {job.matchReasons.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm text-(--fg-secondary)">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div>
            <SectionLabel>About the role</SectionLabel>
            <JobDescription html={job.description} />
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="px-6 py-4 border-t border-border-subtle flex items-center gap-3 shrink-0">
        <a
          href={job.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-(--bg-canvas) font-semibold text-sm hover:bg-accent-bright transition-all shadow-[0_0_20px_oklch(0.82_0.20_145_/_0.15)]"
        >
          Apply Now
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => onToggleBookmark(job.id)}
          className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
            job.bookmarked
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border-standard text-(--fg-tertiary) hover:text-accent hover:border-accent/30 bg-white/2"
          }`}
          title={job.bookmarked ? "Remove bookmark" : "Bookmark"}
        >
          {job.bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>
    </>
  );
}

function MetaPill({ icon: Icon, label, capitalize, accent }: { icon: React.ElementType; label: string; capitalize?: boolean; accent?: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${
      accent
        ? "border-accent/30 bg-accent/8 text-accent-text"
        : "border-border-standard text-(--fg-tertiary) bg-white/2"
    } ${capitalize ? "capitalize" : ""}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}

/**
 * The posting's own formatting, preserved.
 *
 * Descriptions arrive as HTML now rather than a flattened paragraph, so the
 * headings and bullet lists a posting was written with survive to the screen.
 *
 * `dangerouslySetInnerHTML` is safe here only because of what is behind it:
 * the value has been through `sanitizeDescription` on the server, which reduces
 * arbitrary source markup to a fixed allowlist — no scripts, no styles, no
 * attributes except a scheme-checked `href`. Never point this at a string that
 * has not been through that.
 *
 * Tailwind is not used for the inner elements because they come from a string
 * and cannot carry classes, so the spacing is set on the container instead.
 */
function JobDescription({ html }: { html: string }) {
  return (
    <div
      className="mt-2 text-sm text-(--fg-secondary) leading-relaxed space-y-3
                 [&_p]:my-2
                 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:space-y-1
                 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:space-y-1
                 [&_li]:leading-relaxed
                 [&_h3]:text-(--fg-primary) [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-1
                 [&_h4]:text-(--fg-primary) [&_h4]:font-semibold [&_h4]:text-sm [&_h4]:mt-3 [&_h4]:mb-1
                 [&_h5]:text-(--fg-primary) [&_h5]:font-semibold [&_h5]:mt-3
                 [&_h6]:text-(--fg-primary) [&_h6]:font-semibold [&_h6]:mt-3
                 [&_strong]:text-(--fg-primary) [&_strong]:font-semibold
                 [&_b]:text-(--fg-primary) [&_b]:font-semibold
                 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-words
                 [&_blockquote]:border-l-2 [&_blockquote]:border-border-standard [&_blockquote]:pl-3 [&_blockquote]:italic
                 [&_code]:bg-white/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
                 [&_pre]:bg-white/5 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-xs"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-(--fg-quaternary)">{children}</p>
  );
}
