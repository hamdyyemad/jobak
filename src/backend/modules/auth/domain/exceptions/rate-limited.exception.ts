import { AuthException } from "./auth.exception";

/**
 * Too many attempts. Raised by the login and token-issuing flows, which are
 * the ones worth guessing against.
 *
 * `retryAfterSeconds` is carried so the HTTP layer can set a `Retry-After`
 * header rather than inventing one.
 */
export class RateLimitedException extends AuthException {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      "rate_limited",
      "Too many attempts. Please wait a moment and try again.",
      `rate limited for ${retryAfterSeconds}s`,
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
