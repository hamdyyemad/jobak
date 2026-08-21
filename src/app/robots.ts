import type { MetadataRoute } from "next";

import { isProductionSite } from "@/frontend/lib";

/**
 * The `robots` meta tag only helps once a crawler renders a page. This blocks
 * non-production deployments (development pipeline, previews) at the crawl level.
 */
export default function robots(): MetadataRoute.Robots {
    if (!isProductionSite) {
        return {
            rules: {
                userAgent: "*",
                disallow: "/",
            },
        };
    }

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/auth/"],
        },
    };
}
