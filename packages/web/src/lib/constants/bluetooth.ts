// Nordic UART Service (NUS) - reused rather than inventing our own UUIDs so
// generic BLE terminal apps can also talk to the device for debugging. Must
// match firmware/main/ble_arduinoble.ino and firmware/main/ble_esp32.ino
// exactly (see firmware/PROTOCOL.md's "BLE transport" section) - firmware
// and web are built separately, so these have to be kept in sync by hand.
export const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_TX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// Web Bluetooth write ops are capped by the connection's negotiated MTU
// (commonly ~20 usable bytes unless negotiated higher, and the browser
// doesn't expose what was actually negotiated) - chunk conservatively,
// matching the firmware's own chunking of outgoing lines.
export const BLE_WRITE_CHUNK_SIZE = 20;
