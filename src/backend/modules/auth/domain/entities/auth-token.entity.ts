/**
 * A one-time token, mirroring the `auth_tokens` table.
 *
 * Email verification and password reset share this shape — a single-use secret
 * mailed to an address, good for a short window — distinguished by `purpose`
 * rather than by having two near-identical types.
 *
 * As with sessions, only the hash is ever stored; the value in the emailed link
 * is the only plaintext copy that should exist.
 */

export type AuthTokenPurpose = "email_verification" | "password_reset";

export interface AuthToken {
  id: string;
  userId: string;
  purpose: AuthTokenPurpose;
  expiresAt: Date;
  /** Set on redemption. Non-null means the link has already been used. */
  consumedAt: Date | null;
  createdAt: Date;
}

export const isConsumed = (token: AuthToken) => token.consumedAt !== null;

export const isExpired = (token: AuthToken, now: Date = new Date()) =>
  token.expiresAt.getTime() <= now.getTime();

/**
 * Redeemable means unused and in date.
 *
 * Callers should still treat `consume` as the real gate: two requests carrying
 * the same link can both pass this check before either writes, so the
 * single-use guarantee has to come from the atomic update, not from here.
 */
export const isRedeemable = (token: AuthToken, now: Date = new Date()) =>
  !isConsumed(token) && !isExpired(token, now);
