import { AuthException } from "./auth.exception";

/**
 * Raised only where an existing account is genuinely not a secret — changing
 * your own email address, say.
 *
 * Registration must NOT use this. Telling an anonymous visitor that an address
 * is registered is the same enumeration leak that
 * `InvalidCredentialsException` exists to avoid; see the register use case for
 * what it does instead.
 */
export class EmailTakenException extends AuthException {
  constructor() {
    super(
      "email_taken",
      "An account with that email already exists. Try signing in instead.",
    );
  }
}
