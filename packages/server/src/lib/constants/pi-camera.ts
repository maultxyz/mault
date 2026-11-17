export const PI_CAMERA_HELPER_URL = "http://127.0.0.1:8765";
export const PI_CAMERA_ACTIONS = {
  devices: "GET",
  health: "GET",
  frame: "GET",
  stream: "GET",
  focus: "POST",
  zoom: "POST",
} as const;
