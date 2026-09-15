import { AuthException } from "./auth.exception";

/**
 * A refresh token was presented twice.
 *
 * The second presentation means a copy exists somewhere it shouldn't: the
 * legitimate holder's token was replaced at rotation, so only a captured copy
 * can still be offered. The response is to revoke every session the user has,
 * not just this one.
 *
 * Kept separate from `SessionRevokedException` because the *handling* differs —
 * this one triggers a full revocation sweep — even though what the user sees is
 * identical.
 *
 * That wording stays neutral deliberately. The far more common cause is a
 * benign race: two tabs refreshing at once, where the loser presents the token
 * the winner just rotated. Alarming someone about theft over that would be
 * wrong, so the alarm goes to the logs instead.
 */
export class SessionReuseDetectedException extends AuthException {
  constructor(userId: string) {
    super(
      "session_reuse_detected",
      "Your session has ended. Please sign in again.",
      `refresh token reuse detected for user ${userId} — revoking session chain`,
    );
  }
}
