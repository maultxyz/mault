import { SerialSession, type SerialReply } from "@magic-vault/shared";
import { FEEDER_RESPONSE_TIMEOUT_MS, MAX_COMM_LOG_ENTRIES } from "@/lib/constants/sorter";
import type { ByteTransport } from "@/lib/interfaces/sorter";
import { encodeUtf8, Utf8StreamDecoder } from "./bytes";

export class SorterLink extends SerialSession<ByteTransport> {
  constructor() {
    super({
      createDecoder: () => new Utf8StreamDecoder(),
      encodeText: encodeUtf8,
      maxCommLogEntries: MAX_COMM_LOG_ENTRIES,
    });
  }

  feed(): Promise<SerialReply | null> {
    return this.runAfterRoutes(() => this.sendParsed({ feeder: true }, FEEDER_RESPONSE_TIMEOUT_MS));
  }
}
