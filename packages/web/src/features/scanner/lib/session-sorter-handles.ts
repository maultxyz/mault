const bluetoothDevicesById = new Map<string, BluetoothDevice>();
const deviceGuidBySerialPort = new WeakMap<SerialPort, string>();

export function rememberSessionBluetoothDevice(device: BluetoothDevice): void {
  bluetoothDevicesById.set(device.id, device);
}

export function sessionBluetoothDevices(): BluetoothDevice[] {
  return [...bluetoothDevicesById.values()];
}

export function rememberSerialPortDevice(
  port: SerialPort,
  deviceGuid: string,
): void {
  deviceGuidBySerialPort.set(port, deviceGuid);
}

export function grantedPortsToTryForDevice(
  grantedPorts: readonly SerialPort[],
  deviceGuid: string,
): SerialPort[] {
  const closedPorts = grantedPorts.filter((port) => !port.readable);
  return [
    ...closedPorts.filter(
      (port) => deviceGuidBySerialPort.get(port) === deviceGuid,
    ),
    ...closedPorts.filter((port) => !deviceGuidBySerialPort.has(port)),
  ];
}
