import { AuthException } from "./auth.exception";

/**
 * The submitted password fails policy. The message is the specific reason —
 * too short, too long, missing — because unlike a login failure there is no
 * secret to protect here: the user is choosing the value, not guessing it.
 */
export class WeakPasswordException extends AuthException {
  constructor(userMessage: string) {
    super("weak_password", userMessage);
  }
}
