import { homedir } from "node:os";
import { join } from "node:path";

export function maultStateDirectory(): string {
  return join(process.env.XDG_STATE_HOME || join(homedir(), ".local/state"), "mault");
}
