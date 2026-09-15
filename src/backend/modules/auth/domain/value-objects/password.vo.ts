import { WeakPasswordException } from "../exceptions";

/**
 * A password that has passed policy checks.
 *
 * The point of the wrapper is that hashing only accepts this type, so a raw
 * string from a form body cannot reach bcrypt without going through `create`.
 * Validation then cannot be forgotten at a call site — it is structurally
 * required rather than a rule someone has to remember.
 *
 * Nothing here hashes or compares: that needs bcrypt, which is infrastructure.
 * This layer only decides what counts as an acceptable password.
 */

export const MIN_LENGTH = 8;

/**
 * bcrypt hashes at most the first 72 BYTES of its input and silently discards
 * the rest. Two passwords sharing a 72-byte prefix therefore verify against
 * each other's hash, which turns a long passphrase into a weaker secret than
 * the user believes they chose.
 *
 * Rejecting the input is the honest response. The common alternative —
 * pre-hashing with SHA-256 and feeding the digest to bcrypt — works, but it
 * changes the stored format, and doing that silently is worse than telling
 * someone their password is too long.
 *
 * Bytes, not characters: a password of emoji hits this at ~18 characters.
 */
export const MAX_BYTES = 72;

/**
 * Upper bound on what we will even measure. `new TextEncoder().encode()` on a
 * megabyte of submitted text is wasted work, and the request body limit should
 * have caught it long before here.
 */
const ABSURD_LENGTH = 1024;

const byteLength = (value: string) => new TextEncoder().encode(value).length;

export class Password {
  /**
   * Private so the only way to hold one is via `create`, which validates.
   * Without this, `new Password(anything)` would bypass every rule below.
   */
  private constructor(readonly value: string) {}

  static create(raw: unknown): Password {
    if (typeof raw !== "string" || raw.length === 0) {
      throw new WeakPasswordException("Please enter a password.");
    }

    if (raw.length > ABSURD_LENGTH) {
      throw new WeakPasswordException(
        `Passwords must be ${MAX_BYTES} bytes or fewer.`,
      );
    }

    /*
     * No trimming. Leading and trailing spaces are legitimate characters in a
     * password, and silently stripping them means a password typed one way is
     * stored another — which breaks verification in ways that are miserable to
     * debug. Email gets trimmed; this deliberately does not.
     */
    if (raw.length < MIN_LENGTH) {
      throw new WeakPasswordException(
        `Password must be at least ${MIN_LENGTH} characters.`,
      );
    }

    if (byteLength(raw) > MAX_BYTES) {
      throw new WeakPasswordException(
        `Password is too long — it must be ${MAX_BYTES} bytes or fewer. ` +
          `Accented or emoji characters count as more than one byte.`,
      );
    }

    return new Password(raw);
  }

  /**
   * For verifying a login attempt, where the stored password predates any
   * current policy. Applying `create`'s rules here would lock out everyone
   * whose password was set under looser ones — the check that matters at login
   * is whether the hash matches, nothing else.
   */
  static forVerification(raw: unknown): string {
    return typeof raw === "string" ? raw : "";
  }

  /** Keeps the secret out of logs, error dumps and `console.log`. */
  toString() {
    return "[Password]";
  }

  toJSON() {
    return "[Password]";
  }
}
