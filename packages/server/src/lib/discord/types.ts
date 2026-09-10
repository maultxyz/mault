export type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  timestamp: string;
  url?: string;
  image?: { url: string };
  footer?: { text: string };
};

export type DiscordNotificationKind = "scan" | "error";
