import { ApiKeysIntegration } from "@/features/integrations/components/api-keys-integration";
import { DiscordIntegration } from "@/features/integrations/components/discord-integration";

export default function SettingsIntegrationsPage() {
  return (
    <div className="flex flex-col gap-10">
      <DiscordIntegration />
      <ApiKeysIntegration />
    </div>
  );
}
