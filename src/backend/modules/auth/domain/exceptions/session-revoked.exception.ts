import { AuthException } from "./auth.exception";

/**
 * The session is no longer live: signed out elsewhere, expired, or ended by a
 * password change.
 */
export class SessionRevokedException extends AuthException {
  constructor(reason?: string) {
    super(
      "session_revoked",
      "Your session has ended. Please sign in again.",
      reason ? `session revoked: ${reason}` : undefined,
    );
  }
}
