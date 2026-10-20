import { PlatformDiscordChannelsManager } from "@/features/admin/components/platform-discord-channels-manager";
import { AnnouncementsManager } from "@/features/announcements/components/announcements-manager";

export default function AdminDiscordPage() {
  return (
    <>
      <PlatformDiscordChannelsManager />

      <AnnouncementsManager />
    </>
  );
}
