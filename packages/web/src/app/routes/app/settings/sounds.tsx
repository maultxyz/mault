import { SettingsSections } from "@/components/settings-section";
import { NoGameBanner } from "@/features/bins/components/no-game-banner";
import { useCollections } from "@/features/collections/api/use-collections";
import { SoundClipLibrary } from "@/features/sounds/components/sound-clip-library";
import { SoundRuleList } from "@/features/sounds/components/sound-rule-list";
import { useTranslation } from "react-i18next";

export default function SettingsSoundsPage() {
  const { t } = useTranslation("sounds");
  const { activeCollection } = useCollections();
  const game = activeCollection?.game;

  return (
    <>
      <p className="text-sm text-foreground/70">
        {game ? t("subtitle", { game: game.name }) : t("subtitleNoGame")}
      </p>
      <NoGameBanner />
      <SettingsSections>
        <SoundClipLibrary />
        {game && <SoundRuleList key={game.guid} gameGuid={game.guid} />}
      </SettingsSections>
    </>
  );
}
