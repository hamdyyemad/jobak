export interface Step {
  number: string;
  title: string;
  description: string;
  code: string;
}

export const steps: Step[] = [
  {
    number: "I",
    title: "Tell us what you want",
    description: "Complete a 6-step onboarding: pick remote vs on-site, your location, field, skills, job type, and salary range.",
    code: `{
  workPreference: "remote",
  field: "Software Engineering",
  skills: ["React", "TypeScript"],
  experience: 3,
  jobType: "full-time",
  seniority: "mid",
  salary: { min: 60000, max: 90000 }
}`,
  },
  {
    number: "II",
    title: "AI scrapes & ranks",
    description: "Our n8n workflow hits LinkedIn, Indeed, RemoteOK, Wuzzuf and more — then Groq AI scores every listing against your profile.",
    code: `// Scraping 6 sources in parallel...
✓ LinkedIn Jobs        → 142 results
✓ Indeed              → 87 results
✓ RemoteOK            → 34 results
✓ Wuzzuf              → 61 results

// AI ranking by relevance...
✓ 324 jobs scored (0–100)
✓ Top 20 ready for review`,
  },
  {
    number: "III",
    title: "Review your matches",
    description: "Browse AI-ranked jobs on your dashboard. Filter by score, salary, or source. Bookmark favorites and apply in one click.",
    code: `// Your top matches
[
  { title: "Frontend Engineer",
    company: "Stripe",  score: 96,
    location: "Remote", salary: "$85k" },
  { title: "React Developer",
    company: "Linear",  score: 91,
    location: "Remote", salary: "$80k" },
  ...18 more matches
]`,
  },
];
