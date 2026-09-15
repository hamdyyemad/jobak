import { AuthException } from "./auth.exception";

/**
 * A one-time token (email verification, password reset) does not exist, or has
 * already been redeemed.
 *
 * The two are reported identically: a replayed link and an invented one are
 * indistinguishable to the user, and separating them would confirm to a
 * guesser that a particular token value once existed.
 */
export class InvalidTokenException extends AuthException {
  constructor(reason?: string) {
    super(
      "invalid_token",
      "That link is invalid or has already been used. Please request a new one.",
      reason ? `invalid token: ${reason}` : undefined,
    );
  }
}
