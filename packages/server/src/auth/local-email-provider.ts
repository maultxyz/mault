import type { EmailMessage, EmailProvider } from "own-auth";
import { Resend } from "resend";
import { inviteCaptureStorage } from "./invite-capture";

// Real delivery is opt-in - unset RESEND_API_KEY (the default for a fresh
// local-mode install) keeps today's behavior: organisation invites still get
// captured into a shareable link (see routes/local-auth.ts's /invites),
// everything else just logs. own-auth's default ConsoleEmailProvider throws
// under NODE_ENV=production, which this must never do - it's called
// unconditionally by own-auth for every invite/reset/verification request.
let resend: Resend | undefined;
function getResend(): Resend | undefined {
  if (!process.env.RESEND_API_KEY) return undefined;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function webUrl(): string {
  return process.env.WEB_URL ?? "http://localhost:5173";
}

// own-auth's own message.url points at paths its HTTP handler would serve
// (/auth/password/reset, /auth/invitations/accept) - this app doesn't mount
// that handler (see routes/local-auth.ts's header comment for why), so
// these build the app's own frontend routes instead.
function buildAppUrl(message: EmailMessage): string | null {
  switch (message.type) {
    case "password_reset":
      return `${webUrl()}/auth/reset-password?token=${message.token}`;
    case "organisation_invite":
      return `${webUrl()}/auth/join?token=${message.token}`;
    default:
      return null;
  }
}

function subjectFor(message: EmailMessage): string {
  switch (message.type) {
    case "password_reset":
      return "Reset your Mault password";
    case "organisation_invite":
      return "You've been invited to a Mault organization";
    case "email_verification":
      return "Verify your Mault email";
    default:
      return "Mault";
  }
}

export class LocalEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    const isInvite = message.type === "organisation_invite";
    const capture = isInvite ? inviteCaptureStorage.getStore() : undefined;
    if (capture) {
      capture.token = message.token;
      capture.url = message.url;
      capture.emailSent = false;
    }

    const client = getResend();
    // Only these two are wired up to real email right now - email
    // verification/magic links have no frontend flow built yet, so sending
    // them would just be a dead link.
    const supported = message.type === "password_reset" || isInvite;

    if (!client || !supported) {
      console.info("[own-auth email - no delivery configured]", {
        to: message.to,
        type: message.type,
      });
      return;
    }

    const url = buildAppUrl(message);
    // `||`, not `??` - docker-compose's ${RESEND_FROM_EMAIL:-} substitution
    // sets this to an empty string when unset, not undefined, and Resend
    // rejects an empty `from` as "The domain is invalid" rather than falling
    // back to anything sensible itself.
    const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    try {
      // Resend's SDK returns { data, error } on API-level failures (bad
      // domain, invalid recipient, etc.) rather than throwing - it does
      // have its own internal error logging, but only when
      // NODE_ENV !== "production" (Dockerfile.server sets it to
      // "production"), so this can't rely on that and logs explicitly here.
      const { data, error } = await client.emails.send({
        from,
        to: message.to,
        subject: subjectFor(message),
        html: `<p><a href="${url}">${url}</a></p><p>This link expires ${message.expiresAt.toISOString()}.</p>`,
      });
      if (error) {
        console.error("[own-auth email - send failed]", {
          to: message.to,
          type: message.type,
          error,
        });
      } else {
        console.info("[own-auth email - sent]", {
          to: message.to,
          type: message.type,
          id: data?.id,
        });
        if (capture) capture.emailSent = true;
      }
    } catch (err) {
      // Network-level failure (fetch itself threw) rather than an API-level
      // one - same "never let this surface as a thrown error" reasoning as
      // above, the caller (e.g. /forgot-password) can't tell from the
      // outside whether an email genuinely exists based on send success.
      console.error("[own-auth email - send failed]", {
        to: message.to,
        type: message.type,
        error: err instanceof Error ? err.message : err,
      });
    }
  }
}
