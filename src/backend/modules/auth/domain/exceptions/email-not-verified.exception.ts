import { AuthException } from "./auth.exception";

/**
 * Credentials were correct, but the address has not been confirmed.
 *
 * Distinct from `InvalidCredentialsException` because it is only ever raised
 * *after* the password check passes — so it reveals nothing to someone who does
 * not already hold the password, and the user genuinely needs to be told to go
 * and look in their inbox.
 */
export class EmailNotVerifiedException extends AuthException {
  constructor() {
    super(
      "email_not_verified",
      "Please confirm your email address first — check your inbox for the link.",
    );
  }
}
