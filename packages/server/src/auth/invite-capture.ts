import { AsyncLocalStorage } from "node:async_hooks";

export interface InviteCapture {
  token?: string;
  url?: string;
  // Whether LocalEmailProvider also got a real email out via Resend (as
  // opposed to just capturing the link above) - lets the /invites route
  // tell the admin accurately whether the invitee will also get an email,
  // or whether sharing this link is the only way they'll find out.
  emailSent?: boolean;
}

// own-auth's inviteMember() only ever returns the raw invite token/url when
// exposeRawTokens is set (blocked in production, see own-auth-instance.ts),
// since its supported path is "the configured EmailProvider sends it" - not
// "hand the caller a link to share however they like". LocalEmailProvider's
// send() captures the token here instead of emailing it, scoped per-request
// via AsyncLocalStorage so concurrent invite requests can't cross-contaminate
// each other's captured token (module-level shared state would risk that).
export const inviteCaptureStorage = new AsyncLocalStorage<InviteCapture>();
