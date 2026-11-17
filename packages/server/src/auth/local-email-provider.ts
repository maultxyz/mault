import type { EmailMessage, EmailProvider } from "own-auth";
import { Resend } from "resend";
import { getWebUrl as webUrl } from "../lib/constants/urls";
import { inviteCaptureStorage } from "./invite-capture";

let resend: Resend | undefined;
function getResend(): Resend | undefined {
  if (!process.env.RESEND_API_KEY) return undefined;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

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
    const supported = message.type === "password_reset" || isInvite;

    if (!client || !supported) {
      console.info("[own-auth email - no delivery configured]", {
        to: message.to,
        type: message.type,
      });
      return;
    }

    const url = buildAppUrl(message);
    const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    try {
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
      console.error("[own-auth email - send failed]", {
        to: message.to,
        type: message.type,
        error: err instanceof Error ? err.message : err,
      });
    }
  }
}
