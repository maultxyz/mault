import { MAX_COMM_LOG_ENTRIES } from "@/lib/constants/limits";
import type { ByteTransport } from "@/lib/interfaces/scanner";
import { SerialSession } from "@magic-vault/shared";

export function createSerialSession(): SerialSession<ByteTransport> {
  const encoder = new TextEncoder();
  return new SerialSession<ByteTransport>({
    createDecoder: () => {
      const decoder = new TextDecoder();
      return { decode: (chunk) => decoder.decode(chunk, { stream: true }) };
    },
    encodeText: (text) => encoder.encode(text),
    maxCommLogEntries: MAX_COMM_LOG_ENTRIES,
  });
}
