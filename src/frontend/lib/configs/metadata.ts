import type { Metadata, Viewport } from "next";

export const jobakViewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

export const jobakMetadata: Metadata = {
    title: "Jobak — AI-Powered Job Matching Platform",
    description: "Find your perfect job with AI-powered recommendations. Jobak connects you with remote, on-site, and hybrid opportunities tailored to your skills, experience, and preferences.",
    keywords: ["job search", "AI job matching", "remote jobs", "career opportunities", "job finder", "personalized job search", "tech jobs", "software engineering jobs"],
    authors: [{ name: "Jobak" }],
    creator: "Jobak",
    publisher: "Jobak",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://jobak.io",
        title: "Jobak — AI-Powered Job Matching Platform",
        description: "Find your perfect job with AI-powered recommendations tailored to your skills and preferences.",
        siteName: "Jobak",
    },
    twitter: {
        card: "summary_large_image",
        title: "Jobak — AI-Powered Job Matching Platform",
        description: "Find your perfect job with AI-powered recommendations tailored to your skills and preferences.",
        creator: "@jobak",
    }
};