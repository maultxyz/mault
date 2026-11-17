import { readFileSync } from "node:fs";

export function isPiHost(): boolean {
  const flag = process.env.PI_HOST?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  try {
    const model = readFileSync("/proc/device-tree/model", "utf8");
    return model.includes("Raspberry Pi");
  } catch {
    return false;
  }
}
