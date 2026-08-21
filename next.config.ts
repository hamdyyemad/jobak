import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        /*
         * Country flags are static artwork under `public/flags`, regenerated only
         * when someone runs the countries script. Without this they are served
         * with `max-age=0`, so every repeat visit revalidates all 246 of them.
         *
         * `immutable` means a regenerated flag keeps serving from cache until the
         * year is up — acceptable for flags, but if artwork ever does need to
         * change immediately, rename the files or add a version segment to the
         * path in `flagUrl()`.
         */
        source: "/flags/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
