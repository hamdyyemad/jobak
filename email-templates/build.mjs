/**
 * Generates every Supabase email template from one shared shell.
 *
 *   node email-templates/build.mjs
 *
 * Supabase has no partials or includes — each template must be a complete,
 * standalone document. Hand-maintaining nine near-identical files guarantees
 * they drift, so the shell lives here once and the .html files are output.
 * Edit this file, re-run it, then paste the regenerated HTML into the dashboard.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "templates");

/*
 * Brand palette, resolved to sRGB. The app's tokens are oklch(), which no email
 * client understands. The two "horizon" values are the accent composited over
 * the logo tile at 60% and 30%, because email has no reliable opacity.
 */
const C = {
  canvas: "#08090a",
  panel: "#0f1011",
  tile: "#191a1b",
  border: "#1f2122",
  accent: "#60e56b",
  accentInk: "#08090a",
  accentText: "#9cffa0",
  horizon1: "#409047",
  horizon2: "#27502c",
  fg: "#f7f8f8",
  fgSecondary: "#d0d6e0",
  fgTertiary: "#8a8f98",
  fgQuaternary: "#62666d",
};

const SANS = "Helvetica,Arial,sans-serif";
const MONO = "Consolas,Menlo,monospace";

/**
 * The Jobak mark, rebuilt from table cells: a sun over two horizon lines.
 * Email clients strip SVG and we have nowhere to host a PNG yet, so the mark is
 * drawn with background colours. Outlook squares off the radii; that is fine.
 */
const logo = () => `
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="40" height="40" align="center" valign="middle"
                        style="width:40px; height:40px; background-color:${C.tile}; border:1px solid ${C.border}; border-radius:11px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td height="11" align="center" style="line-height:11px; font-size:0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                              <td width="11" height="11" style="width:11px; height:11px; background-color:${C.accent}; border-radius:50%; line-height:11px; font-size:0;">&nbsp;</td>
                            </tr></table>
                          </td>
                        </tr>
                        <tr><td height="4" style="line-height:4px; font-size:0;">&nbsp;</td></tr>
                        <tr>
                          <td align="center" style="line-height:2px; font-size:0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                              <td width="22" height="2" style="width:22px; height:2px; background-color:${C.horizon1}; border-radius:1px; line-height:2px; font-size:0;">&nbsp;</td>
                            </tr></table>
                          </td>
                        </tr>
                        <tr><td height="3" style="line-height:3px; font-size:0;">&nbsp;</td></tr>
                        <tr>
                          <td align="center" style="line-height:2px; font-size:0;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                              <td width="15" height="2" style="width:15px; height:2px; background-color:${C.horizon2}; border-radius:1px; line-height:2px; font-size:0;">&nbsp;</td>
                            </tr></table>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding-left:12px;">
                      <span style="font-family:${SANS}; font-size:19px; font-weight:600; letter-spacing:-0.3px; color:${C.fg};">Jobak</span>
                    </td>
                  </tr>
                </table>`;

const button = (label, url) => `
              <td style="padding:28px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="background-color:${C.accent}; border-radius:9999px;">
                      <a href="${url}"
                         style="display:inline-block; padding:14px 30px; font-family:${SANS}; font-size:15px; font-weight:600; color:${C.accentInk}; text-decoration:none; border-radius:9999px;">${label}</a>
                    </td>
                  </tr>
                </table>
              </td>`;

const fallbackUrl = (url) => `
              <td style="padding:26px 32px 0 32px;">
                <p style="margin:0 0 8px 0; font-family:${SANS}; font-size:13px; line-height:1.6; color:${C.fgTertiary};">
                  If the button does not work, paste this into your browser:
                </p>
                <p style="margin:0; font-family:${MONO}; font-size:12px; line-height:1.6; color:${C.accentText}; word-break:break-all;">${url}</p>
              </td>`;

/** One-time code, for flows Supabase sends without a link. */
const codeBlock = () => `
              <td style="padding:28px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="background-color:${C.tile}; border:1px solid ${C.border}; border-radius:12px; padding:20px 16px;">
                      <span style="font-family:${MONO}; font-size:30px; font-weight:700; letter-spacing:8px; color:${C.accentText};">{{ .Token }}</span>
                    </td>
                  </tr>
                </table>
              </td>`;

