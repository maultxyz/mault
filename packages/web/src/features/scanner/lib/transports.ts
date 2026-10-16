import {
  BLE_ATT_HEADER_SIZE,
  BLE_CONNECT_ATTEMPTS,
  BLE_CONNECT_RETRY_DELAY_MS,
  BLE_MAX_WRITE_CHUNK_SIZE,
  BLE_WRITE_CHUNK_SIZE,
  NUS_RX_CHARACTERISTIC_UUID,
  NUS_SERVICE_UUID,
  NUS_TX_CHARACTERISTIC_UUID,
  SORTER_LINK_CLOSE_IN_USE,
  SORTER_LINK_CLOSE_OFFLINE,
  SORTER_LINK_READY_KEY,
  SORTER_LINK_READY_VALUE,
} from "@magic-vault/shared";
import { SORTER_LINK_OPEN_TIMEOUT_MS } from "@/lib/constants/timing";
import type {
  CloudTransportFailure,
  SerialTransportType,
  ByteTransport,
} from "@/lib/interfaces/scanner";

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

function isSorterLinkReady(data: unknown): boolean {
  if (typeof data !== "string") return false;
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    return parsed[SORTER_LINK_READY_KEY] === SORTER_LINK_READY_VALUE;
  } catch {
    return false;
  }
}

function cloudCloseReason(code: number): CloudTransportFailure {
  if (code === SORTER_LINK_CLOSE_OFFLINE) return "offline";
  if (code === SORTER_LINK_CLOSE_IN_USE) return "inUse";
  return "failed";
}

export class CloudTransport implements ByteTransport {
  readonly kind: SerialTransportType = "cloud";
  private readonly socket: WebSocket;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();
  private started = false;
  private closed = false;
  private backlog: Uint8Array[] = [];
  private dataCb: ((chunk: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;
  private errorCb: ((error: unknown) => void) | null = null;

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      const chunk = this.encoder.encode(event.data);
      if (this.started) this.dataCb?.(chunk);
      else this.backlog.push(chunk);
    };
    socket.onerror = (event) => {
      if (this.started) this.errorCb?.(event);
    };
    socket.onclose = () => {
      this.closed = true;
      if (this.started) this.disconnectCb?.();
    };
  }

  static open(
    url: string,
  ): Promise<
    | { ok: true; transport: CloudTransport }
    | { ok: false; reason: CloudTransportFailure }
  > {
    return new Promise((resolve) => {
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch {
        resolve({ ok: false, reason: "failed" });
        return;
      }
      const timeout = setTimeout(() => {
        socket.close();
        resolve({ ok: false, reason: "failed" });
      }, SORTER_LINK_OPEN_TIMEOUT_MS);
      socket.onmessage = (event) => {
        clearTimeout(timeout);
        if (!isSorterLinkReady(event.data)) {
          socket.close();
          resolve({ ok: false, reason: "failed" });
          return;
        }
        resolve({ ok: true, transport: new CloudTransport(socket) });
      };
      socket.onclose = (event) => {
        clearTimeout(timeout);
        resolve({ ok: false, reason: cloudCloseReason(event.code) });
      };
    });
  }

  start() {
    this.started = true;
    const pending = this.backlog;
    this.backlog = [];
    for (const chunk of pending) this.dataCb?.(chunk);
    if (this.closed) this.disconnectCb?.();
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
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Sorter link is closed.");
    }
    this.socket.send(this.decoder.decode(data));
  }

  async close(): Promise<void> {
    this.started = false;
    this.socket.close(1000);
  }
}
