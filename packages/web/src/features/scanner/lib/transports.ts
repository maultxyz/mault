import { getRequestAuth } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import {
  BLE_ATT_HEADER_SIZE,
  BLE_CONNECT_ATTEMPTS,
  BLE_CONNECT_RETRY_DELAY_MS,
  BLE_MAX_WRITE_CHUNK_SIZE,
  BLE_WRITE_CHUNK_SIZE,
  NUS_RX_CHARACTERISTIC_UUID,
  NUS_SERVICE_UUID,
  NUS_TX_CHARACTERISTIC_UUID,
  openSorterLinkSocket,
  SorterLinkConnection,
  type SorterLinkOpenFailure,
} from "@magic-vault/shared";
import { PI_SERIAL_OPEN_TIMEOUT_MS } from "@/lib/constants/scanner";
import type {
  SerialTransportType,
  ByteTransport,
} from "@/lib/interfaces/scanner";
import type {
  PiSerialControlMessage,
  PiSerialErrorReason,
} from "@magic-vault/shared";

export class SerialTransport implements ByteTransport {
  readonly kind: SerialTransportType = "serial";
  readonly port: SerialPort;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private dataCb: ((chunk: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;
  private errorCb: ((error: unknown) => void) | null = null;

  constructor(port: SerialPort) {
    this.port = port;
  }

  static async openGranted(port: SerialPort): Promise<SerialTransport | null> {
    if (port.readable || port.writable) return null;
    try {
      await port.open({ baudRate: 9600 });
    } catch {
      return null;
    }
    return new SerialTransport(port);
  }

  static async requestAndOpen(): Promise<
    | { ok: true; transport: SerialTransport }
    | { ok: false; reason: "cancelled" | "open-failed" }
  > {
    let port: SerialPort;
    try {
      port = await navigator.serial.requestPort();
    } catch {
      return { ok: false, reason: "cancelled" };
    }
    if (!port.readable || !port.writable) {
      try {
        await port.open({ baudRate: 9600 });
      } catch {
        return { ok: false, reason: "open-failed" };
      }
    }
    return { ok: true, transport: new SerialTransport(port) };
  }

  start() {
    const reader = this.port.readable!.getReader();
    this.reader = reader;
    (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) this.dataCb?.(value);
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "NetworkError")) {
          console.error("[Serial] Read error:", e);
          this.errorCb?.(e);
        }
      } finally {
        this.disconnectCb?.();
      }
    })();
  }

  onData(cb: (chunk: Uint8Array) => void) {
    this.dataCb = cb;
  }

  onDisconnect(cb: () => void) {
    this.disconnectCb = cb;
  }

  onError(cb: (error: unknown) => void) {
    this.errorCb = cb;
  }

  async write(data: Uint8Array<ArrayBuffer>): Promise<void> {
    if (!this.port.writable) return;
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  }

  async close(): Promise<void> {
    try {
      await this.reader?.cancel();
    } catch {}
    try {
      await this.port.close();
    } catch {}
  }
}

async function connectNusCharacteristics(device: BluetoothDevice) {
  const gatt = device.gatt!;
  let lastError: unknown;
  for (let attempt = 1; attempt <= BLE_CONNECT_ATTEMPTS; attempt++) {
    try {
      const server = gatt.connected ? gatt : await gatt.connect();
      const service = await server.getPrimaryService(NUS_SERVICE_UUID);
      const rxChar = await service.getCharacteristic(
        NUS_RX_CHARACTERISTIC_UUID,
      );
      const txChar = await service.getCharacteristic(
        NUS_TX_CHARACTERISTIC_UUID,
      );
      return { rxChar, txChar };
    } catch (e) {
      lastError = e;
      console.warn(`[Bluetooth] Connect attempt ${attempt} failed:`, e);
      try {
        gatt.disconnect();
      } catch {}
      if (attempt < BLE_CONNECT_ATTEMPTS) {
        await new Promise((resolve) =>
          setTimeout(resolve, BLE_CONNECT_RETRY_DELAY_MS * attempt),
        );
      }
    }
  }
  throw lastError;
}

