export type JobType = "full-time" | "part-time" | "freelance" | "contract";

/**
 * A source's display name, straight from the `sources` table.
 *
 * Deliberately not a union: the collectors add sources over time, and a fixed
 * list meant every new one fell back to whichever name happened to be first.
 * Unknown names get a neutral chip colour rather than the wrong label.
 */
export type Source = string;

/** What the posting says about being in an office — distinct from contract type. */
export type Workplace = "remote" | "onsite" | "hybrid";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: JobType;
  /** Remote / onsite / hybrid, as collected. */
  workplace: Workplace;
  salary: string;
  /**
   * The AI match score, 0-100 — or `null` when nothing has scored this yet.
   *
   * Nullable on purpose. The dashboard lists jobs straight from the shared pool
   * alongside scored ones, and collapsing "unscored" to `0` made every new
   * listing look like a terrible match instead of a pending one.
   */
  score: number | null;
  source: Source;
  link: string;
  postedAt: string;
  bookmarked: boolean;
  remote?: boolean;
  tags?: string[];
  /**
   * Sanitised HTML, not plain text.
   *
   * Descriptions keep their headings and bullet lists now; they used to be
   * flattened to one unbroken paragraph. Always passed through
   * `sanitizeDescription` server-side before it reaches a component.
   */
  description?: string;
  /** The scorer's one-line reason, when it has run. */
  matchReasons?: string[];
}

export interface CvInsights {
  topSkills: string[];
  avgScore: number;
  topMatchesCount: number;
  totalJobs: number;
  bookmarkedCount: number;
}
