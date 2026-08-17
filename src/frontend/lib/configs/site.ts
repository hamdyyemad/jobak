/**
 * Which deployment this build belongs to.
 *
 * `NEXT_PUBLIC_APP_ENV` is the explicit switch we set per pipeline; on Vercel we
 * fall back to `NEXT_PUBLIC_VERCEL_ENV` ("production" | "preview" | "development").
 * `NODE_ENV` is deliberately not used — it is "production" for every built
 * deployment, including the development pipeline.
 */
const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV;

/**
 * Only the production site is exposed to search engines. Anything else — the
 * development pipeline, previews, local builds — stays out of the index, and an
 * unset env var fails closed to "do not index".
 */
export const isProductionSite = appEnv === "production";
