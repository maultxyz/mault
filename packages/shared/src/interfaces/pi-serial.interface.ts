export type PiSerialErrorReason = "missing" | "busy" | "open-failed";

export type PiSerialControlMessage =
  | { type: "ready" }
  | { type: "error"; reason: PiSerialErrorReason };
