import { openSorterLinkSocket, SORTER_LINK_CLIENT_PATH, SorterLinkConnection } from "@magic-vault/shared";
import { getRequestAuth } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/config";
import { SORTER_ERROR_BY_OPEN_FAILURE } from "@/lib/constants/sorter";
import type { ByteTransport, CloudOpenResult } from "@/lib/interfaces/sorter";
import { encodeUtf8, Utf8StreamDecoder } from "./bytes";

async function clientUrl(deviceGuid: string): Promise<string | null> {
  const { token, orgId } = await getRequestAuth();
  if (!token || !orgId) return null;
  const params = new URLSearchParams({ token, orgId, device: deviceGuid });
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/api${SORTER_LINK_CLIENT_PATH}?${params.toString()}`;
}

export class CloudTransport extends SorterLinkConnection implements ByteTransport {
  readonly id: string;
  readonly name = null;

  private constructor(id: string, socket: WebSocket) {
    super(socket, {
      encodeText: encodeUtf8,
      decodeBytes: (bytes) => new Utf8StreamDecoder().decode(bytes),
    });
    this.id = id;
  }

  static async open(deviceGuid: string): Promise<CloudOpenResult> {
    const url = await clientUrl(deviceGuid);
    if (!url) return { ok: false, code: "connect-failed" };
    const opened = await openSorterLinkSocket(url);
    if (!opened.ok) return { ok: false, code: SORTER_ERROR_BY_OPEN_FAILURE[opened.reason] };
    return { ok: true, transport: new CloudTransport(deviceGuid, opened.socket) };
  }

  async start(): Promise<void> {
    super.start();
  }

  setMtu(): void {}
}
