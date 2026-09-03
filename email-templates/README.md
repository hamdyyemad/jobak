# Email templates

Supabase keeps email templates in its dashboard, not in this repo. These files are
the source of truth: edit, regenerate, then paste into the dashboard.

```bash
node email-templates/build.mjs
```

`build.mjs` holds the shared shell and the copy for every template; `templates/`
holds the generated HTML you paste in. Supabase has no partials, so each template
has to be a complete document — generating them keeps nine near-identical files
from drifting apart. **Edit `build.mjs`, not the generated HTML.**

## Where each file goes

Dashboard: **Authentication > Emails > Templates**. Each template has its own
subject field, so unlike the sender address these can differ per email.

| File | Supabase template | Subject heading |
| --- | --- | --- |
| `01-confirm-signup.html` | Confirm sign up | Confirm your email address for Jobak |
| `02-invite-user.html` | Invite user | You've been invited to Jobak |
| `03-magic-link.html` | Magic link or OTP | Your Jobak sign-in link |
| `04-change-email.html` | Change email address | Confirm your new email for Jobak |
| `05-reset-password.html` | Reset password | Reset your Jobak password |
| `06-reauthentication.html` | Reauthentication | `{{ .Token }}` is your Jobak verification code |
| `07-password-changed.html` | Password changed | Your Jobak password was changed |
| `08-signin-method-linked.html` | Sign-in method linked | `{{ .Provider }}` was added to your Jobak account |
| `09-signin-method-removed.html` | Sign-in method removed | `{{ .Provider }}` removed from your Jobak account |

Subjects also live in `build.mjs` next to each template's copy, and the build
prints them so they are easy to copy across.

### Why these subjects

- **Front-load the meaningful word.** Mobile truncates around 35-40 characters.
- **The brand name appears in all nine.** The sender name already shows "Jobak",
  so this is redundant for recognition alone, but it pays off for search months
  later, for forwarded subjects that lose sender context, and for out-of-context
  clarity ("Your password was changed" is ambiguous across services). Every
  subject still fits the mobile budget. Never use a bracketed prefix like
  `[Jobak] ...` — it burns the most valuable characters in the line.
- **Code in the subject for reauthentication.** Users can read it off the
  notification without opening the email. Worth a test send to confirm variables
  render in the subject field.
- **`{{ .Provider }}` in the security subjects.** "GitHub was added to your Jobak
  account" tells the user whether it was them without opening anything, which
  matters most for the email that signals a takeover.
- **Subjects mirror the H1** in each template, so opening confirms rather than
  surprises.
- **No urgency theatre.** No "Action Required", no exclamation marks, no caps.
  They trip spam filters and these are utility emails.

## Why the links are not `{{ .ConfirmationURL }}`

The default `{{ .ConfirmationURL }}` completes the flow through the PKCE code
exchange, which needs the code-verifier cookie belonging to the browser that
started it. Sign up on a laptop, open the email on your phone, and it fails with
"code verifier not found".

These templates point at our own endpoint with a token hash instead:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>
```

`src/app/auth/confirm/route.ts` calls `verifyOtp` with that hash, which carries no
per-browser state, so the link works on any device. This is the pattern Supabase
documents for server-rendered apps.

The `type` value differs per template and must match, or verification fails:

| Template | `type` |
| --- | --- |
| Confirm sign up | `email` |
| Invite user | `invite` |
| Magic link or OTP | `magiclink` |
| Change email address | `email_change` |
| Reset password | `recovery` |

The three Security templates and Reauthentication send no link at all —
reauthentication shows `{{ .Token }}` as a code, and the security ones are pure
notifications.

## `{{ .SiteURL }}` is a single value

It resolves to whatever **Site URL** is set to under Authentication > URL
Configuration. There is only one, so a template tested against production sends
production links while you work locally. Set it to `http://localhost:3000` to test
locally, and put it back afterwards.

## Known gap: reset password

`05-reset-password.html` links to `/reset-password`, **which does not exist yet**.
`/forgot-password` is also still a stub (`// TODO: wire up auth`) and never calls
`resetPasswordForEmail`, so nothing sends this email today. The template is ready
for when that flow is built. See docs/general/PRE_PRODUCTION.md.

## Editing notes

- Every style is inline. Many clients strip `<style>` blocks.
- Layout is tables. Outlook has no flex or grid.
- Colours are hex. The app's tokens are `oklch()`, which no email client
  understands, so they are resolved to sRGB in `build.mjs`.
- The logo is drawn with table cells and background colours. Clients strip SVG,
  and there is nowhere to host a PNG until there is a production domain. Outlook
  renders the rounded corners square, which is acceptable.
- Fonts fall back to Helvetica/Arial. Geist will not load in an email client.
- Keep the plain-text fallback URL. Some clients strip or rewrite buttons.
