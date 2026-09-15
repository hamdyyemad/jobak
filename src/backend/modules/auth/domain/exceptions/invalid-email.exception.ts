import { AuthException } from "./auth.exception";

/** The submitted value is not a usable email address. */
export class InvalidEmailException extends AuthException {
  constructor(userMessage = "Please enter a valid email address.") {
    super("invalid_email", userMessage);
  }
}