export class BluetoothTransport implements ByteTransport {
  readonly kind: SerialTransportType = "bluetooth";
  private readonly device: BluetoothDevice;
  private readonly rxChar: BluetoothRemoteGATTCharacteristic;
  private readonly txChar: BluetoothRemoteGATTCharacteristic;
  private dataCb: ((chunk: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;
  private errorCb: ((error: unknown) => void) | null = null;
  private closing = false;
  private writeChunkSize = BLE_WRITE_CHUNK_SIZE;

  private constructor(
    device: BluetoothDevice,
    rxChar: BluetoothRemoteGATTCharacteristic,
    txChar: BluetoothRemoteGATTCharacteristic,
  ) {
    this.device = device;
    this.rxChar = rxChar;
    this.txChar = txChar;
  }

  get bluetoothDevice(): BluetoothDevice {
    return this.device;
  }

  static async connectDevice(
    device: BluetoothDevice,
  ): Promise<BluetoothTransport | null> {
    if (!device.gatt) return null;
    try {
      const { rxChar, txChar } = await connectNusCharacteristics(device);
      return new BluetoothTransport(device, rxChar, txChar);
    } catch {
      try {
        device.gatt.disconnect();
      } catch {}
      return null;
    }
  }

  static async requestAndConnect(): Promise<
    | { ok: true; transport: BluetoothTransport }
    | { ok: false; reason: "cancelled" }
    | { ok: false; reason: "permission-blocked" }
    | { ok: false; reason: "failed"; message: string }
  > {
    let device: BluetoothDevice;
    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [NUS_SERVICE_UUID] }],
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotFoundError") {
        return { ok: false, reason: "cancelled" };
      }
      if (e instanceof DOMException && e.name === "NotAllowedError") {
        return { ok: false, reason: "permission-blocked" };
      }
      console.error("[Bluetooth] requestDevice failed:", e);
      return {
        ok: false,
        reason: "failed",
        message: e instanceof Error ? e.message : String(e),
      };
    }
    if (!device.gatt) {
      return {
        ok: false,
        reason: "failed",
        message: "No GATT server on this device.",
      };
    }
    try {
      const { rxChar, txChar } = await connectNusCharacteristics(device);
      return {
        ok: true,
        transport: new BluetoothTransport(device, rxChar, txChar),
      };
    } catch (e) {
      console.error("[Bluetooth] Connect failed:", e);
      try {
        device.gatt?.disconnect();
      } catch {}
      return {
        ok: false,
        reason: "failed",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async start() {
    this.device.addEventListener(
      "gattserverdisconnected",
      this.handleGattDisconnected,
    );
    this.txChar.addEventListener(
      "characteristicvaluechanged",
      this.handleValueChanged,
    );
    await this.txChar.startNotifications();
  }

  private handleValueChanged = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    this.dataCb?.(
      new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
    );
  };

  private handleGattDisconnected = () => {
    if (!this.closing) {
      this.errorCb?.(new Error("Bluetooth device disconnected unexpectedly"));
    }
    this.disconnectCb?.();
  };

  onData(cb: (chunk: Uint8Array) => void) {
    this.dataCb = cb;
  }

  onDisconnect(cb: () => void) {
    this.disconnectCb = cb;
  }

  onError(cb: (error: unknown) => void) {
    this.errorCb = cb;
  }

  setMtu(mtu: number) {
    this.writeChunkSize = Math.min(
      Math.max(mtu - BLE_ATT_HEADER_SIZE, BLE_WRITE_CHUNK_SIZE),
      BLE_MAX_WRITE_CHUNK_SIZE,
    );
  }

  async write(data: Uint8Array<ArrayBuffer>): Promise<void> {
    let offset = 0;
    while (offset < data.length) {
      const size = this.writeChunkSize;
      try {
        await this.rxChar.writeValueWithoutResponse(
          data.subarray(offset, offset + size),
        );
      } catch (e) {
        if (size === BLE_WRITE_CHUNK_SIZE) throw e;
        this.writeChunkSize = BLE_WRITE_CHUNK_SIZE;
        continue;
      }
      offset += size;
    }
  }

  async close(): Promise<void> {
    this.closing = true;
    this.txChar.removeEventListener(
      "characteristicvaluechanged",
      this.handleValueChanged,
    );
    this.device.removeEventListener(
      "gattserverdisconnected",
      this.handleGattDisconnected,
    );
    try {
      this.device.gatt?.disconnect();
    } catch {}
  }
}

const WEB_TEXT_ENCODER = new TextEncoder();
const WEB_TEXT_DECODER = new TextDecoder();

