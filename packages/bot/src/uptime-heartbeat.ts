import type { Client } from "discord.js";
import {
  BETTER_STACK_BOT_HEARTBEAT_URL,
  UPTIME_HEARTBEAT_INTERVAL_MS,
  UPTIME_HEARTBEAT_TIMEOUT_MS,
} from "./lib/constants";

async function sendHeartbeat(client: Client) {
  if (!client.isReady()) return;
  try {
    const response = await fetch(BETTER_STACK_BOT_HEARTBEAT_URL, {
      signal: AbortSignal.timeout(UPTIME_HEARTBEAT_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[bot] Better Stack heartbeat returned ${response.status}`);
    }
  } catch (err) {
    console.error("[bot] Better Stack heartbeat failed:", err);
  }
}

export function startUptimeHeartbeat(client: Client) {
  if (!BETTER_STACK_BOT_HEARTBEAT_URL) return;
  void sendHeartbeat(client);
  setInterval(() => void sendHeartbeat(client), UPTIME_HEARTBEAT_INTERVAL_MS);
}
