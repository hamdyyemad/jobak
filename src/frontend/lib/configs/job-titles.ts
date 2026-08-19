/**
 * The controlled vocabulary the onboarding flow accepts for field and job title.
 *
 * Free text was producing unmatchable input ("dev", "s/w eng", "Softwar"), and
 * the matching workflow has to compare titles across sources — so both ends of
 * that comparison now come from this list.
 */

export interface JobField {
    /** Stable value persisted to `user_preferences.field`. */
    value: string;
    label: string;
    titles: string[];
}

export const jobFields: JobField[] = [
    {
        value: "software-engineering",
        label: "Software Engineering",
        titles: [
            "Frontend Engineer",
            "Backend Engineer",
            "Full Stack Engineer",
            "Mobile Engineer (iOS)",
            "Mobile Engineer (Android)",
            "React Native Engineer",
            "Embedded Systems Engineer",
            "Game Developer",
            "Software Engineer in Test",
            "Engineering Manager",
            "Staff Engineer",
            "Solutions Architect",
        ],
    },
    {
        value: "data",
        label: "Data & Analytics",
        titles: [
            "Data Analyst",
            "Data Engineer",
            "Data Scientist",
            "Analytics Engineer",
            "Business Intelligence Analyst",
            "Database Administrator",
            "Research Scientist",
        ],
    },
    {
        value: "ai-ml",
        label: "AI & Machine Learning",
        titles: [
            "Machine Learning Engineer",
            "AI Engineer",
            "MLOps Engineer",
            "Computer Vision Engineer",
            "NLP Engineer",
            "Prompt Engineer",
            "Applied Scientist",
        ],
    },
    {
        value: "devops",
        label: "DevOps & Infrastructure",
        titles: [
            "DevOps Engineer",
            "Site Reliability Engineer",
            "Platform Engineer",
            "Cloud Engineer",
            "Infrastructure Engineer",
            "Release Engineer",
            "Systems Administrator",
        ],
    },
    {
        value: "security",
        label: "Security",
        titles: [
            "Security Engineer",
            "Application Security Engineer",
            "Penetration Tester",
            "Security Analyst",
            "Incident Response Analyst",
            "Compliance Analyst",
            "Security Architect",
        ],
    },
    {
        value: "design",
        label: "Design",
        titles: [
            "Product Designer",
            "UX Designer",
            "UI Designer",
            "UX Researcher",
            "Graphic Designer",
            "Motion Designer",
            "Brand Designer",
            "Design Systems Designer",
            "Design Manager",
        ],
    },
    {
        value: "product",
        label: "Product",
        titles: [
            "Product Manager",
            "Technical Product Manager",
            "Product Owner",
            "Program Manager",
            "Business Analyst",
            "Product Operations Manager",
        ],
    },
    {
        value: "marketing",
        label: "Marketing",
        titles: [
            "Digital Marketing Specialist",
            "Content Marketer",
            "SEO Specialist",
            "Performance Marketing Manager",
            "Social Media Manager",
            "Growth Marketer",
            "Email Marketing Specialist",
            "Brand Manager",
            "Marketing Manager",
        ],
    },
    {
        value: "sales",
        label: "Sales & Business Development",
        titles: [
            "Sales Development Representative",
            "Account Executive",
            "Account Manager",
            "Solutions Engineer",
            "Partnerships Manager",
            "Business Development Manager",
            "Sales Manager",
        ],
    },
    {
        value: "customer-success",
        label: "Customer Success & Support",
        titles: [
            "Customer Support Specialist",
            "Customer Success Manager",
            "Technical Support Engineer",
            "Implementation Specialist",
            "Community Manager",
        ],
    },
    {
        value: "finance",
        label: "Finance & Accounting",
        titles: [
            "Accountant",
            "Financial Analyst",
            "Controller",
            "Bookkeeper",
            "Payroll Specialist",
            "Auditor",
            "Finance Manager",
        ],
    },
    {
        value: "operations",
        label: "Operations & HR",
        titles: [
            "Operations Manager",
            "Project Manager",
            "Recruiter",
            "Technical Recruiter",
            "People Operations Specialist",
            "Office Manager",
            "Executive Assistant",
        ],
    },
    {
        value: "content",
        label: "Content & Writing",
        titles: [
            "Technical Writer",
            "Copywriter",
            "Content Strategist",
            "Editor",
            "Localization Specialist",
        ],
    },
];

/** Titles for one field, or every title when no field is chosen yet. */
export function titlesForField(field: string): string[] {
    const match = jobFields.find((f) => f.value === field);
    if (match) return match.titles;
    return jobFields.flatMap((f) => f.titles).sort((a, b) => a.localeCompare(b, "en"));
}

export function fieldLabel(value: string): string {
    return jobFields.find((f) => f.value === value)?.label ?? value;
}
