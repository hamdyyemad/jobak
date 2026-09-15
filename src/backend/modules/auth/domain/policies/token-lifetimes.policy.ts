/**
 * How long each kind of credential stays valid.
 *
 * Separated from the entities because these are decisions, not structure — the
 * shape of a session is a fact, fifteen minutes is a judgement call. Keeping
 * them here means the security trade-offs are in one readable place instead of
 * scattered as literals across use cases.
 */

/**
 * Access token lifetime. Short by design: an access token cannot be revoked —
 * it is valid because it verifies, and nothing is consulted — so this window is
 * exactly how long a stolen one stays useful.
 *
 * Fifteen minutes trades a little refresh traffic for that bound. Raising it
 * weakens logout, password change and reuse detection all at once, since none
 * of them can cut short an access token already in the wild.
 */
export const ACCESS_TOKEN_TTL_MINUTES = 15;

/**
 * Refresh token lifetime, and therefore how long "keep me signed in" lasts.
 * Mirrors the cookie's Max-Age — if the two ever disagree, the shorter one
 * silently wins and the longer becomes a lie.
 */
export const REFRESH_TOKEN_TTL_DAYS = 30;

export const EMAIL_VERIFICATION_TTL_HOURS = 24;

/**
 * Shorter than email verification: a reset link grants an immediate credential
 * change, so its window to be found in an inbox, a shared screen or a proxy log
 * should be small.
 */
export const PASSWORD_RESET_TTL_HOURS = 1;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const accessTokenExpiry = (from: Date = new Date()) =>
  new Date(from.getTime() + ACCESS_TOKEN_TTL_MINUTES * MINUTE_MS);

export const refreshTokenExpiry = (from: Date = new Date()) =>
  new Date(from.getTime() + REFRESH_TOKEN_TTL_DAYS * DAY_MS);

export const emailVerificationExpiry = (from: Date = new Date()) =>
  new Date(from.getTime() + EMAIL_VERIFICATION_TTL_HOURS * HOUR_MS);

export const passwordResetExpiry = (from: Date = new Date()) =>
  new Date(from.getTime() + PASSWORD_RESET_TTL_HOURS * HOUR_MS);
