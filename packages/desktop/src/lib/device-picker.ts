import { BrowserWindow, ipcMain } from "electron";
import path from "path";
import { getStrings } from "./app-url";
import { PICKER_CHANNELS, PICKER_WINDOW_SIZE } from "./constants/desktop";
import type {
  ActivePicker,
  PickerDevice,
  PickerKind,
  PickerState,
} from "./interfaces/desktop";

let active: ActivePicker | null = null;

function stateOf(picker: ActivePicker): PickerState {
  const strings = getStrings();
  return {
    kind: picker.kind,
    devices: picker.devices,
    strings: {
      title: picker.kind === "serial" ? strings.serialTitle : strings.bluetoothTitle,
      searching: strings.searching,
      connect: strings.connect,
      cancel: strings.cancel,
    },
  };
}

function finish(deviceId: string) {
  const picker = active;
  if (!picker) return;
  active = null;
  picker.resolve(deviceId);
  if (!picker.window.isDestroyed()) picker.window.destroy();
}

export function registerDevicePickerIpc() {
  ipcMain.on(PICKER_CHANNELS.ready, (event) => {
    if (active && event.sender === active.window.webContents) {
      event.sender.send(PICKER_CHANNELS.state, stateOf(active));
    }
  });
  ipcMain.on(PICKER_CHANNELS.choose, (event, deviceId: unknown) => {
    if (!active || event.sender !== active.window.webContents) return;
    const known = active.devices.some((device) => device.id === deviceId);
    finish(known ? (deviceId as string) : "");
  });
}

export function openDevicePicker(
  parent: BrowserWindow | null,
  kind: PickerKind,
  devices: PickerDevice[],
  resolve: (deviceId: string) => void,
) {
  finish("");
  const window = new BrowserWindow({
    ...PICKER_WINDOW_SIZE,
    parent: parent ?? undefined,
    modal: !!parent,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "picker-preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  window.setMenu(null);
  active = { window, kind, devices, resolve };
  window.once("ready-to-show", () => window.show());
  window.on("closed", () => {
    if (active?.window === window) finish("");
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  void window.loadFile(path.join(__dirname, "picker.html"));
}

export function updateDevicePicker(kind: PickerKind, devices: PickerDevice[]) {
  if (!active || active.kind !== kind) return;
  active.devices = devices;
  active.window.webContents.send(PICKER_CHANNELS.state, stateOf(active));
}

export function isDevicePickerOpen(kind: PickerKind): boolean {
  return active?.kind === kind;
}

export function setDevicePickerResolver(kind: PickerKind, resolve: (deviceId: string) => void) {
  if (active?.kind === kind) active.resolve = resolve;
}

export function getDevicePickerDevices(kind: PickerKind): PickerDevice[] {
  return active?.kind === kind ? active.devices : [];
}
