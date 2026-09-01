import type { Metadata } from "next";
import { DocumentsClient } from "@/frontend/components/protected/documents/documents-client";

export const metadata: Metadata = {
  title: "Application documents — Jobak",
  robots: { index: false, follow: false },
};

/**
 * Paste any job description, get the four application documents.
 *
 * Exists separately from the job drawer because most applications do not start
 * in Jobak. Someone finds a role on LinkedIn or gets it forwarded by a friend,
 * and the useful thing is to help with *that* posting rather than to insist it
 * be collected first.
 *
 * It is also the fallback for the several sources that publish no description —
 * the drawer sends people here with a link when it has nothing to work from.
 */
export default function DocumentsPage() {
  return <DocumentsClient />;
}
