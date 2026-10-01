import { SettingsSections } from "@/components/settings-section";
import { NoGameBanner } from "@/features/bins/components/no-game-banner";
import { useCollections } from "@/features/collections/api/use-collections";
import { SoundClipLibrary } from "@/features/sounds/components/sound-clip-library";
import { SoundRuleList } from "@/features/sounds/components/sound-rule-list";
import { useTranslation } from "react-i18next";

export default function SoundsPage() {
  const { t } = useTranslation("sounds");
  const { activeCollection } = useCollections();
  const game = activeCollection?.game;

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="font-heading text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-foreground/70">
            {game
              ? t("subtitle", { game: game.name })
              : t("subtitleNoGame")}
          </p>
        </div>
        <NoGameBanner />
        <SettingsSections>
          <SoundClipLibrary />
          {game && <SoundRuleList gameGuid={game.guid} />}
        </SettingsSections>
      </div>
    </div>
  );
}