function render({ preheader, title, paragraphs, action, notes }) {
  const rows = [];

  rows.push(`
            <tr>
              <td style="padding:32px 32px 0 32px;">${logo()}
              </td>
            </tr>`);

  rows.push(`
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <h1 style="margin:0 0 14px 0; font-family:${SANS}; font-size:26px; line-height:1.25; font-weight:600; letter-spacing:-0.5px; color:${C.fg};">${title}</h1>
                ${paragraphs
                  .map(
                    (p, i) =>
                      `<p style="margin:${i === 0 ? "0" : "12px 0 0 0"}; font-family:${SANS}; font-size:15px; line-height:1.6; color:${C.fgSecondary};">${p}</p>`
                  )
                  .join("\n                ")}
              </td>
            </tr>`);

  if (action?.kind === "link") {
    rows.push(`
            <tr>${button(action.label, action.url)}
            </tr>`);
    rows.push(`
            <tr>${fallbackUrl(action.url)}
            </tr>`);
  } else if (action?.kind === "code") {
    rows.push(`
            <tr>${codeBlock()}
            </tr>`);
  }

  rows.push(`
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr><td style="height:1px; background-color:${C.border}; line-height:1px; font-size:0;">&nbsp;</td></tr>
                </table>
              </td>
            </tr>`);

  rows.push(`
            <tr>
              <td style="padding:20px 32px 32px 32px;">
                ${notes
                  .map(
                    (n, i) =>
                      `<p style="margin:${i === 0 ? "0" : "6px 0 0 0"}; font-family:${SANS}; font-size:13px; line-height:1.6; color:${i === 0 ? C.fgTertiary : C.fgQuaternary};">${n}</p>`
                  )
                  .join("\n                ")}
              </td>
            </tr>`);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; width:100%; background-color:${C.canvas};">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.canvas};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
                 style="width:560px; max-width:100%; background-color:${C.panel}; border:1px solid ${C.border}; border-radius:16px;">${rows.join("")}
          </table>
          <p style="margin:20px 0 0 0; font-family:${SANS}; font-size:12px; color:${C.fgQuaternary};">Jobak &middot; AI-powered job matching</p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

/** `&` must be escaped inside href attributes to be valid HTML. */
const confirmUrl = (type, next) =>
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${type}` +
  (next ? `&amp;next=${next}` : "");

const IGNORE = "If you did not request this, you can ignore this email and nothing will happen.";
const ONE_USE = "This link expires after a short while and can only be used once.";
const CODE_USE = "This code expires after a short while and can only be used once.";

const templates = [
  {
    file: "01-confirm-signup.html",
    subject: "Confirm your email address for Jobak",
    supabase: "Confirm sign up",
    preheader: "Confirm your email address to finish setting up Jobak.",
    title: "Confirm your email",
    paragraphs: [
      "You are one step from your first set of ranked matches. Confirm this address and we will take you straight into setting up your profile.",
    ],
    action: { kind: "link", label: "Confirm email address", url: confirmUrl("email") },
    notes: [ONE_USE, "If you did not create a Jobak account, you can ignore this email and nothing will happen."],
  },
  {
    file: "02-invite-user.html",
    subject: "You've been invited to Jobak",
    supabase: "Invite user",
    preheader: "You have been invited to Jobak.",
    title: "You have been invited",
    paragraphs: [
      "Someone invited you to Jobak, which finds job openings that fit you and ranks them so the closest match is the first thing you read.",
      "Accept the invitation to set up your account.",
    ],
    action: { kind: "link", label: "Accept invitation", url: confirmUrl("invite") },
    notes: [ONE_USE, "If you were not expecting this invitation, you can ignore this email."],
  },
  {
    file: "03-magic-link.html",
    subject: "Your Jobak sign-in link",
    supabase: "Magic link or OTP",
    preheader: "Your sign-in link for Jobak.",
    title: "Your sign-in link",
    paragraphs: [
      "Use the button below to sign in to Jobak. No password needed.",
      "If you would rather type a code, use this one instead: <strong style=\"color:#f7f8f8;\">{{ .Token }}</strong>",
    ],
    action: { kind: "link", label: "Sign in to Jobak", url: confirmUrl("magiclink") },
    notes: [ONE_USE, IGNORE],
  },
  {
    file: "04-change-email.html",
    subject: "Confirm your new email for Jobak",
    supabase: "Change email address",
    preheader: "Confirm your new email address for Jobak.",
    title: "Confirm your new email",
    paragraphs: [
      "You asked to change the email on your Jobak account from <strong style=\"color:#f7f8f8;\">{{ .Email }}</strong> to <strong style=\"color:#f7f8f8;\">{{ .NewEmail }}</strong>.",
      "Confirm the change to start using the new address to sign in.",
    ],
    action: { kind: "link", label: "Confirm new email", url: confirmUrl("email_change") },
    notes: [
      ONE_USE,
      "If you did not request this change, ignore this email and your address stays as it is.",
    ],
  },
  {
    file: "05-reset-password.html",
    subject: "Reset your Jobak password",
    supabase: "Reset password",
    preheader: "Reset your Jobak password.",
    title: "Reset your password",
    paragraphs: [
      "We received a request to reset the password on your Jobak account. Choose a new one using the button below.",
    ],
    action: {
      kind: "link",
      label: "Choose a new password",
      url: confirmUrl("recovery", "/reset-password"),
    },
    notes: [
      ONE_USE,
      "If you did not ask to reset your password, ignore this email. Your current password will keep working.",
    ],
  },
  {
    file: "06-reauthentication.html",
    subject: "{{ .Token }} is your Jobak verification code",
    supabase: "Reauthentication",
    preheader: "Your Jobak verification code.",
    title: "Verify it is you",
    paragraphs: [
      "Enter this code in Jobak to confirm your identity before continuing.",
    ],
    action: { kind: "code" },
    notes: [
      CODE_USE,
      "If you did not start this, someone may have your password. Change it as soon as you can.",
    ],
  },
  {
    file: "07-password-changed.html",
    subject: "Your Jobak password was changed",
    supabase: "Password changed",
    preheader: "The password on your Jobak account was changed.",
    title: "Your password was changed",
    paragraphs: [
      "The password for <strong style=\"color:#f7f8f8;\">{{ .Email }}</strong> has just been changed.",
      "You do not need to do anything if this was you.",
    ],
    action: null,
    notes: [
      "If this was not you, reset your password immediately from the sign-in page and review the sign-in methods on your account.",
    ],
  },
  {
    file: "08-signin-method-linked.html",
    subject: "{{ .Provider }} was added to your Jobak account",
    supabase: "Sign-in method linked",
    preheader: "A new sign-in method was added to your Jobak account.",
    title: "New sign-in method added",
    paragraphs: [
      "<strong style=\"color:#f7f8f8;\">{{ .Provider }}</strong> can now be used to sign in to the Jobak account for <strong style=\"color:#f7f8f8;\">{{ .Email }}</strong>.",
    ],
    action: null,
    notes: [
      "If you did not add this, remove it from your account and change your password straight away.",
    ],
  },
  {
    file: "09-signin-method-removed.html",
    subject: "{{ .Provider }} removed from your Jobak account",
    supabase: "Sign-in method removed",
    preheader: "A sign-in method was removed from your Jobak account.",
    title: "Sign-in method removed",
    paragraphs: [
      "<strong style=\"color:#f7f8f8;\">{{ .Provider }}</strong> can no longer be used to sign in to the Jobak account for <strong style=\"color:#f7f8f8;\">{{ .Email }}</strong>.",
    ],
    action: null,
    notes: [
      "If you did not remove this, change your password straight away and check which sign-in methods are still attached.",
    ],
  },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const t of templates) {
  writeFileSync(join(OUT_DIR, t.file), render(t), "utf8");
  console.log(`  ${t.file.padEnd(32)} -> "${t.supabase}"
      subject: ${t.subject}`);
}
console.log(`\n${templates.length} templates written to ${OUT_DIR}`);
