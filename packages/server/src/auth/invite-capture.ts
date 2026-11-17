import { AsyncLocalStorage } from "node:async_hooks";
import type { InviteCapture } from "../lib/interfaces/auth";

export const inviteCaptureStorage = new AsyncLocalStorage<InviteCapture>();
