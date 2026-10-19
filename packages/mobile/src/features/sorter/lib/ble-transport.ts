import { BleManager, State, type Device as BleDevice, type Subscription } from "react-native-ble-plx";
import {
  BLE_ATT_HEADER_SIZE,
  BLE_CONNECT_ATTEMPTS,
  BLE_CONNECT_RETRY_DELAY_MS,
  BLE_MAX_WRITE_CHUNK_SIZE,
  BLE_WRITE_CHUNK_SIZE,
  NUS_RX_CHARACTERISTIC_UUID,
  NUS_SERVICE_UUID,
  NUS_TX_CHARACTERISTIC_UUID,
} from "@magic-vault/shared";
import { BLE_PREFERRED_MTU, BLE_STATE_SETTLE_TIMEOUT_MS } from "@/lib/constants/sorter";
import type { ByteTransport } from "@/lib/interfaces/sorter";
import { base64ToBytes, bytesToBase64 } from "./bytes";

let manager: BleManager | null = null;

export function getBleManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

export function settledBleState(): Promise<State> {
  const ble = getBleManager();
  return new Promise((resolve) => {
    let settled = false;
    let subscription: Subscription | null = null;
    const finish = (state: State) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve(state);
    };
    const timer = setTimeout(() => {
      void ble.state().then(finish);
    }, BLE_STATE_SETTLE_TIMEOUT_MS);
    subscription = ble.onStateChange((state) => {
      if (state !== State.Unknown && state !== State.Resetting) finish(state);
    }, true);
    if (settled) subscription.remove();
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkSizeForMtu(mtu: number): number {
  return Math.min(
    Math.max(mtu - BLE_ATT_HEADER_SIZE, BLE_WRITE_CHUNK_SIZE),
    BLE_MAX_WRITE_CHUNK_SIZE,
  );
}

export class BleTransport implements ByteTransport {
  readonly id: string;
  readonly name: string | null;
  private dataCb: ((chunk: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;
  private subscriptions: Subscription[] = [];
  private writeChunkSize: number;
  private closing = false;

  private constructor(device: BleDevice) {
    this.id = device.id;
    this.name = device.localName ?? device.name ?? null;
    this.writeChunkSize = chunkSizeForMtu(device.mtu ?? BLE_WRITE_CHUNK_SIZE + BLE_ATT_HEADER_SIZE);
  }

  static async connect(deviceId: string): Promise<BleTransport> {
    const ble = getBleManager();
    await settledBleState();
    let lastError: unknown;
    for (let attempt = 1; attempt <= BLE_CONNECT_ATTEMPTS; attempt++) {
      try {
        let device = await ble.connectToDevice(deviceId, { requestMTU: BLE_PREFERRED_MTU });
        device = await ble.discoverAllServicesAndCharacteristicsForDevice(device.id);
        return new BleTransport(device);
      } catch (err) {
        lastError = err;
        await ble.cancelDeviceConnection(deviceId).catch(() => {});
        if (attempt < BLE_CONNECT_ATTEMPTS) await delay(BLE_CONNECT_RETRY_DELAY_MS * attempt);
      }
    }
    throw lastError;
  }

  async start(): Promise<void> {
    const ble = getBleManager();
    this.subscriptions.push(
      ble.onDeviceDisconnected(this.id, () => {
        this.disconnectCb?.();
      }),
      ble.monitorCharacteristicForDevice(
        this.id,
        NUS_SERVICE_UUID,
        NUS_TX_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;
          this.dataCb?.(base64ToBytes(characteristic.value));
        },
      ),
    );
  }

  onData(cb: (chunk: Uint8Array) => void): void {
    this.dataCb = cb;
  }

  onDisconnect(cb: () => void): void {
    this.disconnectCb = () => {
      if (!this.closing) cb();
    };
  }

  setMtu(mtu: number): void {
    this.writeChunkSize = chunkSizeForMtu(mtu);
  }

  async write(data: Uint8Array): Promise<void> {
    const ble = getBleManager();
    let offset = 0;
    while (offset < data.length) {
      const size = this.writeChunkSize;
      try {
        await ble.writeCharacteristicWithoutResponseForDevice(
          this.id,
          NUS_SERVICE_UUID,
          NUS_RX_CHARACTERISTIC_UUID,
          bytesToBase64(data.subarray(offset, offset + size)),
        );
      } catch (err) {
        if (size === BLE_WRITE_CHUNK_SIZE) throw err;
        this.writeChunkSize = BLE_WRITE_CHUNK_SIZE;
        continue;
      }
      offset += size;
    }
  }

  async close(): Promise<void> {
    this.closing = true;
    for (const subscription of this.subscriptions) subscription.remove();
    this.subscriptions = [];
    await getBleManager().cancelDeviceConnection(this.id).catch(() => {});
  }
}
