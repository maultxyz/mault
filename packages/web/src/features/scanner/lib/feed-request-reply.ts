import { parseSerialReply, type SerialRequestResult } from "@magic-vault/shared";

export function replyOfFeedRequest(result: SerialRequestResult) {
  return result.sent ? parseSerialReply(result.line) : null;
}
