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
  score: number;
  source: Source;
  link: string;
  postedAt: string;
  bookmarked: boolean;
  remote?: boolean;
  tags?: string[];
  description?: string;
  matchReasons?: string[];
}

export interface CvInsights {
  topSkills: string[];
  avgScore: number;
  topMatchesCount: number;
  totalJobs: number;
  bookmarkedCount: number;
}
