import type { Metadata, Viewport } from "next";

import { isProductionSite } from "./site";

export const jobakViewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
};

export const jobakMetadata: Metadata = {
    /*
     * Required for the generated OG and Twitter cards: without it Next resolves
     * `og:image` against localhost, so every shared link points at an image
     * nobody else can load.
     */
    metadataBase: new URL("https://jobak.io"),
    title: "Jobak — AI-Powered Job Matching Platform",
    description: "Find your perfect job with AI-powered recommendations. Jobak connects you with remote, on-site, and hybrid opportunities tailored to your skills, experience, and preferences.",
    keywords: ["job search", "AI job matching", "remote jobs", "career opportunities", "job finder", "personalized job search", "tech jobs", "software engineering jobs"],
    authors: [{ name: "Jobak" }],
    creator: "Jobak",
    publisher: "Jobak",
    /*
     * No hand-written `icons` or `manifest` here on purpose.
     *
     * This block used to point at /favicon-16x16.png, /apple-touch-icon.png,
     * /android-chrome-*.png and /site.webmanifest — none of which were ever
     * served. Those files sit in `src/app/`, and Next only serves a file from
     * there if it matches a metadata convention; anything else needs to be in
     * `public/`. Every one of those URLs 404'd, so the site effectively had no
     * icons and no manifest at all.
     *
     * Icons now come from the conventions themselves — `favicon.ico`,
     * `icon.svg`, `apple-icon.tsx` — and the manifest from `manifest.ts`. Next
     * emits the tags and the hashed URLs, so they cannot fall out of step again.
     */
    robots: isProductionSite
        ? {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-video-preview": -1,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        }
        : {
            index: false,
            follow: false,
            nocache: true,
            googleBot: {
                index: false,
                follow: false,
                noimageindex: true,
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