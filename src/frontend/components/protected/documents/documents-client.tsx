"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/frontend/components/ui/page-header";
import { Field, Input, Textarea, textareaClass } from "@/frontend/components/ui/field";
import { DocumentGenerator } from "./document-generator";

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
            <div className="px-6 py-8">
                <PageHeader
                    breadcrumb={["Dashboard", "Documents"]}
                    title="Application documents"
                    description="Paste any job description — from Jobak or anywhere else — and generate a CV review, tailored bullets, a cover letter or an email to HR. Everything runs on your own AI key."
                    backHref="/dashboard"
                />

                <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
                    {/* ── The posting ───────────────────────────── */}
                    <section className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Role" htmlFor="job-title">
                                <Input
                                    id="job-title"
                                    value={jobTitle}
                                    onChange={(event) => setJobTitle(event.target.value)}
                                    placeholder="Senior Backend Engineer"
                                />
                            </Field>
                            <Field label="Company" htmlFor="company">
                                <Input
                                    id="company"
                                    value={company}
                                    onChange={(event) => setCompany(event.target.value)}
                                    placeholder="Instabug"
                                />
                            </Field>
                        </div>

                        <div>
                            <Field
                                label="Job description"
                                htmlFor="jd"
                                hint="Paste the whole posting. The requirements section is what most of this is built from."
                            >
                                <Textarea
                                    id="jd"
                                    value={jobDescription}
                                    onChange={(event) => setJobDescription(event.target.value)}
                                    rows={16}
                                    placeholder="Paste the job description here…"
                                    className="font-mono text-[13px]"
                                />
                            </Field>
                            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-quaternary tabular-nums">
                                {jobDescription.trim().length} characters
                                {jobDescription.trim().length > 0 && jobDescription.trim().length < 80 && (
                                    <span className="text-status-amber"> — need at least 80</span>
                                )}
                            </p>
                        </div>

                        {/*
                          Collapsed by default. Pasting a CV materially improves
                          every output, but demanding it up front is a wall in
                          front of the thing people came to do.
                        */}
                        <div className="rounded-card border border-border-subtle bg-(image:--surface-1)">
                            <button
                                type="button"
                                onClick={() => setCvOpen((open) => !open)}
                                aria-expanded={cvOpen}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                            >
                                <span className="text-[13px] font-medium text-fg-primary">
                                    Your CV{" "}
                                    <span className="font-normal text-fg-quaternary">
                                        — optional, but makes everything sharper
                                    </span>
                                </span>
                                <ChevronDown
                                    className={`size-4 shrink-0 text-fg-tertiary transition-transform ${cvOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {cvOpen && (
                                <div className="px-4 pb-4">
                                    <textarea
                                        value={cvText}
                                        onChange={(event) => setCvText(event.target.value)}
                                        rows={10}
                                        placeholder="Paste your CV as plain text…"
                                        className={`${textareaClass} font-mono text-[13px]`}
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
