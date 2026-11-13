import {
  DESKTOP_DOCUMENT_SCAN_DRIVERS,
  type DesktopDocumentScanner,
} from "@magic-vault/shared";
import { spawn } from "child_process";
import { app } from "electron";
import { existsSync } from "fs";
import path from "path";
import { createInterface } from "readline";
import {
  SCANNER_HELPER_DIRECTORY,
  SCANNER_HELPER_EXECUTABLE,
  SCANNER_HELPER_FEED_TIMEOUT_MS,
  SCANNER_HELPER_LIST_TIMEOUT_MS,
  SCANNER_HELPER_SESSION_READY_TIMEOUT_MS,
  SCANNER_HELPER_STOP_TIMEOUT_MS,
} from "./constants/desktop";
import type { ScannerHelperMessage } from "./interfaces/desktop";

export function findScannerHelperPath(): string | null {
  if (process.platform !== "win32") return null;
  const resourcesDirectory = app.isPackaged
    ? process.resourcesPath
    : path.join(app.getAppPath(), "native");
  const helperPath = path.join(
    resourcesDirectory,
    SCANNER_HELPER_DIRECTORY,
    SCANNER_HELPER_EXECUTABLE,
  );
  return existsSync(helperPath) ? helperPath : null;
}

function parseHelperLine(line: string): ScannerHelperMessage | null {
  try {
    const message = JSON.parse(line) as ScannerHelperMessage | null;
    return message && typeof message.type === "string" ? message : null;
  } catch {
    console.error(`[scanner-helper] unreadable output: ${line}`);
    return null;
  }
}

function isScanner(value: unknown): value is DesktopDocumentScanner {
  if (!value || typeof value !== "object") return false;
  const scanner = value as Record<string, unknown>;
  return (
    typeof scanner.scannerId === "string" &&
    typeof scanner.name === "string" &&
    DESKTOP_DOCUMENT_SCAN_DRIVERS.includes(scanner.driver as DesktopDocumentScanner["driver"]) &&
    (scanner.hasFeeder === undefined || typeof scanner.hasFeeder === "boolean") &&
    (scanner.hasFlatbed === undefined || typeof scanner.hasFlatbed === "boolean")
  );
}

export function listScannersWithHelper(helperPath: string): Promise<DesktopDocumentScanner[]> {
  return new Promise((resolve, reject) => {
    const helper = spawn(helperPath, ["list"], { windowsHide: true });
    const timeout = setTimeout(() => helper.kill(), SCANNER_HELPER_LIST_TIMEOUT_MS);
    let scanners: DesktopDocumentScanner[] | null = null;
    let failureMessage: string | null = null;
    createInterface({ input: helper.stdout }).on("line", (line) => {
      const message = parseHelperLine(line);
      if (message?.type === "scanners") scanners = message.scanners.filter(isScanner);
      if (message?.type === "error") failureMessage = message.message;
    });
    helper.stderr.on("data", (data) => console.error(`[scanner-helper] ${data}`));
    helper.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    helper.on("close", () => {
      clearTimeout(timeout);
      if (scanners) resolve(scanners);
      else reject(new Error(failureMessage ?? "Scanner helper did not list any scanners"));
    });
  });
}

export function startHelperScan(
  helperPath: string,
  helperArguments: string[],
  onMessage: (message: ScannerHelperMessage) => void,
) {
  const helper = spawn(helperPath, ["scan", ...helperArguments], { windowsHide: true });
  createInterface({ input: helper.stdout }).on("line", (line) => {
    const message = parseHelperLine(line);
    if (message) onMessage(message);
  });
  helper.stderr.on("data", (data) => console.error(`[scanner-helper] ${data}`));
  const exited = new Promise<void>((resolve) => {
    helper.on("close", () => resolve());
    helper.on("error", (error) => {
      console.error("[scanner-helper] failed to start:", error);
      resolve();
    });
  });

  const stop = () => {
    if (helper.exitCode !== null || helper.killed) return;
    if (helper.stdin.writable) helper.stdin.end("stop\n");
    setTimeout(() => {
      if (helper.exitCode === null) helper.kill();
    }, SCANNER_HELPER_STOP_TIMEOUT_MS).unref();
  };

  return { exited, stop };
}

export async function openHelperSession(helperPath: string, helperArguments: string[]) {
  const helper = spawn(helperPath, ["session", ...helperArguments], { windowsHide: true });
  const queuedMessages: ScannerHelperMessage[] = [];
  let deliverToWaiter: ((message: ScannerHelperMessage | null) => void) | null = null;
  let hasExited = false;

  const deliver = (message: ScannerHelperMessage | null) => {
    const waiter = deliverToWaiter;
    deliverToWaiter = null;
    if (waiter) waiter(message);
    else if (message) queuedMessages.push(message);
  };
  createInterface({ input: helper.stdout }).on("line", (line) => {
    const message = parseHelperLine(line);
    if (message) deliver(message);
  });
  helper.stderr.on("data", (data) => console.error(`[scanner-helper] ${data}`));
  const markExited = () => {
    hasExited = true;
    deliver(null);
  };
  helper.on("close", markExited);
  helper.on("error", (error) => {
    console.error("[scanner-helper] session failed:", error);
    markExited();
  });

  const nextMessage = (timeoutMs: number) =>
    new Promise<ScannerHelperMessage | null>((resolve) => {
      const queued = queuedMessages.shift();
      if (queued) return resolve(queued);
      if (hasExited) return resolve(null);
      const timeout = setTimeout(() => {
        deliverToWaiter = null;
        resolve(null);
      }, timeoutMs);
      deliverToWaiter = (message) => {
        clearTimeout(timeout);
        resolve(message);
      };
    });

  const kill = () => {
    if (helper.exitCode === null && !helper.killed) helper.kill();
  };

  const ready = await nextMessage(SCANNER_HELPER_SESSION_READY_TIMEOUT_MS);
  if (ready?.type !== "ready") {
    kill();
    throw new Error(ready?.type === "error" ? ready.message : "Scanner helper did not open a session");
  }

  return {
    requestPage: async (command: string): Promise<ScannerHelperMessage | null> => {
      if (hasExited || !helper.stdin.writable) return null;
      helper.stdin.write(`${command}\n`);
      const message = await nextMessage(SCANNER_HELPER_FEED_TIMEOUT_MS);
      if (!message) kill();
      return message;
    },
    close: () => {
      if (helper.stdin.writable) helper.stdin.end("close\n");
      setTimeout(kill, SCANNER_HELPER_STOP_TIMEOUT_MS).unref();
    },
  };
}
