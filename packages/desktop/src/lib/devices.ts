import { BrowserWindow, type Session, type WebContents } from "electron";
import { getStrings, isAppOrigin } from "./app-url";
import { UNNAMED_BLUETOOTH_DEVICE_PATTERN } from "./constants/desktop";
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
  const name = device.deviceName.trim();
  if (!name || UNNAMED_BLUETOOTH_DEVICE_PATTERN.test(name)) {
    return {
      id: device.deviceId,
      label: getStrings().lookingUpName,
      detail: device.deviceId,
      isNamePending: true,
    };
  }
  return { id: device.deviceId, label: name };
}

function mergeBluetoothDevices(known: PickerDevice[], found: PickerDevice[]): PickerDevice[] {
  const merged = known.map((knownDevice) => {
    const update = found.find((device) => device.id === knownDevice.id);
    return update && (!update.isNamePending || knownDevice.isNamePending) ? update : knownDevice;
  });
  return [...merged, ...found.filter((device) => !known.some((knownDevice) => knownDevice.id === device.id))];
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
      setDevicePickerResolver("bluetooth", callback);
      updateDevicePicker("bluetooth", mergeBluetoothDevices(getDevicePickerDevices("bluetooth"), found));
      return;
    }
    openDevicePicker(BrowserWindow.fromWebContents(webContents), "bluetooth", found, callback);
  });
}
