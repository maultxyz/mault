import type {
  DesktopBridge,
  DesktopScannerCommand,
  DesktopWindowState,
} from "@magic-vault/shared";
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import {
  NOTIFICATION_CHANNEL,
  SCANNER_CHANNELS,
  WINDOW_STATE_CHANNELS,
} from "./lib/constants/desktop";

const bridge: DesktopBridge = {
  setScannerButtons: (buttons) => ipcRenderer.send(SCANNER_CHANNELS.buttons, buttons),
  notify: (notification) => ipcRenderer.send(NOTIFICATION_CHANNEL, notification),
  getWindowState: () => ipcRenderer.invoke(WINDOW_STATE_CHANNELS.get),
  onWindowState: (listener) => {
    const handler = (_event: IpcRendererEvent, state: DesktopWindowState) => listener(state);
    ipcRenderer.on(WINDOW_STATE_CHANNELS.state, handler);
    return () => {
      ipcRenderer.removeListener(WINDOW_STATE_CHANNELS.state, handler);
    };
  },
  showMainWindow: () => ipcRenderer.send(WINDOW_STATE_CHANNELS.showMain),
  movePipWindowBy: (offset) => ipcRenderer.send(WINDOW_STATE_CHANNELS.movePip, offset),
  onScannerCommand: (listener) => {
    const handler = (_event: IpcRendererEvent, command: DesktopScannerCommand) =>
      listener(command);
    ipcRenderer.on(SCANNER_CHANNELS.command, handler);
    return () => {
      ipcRenderer.removeListener(SCANNER_CHANNELS.command, handler);
    };
  },
};

contextBridge.exposeInMainWorld("maultDesktop", bridge);
