import { InvalidEmailException } from "../exceptions";

/**
 * A syntactically valid email address, trimmed.
 *
 * Same contract as `Password`: private constructor, so a raw form value cannot
 * reach a query without passing `create`.
 *
 * ── On casing ───────────────────────────────────────────────
 * The `users.email` column is CITEXT, so the database compares
 * case-insensitively and enforces uniqueness that way. This class therefore
 * does NOT lowercase — storing what the user typed means their address is
 * shown back to them as they wrote it ("Sam.Smith@work.com", not
 * "sam.smith@work.com"), while CITEXT still prevents a second registration
 * under different casing.
 *
 * That only holds while the column stays CITEXT. If it is ever changed to TEXT,
 * normalisation has to move here or duplicate accounts become possible.
 */

/**
 * Deliberately permissive: one @, something either side, a dot in the domain,
 * no whitespace. Stricter regexes reject valid addresses — RFC 5322 allows
 * quoted strings, plus-addressing, and newer TLDs — and the only real proof an
 * address works is the verification email we are about to send anyway.
 */
const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Postgres CITEXT has no length cap, but an unbounded value has no business
 * reaching the database. 254 is the maximum length of a deliverable address
 * (RFC 5321), so anything longer cannot be real.
 */
export const MAX_LENGTH = 254;

export class Email {
  private constructor(readonly value: string) {}

  static create(raw: unknown): Email {
    if (typeof raw !== "string") {
      throw new InvalidEmailException("Please enter your email address.");
    }

    // Trimmed, unlike passwords: a trailing space here is always a typo or an
    // artefact of copy-paste, never meaningful.
    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      throw new InvalidEmailException("Please enter your email address.");
    }

    if (trimmed.length > MAX_LENGTH || !SHAPE.test(trimmed)) {
      throw new InvalidEmailException();
    }

    return new Email(trimmed);
  }

  /**
   * For a login attempt. An address that fails `create` simply has no matching
   * account, and saying "invalid email" there would distinguish a malformed
   * address from an unregistered one — the same enumeration leak that
   * `InvalidCredentialsException` exists to avoid. Returns null and lets the
   * caller fail as "wrong credentials".
   */
  static tryCreate(raw: unknown): Email | null {
    try {
      return Email.create(raw);
    } catch {
      return null;
    }
  }

  toString() {
    return this.value;
  }
}
