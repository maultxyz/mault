import { AsyncLocalStorage } from "node:async_hooks";
import type { InviteCapture } from "../lib/interfaces/auth";

// own-auth's inviteMember() only ever returns the raw invite token/url when
// exposeRawTokens is set (blocked in production, see own-auth-instance.ts),
// since its supported path is "the configured EmailProvider sends it" - not
// "hand the caller a link to share however they like". LocalEmailProvider's
// send() captures the token here instead of emailing it, scoped per-request
// via AsyncLocalStorage so concurrent invite requests can't cross-contaminate
// each other's captured token (module-level shared state would risk that).
export const inviteCaptureStorage = new AsyncLocalStorage<InviteCapture>();
