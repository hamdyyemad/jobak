interface FooterLink {
    name: string;
    href: string;
    badge?: string;
}

interface FooterSection {
    title: string;
    links: FooterLink[];
}

export const footerSections: FooterSection[] = [
    {
        title: "Product",
        links: [
            { name: "How it works", href: "#how-it-works" },
            { name: "Features", href: "#features" },
            { name: "Pricing", href: "#pricing" },
            { name: "Job sources", href: "#integrations" },
        ],
    },
    {
        title: "Resources",
        links: [
            { name: "Get started", href: "/onboarding" },
            { name: "Dashboard", href: "/dashboard" },
            { name: "API docs", href: "#" },
            { name: "Status", href: "#" },
        ],
    },
    {
        title: "Company",
        links: [
            { name: "About", href: "#" },
            { name: "Blog", href: "#" },
            { name: "Careers", href: "#", badge: "Hiring" },
            { name: "Contact", href: "#" },
        ],
    },
    {
        title: "Legal",
        links: [
            { name: "Privacy", href: "#" },
            { name: "Terms", href: "#" },
            { name: "Security", href: "#" },
        ],
    },
];

export const socialLinks = [
    { name: "Twitter", href: "#" },
    { name: "GitHub", href: "#" },
    { name: "LinkedIn", href: "#" },
];
