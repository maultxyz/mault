import {
  BLE_WRITE_CHUNK_SIZE,
  NUS_RX_CHARACTERISTIC_UUID,
  NUS_SERVICE_UUID,
  NUS_TX_CHARACTERISTIC_UUID,
} from "@/lib/constants/bluetooth";
import type { SerialTransportType } from "@/lib/interfaces/scanner";

// Minimal byte-in/byte-out surface the connection bootstrap (getStatus →
// board/version parse → self-test) and the command/response plumbing in
// use-serial.tsx need - both SerialTransport (USB) and BluetoothTransport
// (BLE) implement it so the rest of the provider doesn't care which one is
// active. See firmware/PROTOCOL.md - both transports carry the identical
// line-delimited JSON protocol, just framed differently at the byte level.
export interface ByteTransport {
  kind: SerialTransportType;
  /** Begins delivering received bytes to the onData callback. */
  start(): void;
  write(data: Uint8Array): Promise<void>;
  onData(cb: (chunk: Uint8Array) => void): void;
  /** Fires whenever the connection ends, for any reason (including our own close()). */
  onDisconnect(cb: () => void): void;
  /**
   * Fires only for an *unexpected* disconnect (not one caused by our own
   * close()) - lets the caller show a "connection lost" toast for a real
   * problem without also showing one for a deliberate user-initiated
   * disconnect.
   */
  onError(cb: (error: unknown) => void): void;
  close(): Promise<void>;
}

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

  /**
   * `"cancelled"` means the user dismissed the port picker (not an error -
   * callers should stay silent); `"open-failed"` means a port was picked
   * but `port.open()` itself threw (callers should surface this).
   */
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
        // A NetworkError here is the expected result of our own close()
        // cancelling the reader (see close()) - anything else is a genuine
        // unexpected disconnect worth surfacing.
        if (!(e instanceof DOMException && e.name === "NetworkError")) {
          console.error("[Serial] Read error:", e); // eslint-disable-line no-console -- hardware debug trace
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

  async write(data: Uint8Array): Promise<void> {
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

export class BluetoothTransport implements ByteTransport {
  readonly kind: SerialTransportType = "bluetooth";
  private readonly device: BluetoothDevice;
  private readonly rxChar: BluetoothRemoteGATTCharacteristic;
  private readonly txChar: BluetoothRemoteGATTCharacteristic;
  private dataCb: ((chunk: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;
  private errorCb: ((error: unknown) => void) | null = null;
  // gattserverdisconnected fires the same way whether we asked for it (see
  // close()) or the device dropped off unexpectedly - track our own intent
  // so only the latter reports through onError.
  private closing = false;

  private constructor(
    device: BluetoothDevice,
    rxChar: BluetoothRemoteGATTCharacteristic,
    txChar: BluetoothRemoteGATTCharacteristic,
  ) {
    this.device = device;
    this.rxChar = rxChar;
    this.txChar = txChar;
  }

  /**
   * `"cancelled"` means the user dismissed the device picker (not an error -
   * callers should stay silent); `"permission-blocked"` means the browser
   * refused even to show the picker because Bluetooth access for this site
   * (or the Web Bluetooth API itself) is blocked - callers should point the
   * user at their browser's Bluetooth permission/flag settings rather than
   * show a generic failure, since "reconnect the device" won't help here;
   * `"failed"` covers everything else (no adapter, GATT connect / service
   * discovery failure) and callers should surface `message`.
   */
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
      // Only a genuine chooser dismissal (or "no matching device found")
      // comes back as NotFoundError - a blocked site/browser permission
      // surfaces as NotAllowedError specifically, and other failures (no
      // adapter, disabled API) have their own names, all real problems
      // worth surfacing.
      if (e instanceof DOMException && e.name === "NotFoundError") {
        return { ok: false, reason: "cancelled" };
      }
      if (e instanceof DOMException && e.name === "NotAllowedError") {
        return { ok: false, reason: "permission-blocked" };
      }
      console.error("[Bluetooth] requestDevice failed:", e); // eslint-disable-line no-console -- hardware debug trace
      return {
        ok: false,
        reason: "failed",
        message: e instanceof Error ? e.message : String(e),
      };
    }
    if (!device.gatt) {
      return { ok: false, reason: "failed", message: "No GATT server on this device." };
    }
    try {
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(NUS_SERVICE_UUID);
      const rxChar = await service.getCharacteristic(NUS_RX_CHARACTERISTIC_UUID);
      const txChar = await service.getCharacteristic(NUS_TX_CHARACTERISTIC_UUID);
      return { ok: true, transport: new BluetoothTransport(device, rxChar, txChar) };
    } catch (e) {
      console.error("[Bluetooth] Connect failed:", e); // eslint-disable-line no-console -- hardware debug trace
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
    this.device.addEventListener("gattserverdisconnected", this.handleGattDisconnected);
    this.txChar.addEventListener(
      "characteristicvaluechanged",
      this.handleValueChanged,
    );
    await this.txChar.startNotifications();
  }

  private handleValueChanged = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    this.dataCb?.(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
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

  async write(data: Uint8Array): Promise<void> {
    // Chunk to the connection's likely MTU - a single write larger than
    // what's negotiated is rejected by the OS/browser rather than
    // auto-fragmented (see PROTOCOL.md's BLE transport section).
    for (let offset = 0; offset < data.length; offset += BLE_WRITE_CHUNK_SIZE) {
      const chunk = data.subarray(offset, offset + BLE_WRITE_CHUNK_SIZE);
      await this.rxChar.writeValueWithoutResponse(chunk);
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
