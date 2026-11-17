import { BrowserWindow, type Session, type WebContents } from "electron";
import { isAppOrigin } from "./app-url";
import {
  getDevicePickerDevices,
  isDevicePickerOpen,
  openDevicePicker,
  setDevicePickerResolver,
  updateDevicePicker,
} from "./device-picker";
import { grantSerialPort, isSerialPortGranted } from "./granted-ports";
import type { PickerDevice, SerialPortIdentity } from "./interfaces/desktop";

let serialRequest: { ports: Electron.SerialPort[] } | null = null;

function toSerialDevice(port: Electron.SerialPort): PickerDevice {
  return {
    id: port.portId,
    label: port.displayName || port.portName,
    detail: port.displayName ? port.portName : undefined,
  };
}

function toBluetoothDevice(device: Electron.BluetoothDevice): PickerDevice {
  return { id: device.deviceId, label: device.deviceName || device.deviceId };
}

export function registerSerialPicker(session: Session) {
  session.on("select-serial-port", (event, portList, webContents, callback) => {
    event.preventDefault();
    const request = { ports: portList };
    serialRequest = request;
    const parent = BrowserWindow.fromWebContents(webContents);
    openDevicePicker(parent, "serial", portList.map(toSerialDevice), (portId) => {
      const port = request.ports.find((p) => p.portId === portId);
      if (port) grantSerialPort(port);
      if (serialRequest === request) serialRequest = null;
      callback(port ? port.portId : "");
    });
  });
  session.on("serial-port-added", (_event, port) => {
    if (!serialRequest || !isDevicePickerOpen("serial")) return;
    serialRequest.ports = [...serialRequest.ports.filter((p) => p.portId !== port.portId), port];
    updateDevicePicker("serial", serialRequest.ports.map(toSerialDevice));
  });
  session.on("serial-port-removed", (_event, port) => {
    if (!serialRequest || !isDevicePickerOpen("serial")) return;
    serialRequest.ports = serialRequest.ports.filter((p) => p.portId !== port.portId);
    updateDevicePicker("serial", serialRequest.ports.map(toSerialDevice));
  });
}

export function serialDeviceAllowed(details: Electron.DevicePermissionHandlerHandlerDetails) {
  return (
    details.deviceType === "serial" &&
    isAppOrigin(details.origin) &&
    isSerialPortGranted(details.device as SerialPortIdentity)
  );
}

export function registerBluetoothPicker(webContents: WebContents) {
  webContents.on("select-bluetooth-device", (event, devices, callback) => {
    event.preventDefault();
    const found = devices.map(toBluetoothDevice);
    if (isDevicePickerOpen("bluetooth")) {
      const known = getDevicePickerDevices("bluetooth");
      const merged = [...known, ...found.filter((d) => !known.some((k) => k.id === d.id))];
      setDevicePickerResolver("bluetooth", callback);
      updateDevicePicker("bluetooth", merged);
      return;
    }
    openDevicePicker(BrowserWindow.fromWebContents(webContents), "bluetooth", found, callback);
  });
}
