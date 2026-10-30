import type {
  DesktopBridge,
  DesktopDocumentScanEvent,
  DesktopScannerCommand,
  DesktopWindowState,
} from "@magic-vault/shared";
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import {
  DOCUMENT_SCAN_CHANNELS,
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
  listDocumentScanners: () => ipcRenderer.invoke(DOCUMENT_SCAN_CHANNELS.listScanners),
  getDocumentScanFolder: () => ipcRenderer.invoke(DOCUMENT_SCAN_CHANNELS.getFolder),
  chooseDocumentScanFolder: () => ipcRenderer.invoke(DOCUMENT_SCAN_CHANNELS.chooseFolder),
  startDocumentScan: (request) => ipcRenderer.invoke(DOCUMENT_SCAN_CHANNELS.start, request),
  stopDocumentScan: () => ipcRenderer.send(DOCUMENT_SCAN_CHANNELS.stop),
  openDocumentScannerSession: (request) =>
    ipcRenderer.invoke(DOCUMENT_SCAN_CHANNELS.openSession, request),
  feedDocumentScannerCard: (sessionId, request) =>
    ipcRenderer.invoke(DOCUMENT_SCAN_CHANNELS.feedCard, sessionId, request),
  closeDocumentScannerSession: (sessionId) =>
    ipcRenderer.send(DOCUMENT_SCAN_CHANNELS.closeSession, sessionId),
  onDocumentScanEvent: (listener) => {
    const handler = (_event: IpcRendererEvent, scanEvent: DesktopDocumentScanEvent) =>
      listener(scanEvent);
    ipcRenderer.on(DOCUMENT_SCAN_CHANNELS.event, handler);
    return () => {
      ipcRenderer.removeListener(DOCUMENT_SCAN_CHANNELS.event, handler);
    };
  },
};

contextBridge.exposeInMainWorld("maultDesktop", bridge);
