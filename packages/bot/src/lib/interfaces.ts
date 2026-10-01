export interface GuildChannelSummary {
  id: string;
  name: string;
  type: "text" | "announcement";
  categoryName: string | null;
  missingPermissions: string[];
}
