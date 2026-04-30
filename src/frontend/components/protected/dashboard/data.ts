import { Job, Source } from "@/frontend/types/dashboard";

export const MOCK_JOBS: Job[] = [
    { id: "1", title: "Senior Frontend Engineer", company: "Stripe", location: "Remote", type: "full-time", salary: "$120k–$160k", score: 97, source: "LinkedIn", link: "#", postedAt: "2h ago", bookmarked: false },
    { id: "2", title: "React Developer", company: "Linear", location: "Remote", type: "full-time", salary: "$90k–$120k", score: 94, source: "RemoteOK", link: "#", postedAt: "4h ago", bookmarked: false },
    { id: "3", title: "Frontend Engineer", company: "Vercel", location: "Remote", type: "full-time", salary: "$100k–$140k", score: 91, source: "LinkedIn", link: "#", postedAt: "6h ago", bookmarked: true },
    { id: "4", title: "UI Engineer", company: "Figma", location: "Remote / SF", type: "full-time", salary: "$110k–$150k", score: 88, source: "Indeed", link: "#", postedAt: "8h ago", bookmarked: false },
    { id: "5", title: "JavaScript Engineer", company: "Shopify", location: "Remote", type: "full-time", salary: "$95k–$130k", score: 86, source: "Glassdoor", link: "#", postedAt: "12h ago", bookmarked: false },
    { id: "6", title: "React Native Developer", company: "Expo", location: "Remote", type: "contract", salary: "$80–$100/hr", score: 83, source: "RemoteOK", link: "#", postedAt: "1d ago", bookmarked: false },
    { id: "7", title: "Frontend Team Lead", company: "Notion", location: "Remote / NYC", type: "full-time", salary: "$130k–$170k", score: 80, source: "LinkedIn", link: "#", postedAt: "1d ago", bookmarked: false },
    { id: "8", title: "Web Developer", company: "Wuzzuf Partner", location: "Cairo, Egypt", type: "full-time", salary: "E£25k–E£40k", score: 76, source: "Wuzzuf", link: "#", postedAt: "2d ago", bookmarked: false },
];

export const SOURCE_COLORS: Record<Source, string> = {
    LinkedIn: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Indeed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    RemoteOK: "bg-green-500/10 text-green-400 border-green-500/20",
    Wuzzuf: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Glassdoor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export const SOURCES: (Source | "all")[] = ["all", "LinkedIn", "Indeed", "RemoteOK", "Wuzzuf", "Glassdoor"];
