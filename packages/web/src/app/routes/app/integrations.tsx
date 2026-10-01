import { DiscordIntegration } from "@/features/integrations/components/discord-integration";
import { useTranslation } from "react-i18next";

export default function IntegrationsPage() {
  const { t } = useTranslation("integrations");

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
        <div>
          <h1 className="font-heading text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-foreground/70">{t("subtitle")}</p>
        </div>
        <DiscordIntegration />
      </div>
    </div>
  );
}
