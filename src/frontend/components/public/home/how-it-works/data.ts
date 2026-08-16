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
    title: "AI searches & ranks",
    description: "Our n8n workflow searches job platforms for openings that fit your profile — then Groq AI scores every listing against it.",
    code: `// Searching job platforms...
✓ Collecting open roles
✓ Removing duplicates
✓ Matching against your profile

// AI ranking by relevance...
✓ Every listing scored (0–100)
✓ Best matches ready for review`,
  },
  {
    number: "III",
    title: "Review your matches",
    description: "Browse AI-ranked jobs on your dashboard. Filter by score, salary, or job type. Bookmark favorites and apply in one click.",
    code: `// Your top matches
[
  { title: "Frontend Engineer",
    company: "Acme Corp", score: 96,
    location: "Remote", salary: "$85k" },
  { title: "React Developer",
    company: "Northwind", score: 91,
    location: "Remote", salary: "$80k" },
  ...more matches
]`,
  },
];
