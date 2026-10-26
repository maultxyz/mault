import { contextBridge, ipcRenderer } from "electron";
import { PICKER_CHANNELS } from "./lib/constants/desktop";
import type { PickerBridge, PickerState } from "./lib/interfaces/desktop";

const bridge: PickerBridge = {
  ready: () => ipcRenderer.send(PICKER_CHANNELS.ready),
  choose: (deviceId) => ipcRenderer.send(PICKER_CHANNELS.choose, deviceId),
  onState: (listener) => {
    ipcRenderer.on(PICKER_CHANNELS.state, (_event, state: PickerState) => listener(state));
  },
};

contextBridge.exposeInMainWorld("picker", bridge);
