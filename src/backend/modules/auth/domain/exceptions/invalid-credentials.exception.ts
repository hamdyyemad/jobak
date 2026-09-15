import { AuthException } from "./auth.exception";

/**
 * Wrong password, unknown email, and an account with no password set all raise
 * this same exception on purpose.
 *
 * Distinguishing them would turn the login form into an account oracle: an
 * attacker could enumerate which addresses are registered by watching which
 * ones say "no such user". The previous Supabase implementation made the same
 * choice, and it is worth keeping.
 */
export class InvalidCredentialsException extends AuthException {
  constructor(reason?: string) {
    super(
      "invalid_credentials",
      "That email and password don't match an account.",
      // The real reason is logged, never shown — that is the whole point.
      reason ? `invalid credentials: ${reason}` : undefined,
    );
  }
}
