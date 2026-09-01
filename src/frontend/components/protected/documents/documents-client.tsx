"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { DocumentGenerator } from "./document-generator";

const INPUT =
    "w-full rounded-xl border border-border-standard bg-white/2 px-3.5 py-2.5 text-[15px] text-fg-primary placeholder:text-fg-quaternary focus:border-accent/50 focus:outline-none transition-colors";

/**
 * The standalone document workspace.
 *
 * Layout is two columns on a wide screen because the two halves are used
 * together: people re-read the posting while checking what the model wrote
 * about it, and a stacked layout makes that a scroll each way.
 */
export function DocumentsClient() {
    const [jobDescription, setJobDescription] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [company, setCompany] = useState("");
    const [cvText, setCvText] = useState("");
    const [cvOpen, setCvOpen] = useState(false);

    return (
        <main className="flex-1 overflow-y-auto bg-(--bg-canvas)">
            <div className="max-w-6xl mx-auto px-6 py-10 lg:py-14">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-fg-tertiary hover:text-fg-primary mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Dashboard
                </Link>

                <h1 className="text-3xl font-display tracking-tight">Application documents</h1>
                <p className="mt-3 text-[15px] text-fg-secondary leading-relaxed max-w-2xl">
                    Paste any job description — from Jobak or anywhere else — and generate a CV review,
                    tailored bullets, a cover letter or an email to HR. Everything runs on your own AI
                    key.
                </p>

                <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-10">
                    {/* ── The posting ───────────────────────────── */}
                    <section className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="job-title" className="block text-sm font-medium text-fg-primary mb-1.5">
                                    Role
                                </label>
                                <input
                                    id="job-title"
                                    value={jobTitle}
                                    onChange={(event) => setJobTitle(event.target.value)}
                                    placeholder="Senior Backend Engineer"
                                    className={INPUT}
                                />
                            </div>
                            <div>
                                <label htmlFor="company" className="block text-sm font-medium text-fg-primary mb-1.5">
                                    Company
                                </label>
                                <input
                                    id="company"
                                    value={company}
                                    onChange={(event) => setCompany(event.target.value)}
                                    placeholder="Instabug"
                                    className={INPUT}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="jd" className="block text-sm font-medium text-fg-primary mb-1.5">
                                Job description
                            </label>
                            <p className="text-xs text-fg-quaternary mb-2">
                                Paste the whole posting. The requirements section is what most of this is
                                built from.
                            </p>
                            <textarea
                                id="jd"
                                value={jobDescription}
                                onChange={(event) => setJobDescription(event.target.value)}
                                rows={16}
                                placeholder="Paste the job description here…"
                                className={`${INPUT} resize-y font-mono text-[13px] leading-relaxed`}
                            />
                            <p className="mt-1.5 text-xs text-fg-quaternary tabular-nums">
                                {jobDescription.trim().length} characters
                                {jobDescription.trim().length > 0 && jobDescription.trim().length < 80 && (
                                    <span className="text-(--status-amber)"> — need at least 80</span>
                                )}
                            </p>
                        </div>

                        {/*
                          Collapsed by default. Pasting a CV materially improves
                          every output, but demanding it up front is a wall in
                          front of the thing people came to do.
                        */}
                        <div className="rounded-xl border border-border-standard bg-white/2">
                            <button
                                type="button"
                                onClick={() => setCvOpen((open) => !open)}
                                aria-expanded={cvOpen}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                            >
                                <span className="text-sm font-medium text-fg-primary">
                                    Your CV{" "}
                                    <span className="font-normal text-fg-quaternary">
                                        — optional, but makes everything sharper
                                    </span>
                                </span>
                                <ChevronDown
                                    className={`w-4 h-4 text-fg-tertiary shrink-0 transition-transform ${cvOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {cvOpen && (
                                <div className="px-4 pb-4">
                                    <textarea
                                        value={cvText}
                                        onChange={(event) => setCvText(event.target.value)}
                                        rows={10}
                                        placeholder="Paste your CV as plain text…"
                                        className={`${INPUT} resize-y font-mono text-[13px] leading-relaxed`}
                                    />
                                    <p className="mt-1.5 text-xs text-fg-quaternary">
                                        Sent to your AI provider with the request. Not stored by Jobak.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── The output ────────────────────────────── */}
                    <section>
                        <DocumentGenerator
                            jobDescription={jobDescription}
                            jobTitle={jobTitle || undefined}
                            company={company || undefined}
                            cvText={cvText || undefined}
                            layout="page"
                        />
                    </section>
                </div>
            </div>
        </main>
    );
}
