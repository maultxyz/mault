export interface GuildChannelSummary {
  id: string;
  name: string;
  type: "text" | "announcement";
  categoryName: string | null;
  missingPermissions: string[];
}

export interface GuildRoleSummary {
  id: string;
  name: string;
  color: string | null;
  canPing: boolean;
}