export class CloudTransport
  extends SorterLinkConnection
  implements ByteTransport
{
  readonly kind: SerialTransportType = "cloud";

  private constructor(socket: WebSocket) {
    super(socket, {
      encodeText: (text) => WEB_TEXT_ENCODER.encode(text),
      decodeBytes: (bytes) => WEB_TEXT_DECODER.decode(bytes),
    });
  }

  static async open(
    url: string,
  ): Promise<
    | { ok: true; transport: CloudTransport }
    | { ok: false; reason: SorterLinkOpenFailure }
  > {
    const opened = await openSorterLinkSocket(url);
    return opened.ok
      ? { ok: true, transport: new CloudTransport(opened.socket) }
      : opened;
  }
}


function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  return copy;
}

function piSerialUrl(token: string, orgId: string): string {
  const params = new URLSearchParams({ token, orgId });
  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    const url = new URL(API_BASE);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `${url.pathname.replace(/\/$/, "")}/pi-serial`;
    url.search = params.toString();
    return url.toString();
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${API_BASE}/api/pi-serial?${params}`;
}

function parseControl(text: string): PiSerialControlMessage | null {
  try {
    const parsed = JSON.parse(text) as PiSerialControlMessage;
    if (parsed?.type === "ready") return parsed;
    if (parsed?.type === "error") return parsed;
    return null;
  } catch {
    return null;
  }
}

export class PiSerialTransport implements ByteTransport {
  readonly kind: SerialTransportType = "pi";
  private dataCb: ((chunk: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;
  private errorCb: ((error: unknown) => void) | null = null;
  private pending: Uint8Array<ArrayBuffer>[] = [];
  private started = false;
  private ready: PiSerialControlMessage | null = null;
  private readyWaiters: Array<(message: PiSerialControlMessage | null) => void> =
    [];
  private readonly ws: WebSocket;

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.binaryType = "arraybuffer";
    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        const message = parseControl(event.data);
        if (!this.ready && message) {
          this.ready = message;
          const waiters = this.readyWaiters;
          this.readyWaiters = [];
          for (const waiter of waiters) waiter(message);
        }
        return;
      }
      const bytes = copyBytes(new Uint8Array(event.data as ArrayBuffer));
      if (this.started && this.dataCb) this.dataCb(bytes);
      else this.pending.push(bytes);
    };
    ws.onclose = () => this.disconnectCb?.();
    ws.onerror = () => this.errorCb?.(new Error("pi serial socket error"));
  }

  static async open(): Promise<
    | { ok: true; transport: PiSerialTransport }
    | { ok: false; reason: PiSerialErrorReason }
  > {
    const { token, orgId } = await getRequestAuth();
    if (!token || !orgId) return { ok: false, reason: "open-failed" };

    let ws: WebSocket;
    try {
      ws = new WebSocket(piSerialUrl(token, orgId));
    } catch {
      return { ok: false, reason: "open-failed" };
    }

    const transport = new PiSerialTransport(ws);
    const result = await transport.waitUntilReady();
    if (!result.ok) {
      transport.disconnectCb = null;
      await transport.close();
      return result;
    }
    return { ok: true, transport };
  }

  private waitUntilReady(): Promise<
    { ok: true } | { ok: false; reason: PiSerialErrorReason }
  > {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (message: PiSerialControlMessage | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (message?.type === "ready") {
          resolve({ ok: true });
          return;
        }
        resolve({
          ok: false,
          reason: message?.type === "error" ? message.reason : "open-failed",
        });
      };
      const timer = window.setTimeout(
        () => finish(null),
        PI_SERIAL_OPEN_TIMEOUT_MS,
      );
      if (this.ready) finish(this.ready);
      else this.readyWaiters.push(finish);
      this.ws.addEventListener("close", () => finish(this.ready), { once: true });
      this.ws.addEventListener("error", () => finish(this.ready), { once: true });
    });
  }

  start() {
    this.started = true;
    const queued = this.pending;
    this.pending = [];
    for (const chunk of queued) this.dataCb?.(chunk);
  }

  onData(cb: (chunk: Uint8Array) => void) {
    this.dataCb = cb;
  }

  onDisconnect(cb: () => void) {
    this.disconnectCb = cb;
  }

  onError(cb: (error: unknown) => void) {
    this.errorCb = cb;
  }

  async write(data: Uint8Array<ArrayBuffer>): Promise<void> {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(data);
  }

  async close(): Promise<void> {
    if (
      this.ws.readyState === WebSocket.OPEN ||
      this.ws.readyState === WebSocket.CONNECTING
    ) {
      this.ws.close();
    }
  }
}
