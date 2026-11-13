import type { DiscordWebhookPayload } from "../interfaces/discord";

export async function postDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload,
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      `Discord webhook returned ${response.status}: ${await response.text()}`,
    );
  }
}
