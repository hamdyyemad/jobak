"use client";

import { useEffect } from "react";
import { X, Bookmark, BookmarkCheck, MapPin, Clock, Banknote, Wifi, ExternalLink, CheckCircle2 } from "lucide-react";
import { Job } from "@/frontend/types/dashboard";
import { sourceHue } from "./data";
import { Chip } from "@/frontend/components/ui/chip";
import { ScoreBadge } from "./score-badge";
import { DocumentGenerator } from "@/frontend/components/protected/documents/document-generator";

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
  /*
   * Thresholds match ScoreBadge (80 / 60), not the 90 / 75 this used before.
   * The drawer and the card disagreed about what counted as a strong match, so
   * an 82 rendered green in the list and neutral once you opened it.
   */
  const scoreTint =
    score === null || score < 60
      ? "var(--score-low)"
      : score >= 80
      ? "var(--score-high)"
      : "var(--score-mid)";

  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-4 px-6 pt-6 pb-5 border-b border-border-subtle shrink-0">
        {/* Company avatar */}
        <div className="flex size-12 shrink-0 items-center justify-center rounded-card border border-border-standard bg-white/6 text-lg font-semibold text-fg-secondary">
          {job.company[0]}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-(--fg-primary) leading-snug">{job.title}</h2>
          <p className="text-sm text-(--fg-tertiary) mt-0.5">{job.company}</p>
        </div>

        <button
          onClick={onClose}
          className="flex size-8 shrink-0 items-center justify-center rounded-control text-fg-tertiary transition-all hover:bg-white/5 hover:text-fg-primary"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Score ring */}
        <div className="rounded-card border border-border-subtle bg-(image:--surface-1) p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.17em] text-fg-quaternary">
                Match score
              </p>
              {score === null ? (
                <p className="mt-2 max-w-[17rem] text-sm text-fg-tertiary">
                  Not scored yet — your AI provider rates this against your profile on the next run.
                </p>
              ) : (
                <p className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-fg-primary">
                  {score}
                  <span className="ml-0.5 text-lg font-normal text-fg-quaternary">/100</span>
                </p>
              )}
            </div>
            <ScoreBadge score={job.score} />
          </div>

          {score !== null && (
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: scoreTint }}
              />
            </div>
          )}
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2">
          <MetaPill icon={MapPin} label={job.location} />
          <MetaPill icon={Clock} label={job.type} capitalize />
          {job.salary && <MetaPill icon={Banknote} label={job.salary} />}
          {job.remote && <MetaPill icon={Wifi} label="Remote" accent />}
          <Chip dot={sourceHue(job.source)} className="px-3 py-1.5">
            {job.source}
          </Chip>
          <Chip className="px-3 py-1.5 text-fg-quaternary">{job.postedAt}</Chip>
        </div>

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div>
            <SectionLabel>Skills & Tags</SectionLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {job.tags.map((tag) => (
                <span key={tag} className="rounded-chip border border-accent/20 bg-accent/8 px-2.5 py-1 text-[11.5px] text-accent-text">
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

        {/*
          Apply-with help, in the place someone decides whether to apply. The
          description is the input, so this sits with it rather than behind
          another click — and it falls back to the standalone page for the
          sources that publish no description.
        */}
        <div>
          <SectionLabel>Apply with AI</SectionLabel>
          <div className="mt-3">
            <DocumentGenerator
              jobDescription={stripTags(job.description ?? "")}
              jobTitle={job.title}
              company={job.company}
            />
          </div>
        </div>

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
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-control bg-accent text-[13.5px] font-medium text-[#06210f] transition-colors hover:bg-accent-bright"
        >
          Apply now
          <ExternalLink className="size-3.5" />
        </a>
        <button
          onClick={() => onToggleBookmark(job.id)}
          className={`flex size-10 items-center justify-center rounded-control border transition-all ${
            job.bookmarked
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border-standard bg-white/2.5 text-fg-tertiary hover:border-accent/30 hover:text-accent"
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
    <span className={`flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-[11.5px] ${
      accent
        ? "border-accent/30 bg-accent/8 text-accent-text"
        : "border-border-standard bg-white/2.5 text-fg-secondary"
    } ${capitalize ? "capitalize" : ""}`}>
      <Icon className="size-3 shrink-0" />
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
                 [&_pre]:bg-white/5 [&_pre]:p-3 [&_pre]:rounded-control [&_pre]:overflow-x-auto [&_pre]:text-xs"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * The stored description is sanitised HTML; the model wants prose.
 *
 * Sending tags would spend the user's tokens on markup and give the model a
 * worse prompt — and `<li>` boundaries survive as line breaks, which is exactly
 * the structure a requirements list needs to keep.
 */
function stripTags(html: string): string {
  return html
    .replace(/<\/(p|li|h[1-6]|blockquote|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[9.5px] uppercase tracking-[0.17em] text-fg-quaternary">{children}</p>
  );
}
