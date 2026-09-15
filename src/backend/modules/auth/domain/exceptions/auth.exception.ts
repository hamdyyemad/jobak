/**
 * The base auth failure.
 *
 * Every subclass represents something that can legitimately happen to a
 * well-behaved user, so each carries a message that is safe to show them. That
 * is the split against `lib/errors.ts`: that module translates *unexpected*
 * infrastructure failures into something printable, while these are the
 * expected outcomes of the auth flows themselves.
 *
 * `code` exists so callers can branch without matching on prose — the HTTP
 * layer maps it to a status, and the UI may key off it for field-level errors.
 */

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_taken"
  | "weak_password"
  | "invalid_email"
  | "email_not_verified"
  | "invalid_token"
  | "token_expired"
  | "session_revoked"
  | "session_reuse_detected"
  | "rate_limited";

export class AuthException extends Error {
  readonly code: AuthErrorCode;

  /**
   * What the user is told. Deliberately separate from `message`, which stays
   * developer-facing and ends up in logs — conflating the two is how internal
   * detail leaks into the UI.
   */
  readonly userMessage: string;

  constructor(code: AuthErrorCode, userMessage: string, message?: string) {
    super(message ?? `${code}: ${userMessage}`);
    /*
     * Subclasses set this to their own name. Without it every subclass would
     * report "Error" — V8 does not derive `name` from the constructor, and a
     * stack trace that cannot name the failure is a poor one.
     */
    this.name = new.target.name;
    this.code = code;
    this.userMessage = userMessage;
  }
}

export function isAuthException(error: unknown): error is AuthException {
  return error instanceof AuthException;
}
