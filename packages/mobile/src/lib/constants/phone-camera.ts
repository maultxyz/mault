import type { ScannedObjectType } from "react-native-vision-camera";

export const PHONE_CAMERA_LINK_PATTERN = /^https?:\/\/[^/?#]+\/app\/monitor\/([^/?#]+)\/camera\/?(?:[?#].*)?$/i;

export const PHONE_CAMERA_HEARTBEAT_MS = 3000;

export const PHONE_CAMERA_JPEG_QUALITY = 85;

export const QR_SCAN_INTERVAL_MS = 800;

export const QR_DECODE_LONG_SIDE = 720;

export const QR_OBJECT_TYPES: ScannedObjectType[] = ["qr"];

export const CAPTURE_FLASH_MS = 250;
