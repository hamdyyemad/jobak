/**
 * A refresh-token session, mirroring the `sessions` table.
 *
 * The access token has no representation here on purpose: it is a signed JWT,
 * stored nowhere, and valid purely because it verifies. This is the stateful
 * half — the part that makes revocation possible.
 *
 * Lifetimes live in `../policies/token-lifetimes` rather than here: how long a
 * session lasts is a decision, while this file is only the shape of one.
 */

export interface Session {
  id: string;
  userId: string;
  /** SHA-256 of the token. The token itself exists only in the user's cookie. */
  refreshTokenHash: string;
  expiresAt: Date;
  /** Set when rotated or explicitly signed out. Null means live. */
  revokedAt: Date | null;
  /** The session that superseded this one, forming the rotation chain. */
  replacedBy: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export const isExpired = (session: Session, now: Date = new Date()) =>
  session.expiresAt.getTime() <= now.getTime();

export const isRevoked = (session: Session) => session.revokedAt !== null;

/**
 * Usable means live: not revoked, not expired.
 *
 * Note what this does NOT check — that the presented token hashes to
 * `refreshTokenHash`. That comparison belongs to the caller, which looks the
 * session up *by* that hash; re-checking it here would be theatre.
 */
export const isUsable = (session: Session, now: Date = new Date()) =>
  !isRevoked(session) && !isExpired(session, now);

/**
 * A revoked session being presented again means the token was captured: the
 * legitimate holder's copy was replaced at rotation, so only a stolen copy can
 * still be offered.
 *
 * Distinguished from plain expiry because the response differs — expiry means
 * "sign in again", reuse means "revoke every session this user has".
 *
 * Bounded to unexpired sessions on purpose: once a session is past
 * `expiresAt`, a replayed token is worthless anyway, and treating every stale
 * cookie from a month ago as a theft signal would mean mass revocations
 * triggered by nothing.
 */
export const isReuse = (session: Session, now: Date = new Date()) =>
  isRevoked(session) && !isExpired(session, now);
