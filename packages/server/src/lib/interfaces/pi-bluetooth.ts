import type { ChildProcessWithoutNullStreams } from "node:child_process";

export type BluetoothProcess = ChildProcessWithoutNullStreams;
export interface BluetoothWrite {
  callback?: (error?: Error | null) => void;
  timer: ReturnType<typeof setTimeout>;
}
