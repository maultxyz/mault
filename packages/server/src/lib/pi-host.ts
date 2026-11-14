import { readFileSync } from "node:fs";

export function isPiSorter(): boolean {
  return isPiHost() && /^(1|true|on)$/i.test(process.env.PI_SORTER?.trim() ?? "");
}

export function piControllerSocket(): string {
  const configured = process.env.PI_CONTROLLER_SOCKET?.trim();
  if (!configured?.startsWith("/")) {
    throw new Error("PI_CONTROLLER_SOCKET must be an absolute path");
  }
  return configured;
}

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
