import { createHmac, timingSafeEqual } from "node:crypto";
import type { DiscordEmbed } from "./discord";

const BMC_COLOR = 0xffdd00;
const BMC_URL = "https://buymeacoffee.com/mault";

export function verifyBuyMeACoffeeSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.BUY_ME_A_COFFEE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  return (
    expectedBuf.length === actualBuf.length &&
    timingSafeEqual(expectedBuf, actualBuf)
  );
}

interface BuyMeACoffeeWebhookEnvelope {
  event_id?: number;
  type?: string;
  live_mode?: boolean;
  created?: number;
  attempt?: number;
  data?: Record<string, unknown>;
}

export function parseBuyMeACoffeeWebhook(
  rawBody: string,
): BuyMeACoffeeWebhookEnvelope | null {
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function firstString(
  data: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function firstNumber(
  data: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
  }
  return undefined;
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === "true";
}

export function buildDonationEmbed(
  data: Record<string, unknown>,
  liveMode: boolean,
): DiscordEmbed {
  const note = isTruthyFlag(data["note_hidden"])
    ? undefined
    : firstString(data, ["support_note", "note"]);
  const amount = firstNumber(data, ["amount", "total_amount"]);
  const currency = firstString(data, ["currency", "support_currency"]) ?? "USD";

  const lines = [
    amount != null ? `**${amount.toFixed(2)} ${currency}**` : undefined,
    note ?? "No message included.",
    "Thank you for the support! ❤️",
  ].filter(Boolean);

  return {
    title: "Donation",
    description: lines.join("\n\n"),
    color: BMC_COLOR,
    timestamp: new Date().toISOString(),
    url: BMC_URL,
    ...(liveMode ? {} : { footer: { text: "TEST EVENT" } }),
  };
}
