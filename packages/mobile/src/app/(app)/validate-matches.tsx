import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { IconButton } from "@/components/ui/icon-button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { TabStrip } from "@/components/ui/tab-strip";
import { matchValidationProgressQueryOptions } from "@/features/match-validations/api/match-validations";
import { MatchValidationGuideSheet } from "@/features/match-validations/components/match-validation-guide-sheet";
import { MatchValidationQueue } from "@/features/match-validations/components/match-validation-queue";
import { MatchValidationScanList } from "@/features/match-validations/components/match-validation-scan-list";
import { useTheme } from "@/hooks/use-theme";
import { MATCH_VALIDATION_ALL_GAMES, MATCH_VALIDATION_VIEWS } from "@/lib/constants/match-validations";
import { MATCH_VALIDATION_GUIDE_SEEN_KEY } from "@/lib/constants/storage-keys";
import type { MatchValidationView } from "@/lib/interfaces/match-validations";
import { readKv, writeKv } from "@/lib/storage/kv";

export default function ValidateMatchesScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [view, setView] = useState<MatchValidationView>("review");
  const [gameKey, setGameKey] = useState<string | null>(null);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => readKv(MATCH_VALIDATION_GUIDE_SEEN_KEY) !== "true");
  const { data: progress } = useQuery(matchValidationProgressQueryOptions);
  const games = progress?.games ?? [];
  const selectedGameName = games.find((game) => game.gameKey === gameKey)?.gameName ?? gameKey;

  const closeGuide = () => {
    writeKv(MATCH_VALIDATION_GUIDE_SEEN_KEY, "true");
    setGuideOpen(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("matchValidations.title")}
        onBack={() => router.back()}
        subtitle={gameKey ? selectedGameName : null}
        actions={
          <>
            {games.length > 1 ? (
              <IconButton
                icon="filter"
                selected={!!gameKey}
                accessibilityLabel={
                  gameKey
                    ? `${t("matchValidations.gameFilter.label")}, ${selectedGameName}`
                    : t("matchValidations.gameFilter.label")
                }
                onPress={() => setGamePickerOpen(true)}
              />
            ) : null}
            <IconButton icon="help" accessibilityLabel={t("matchValidations.guide.open")} onPress={() => setGuideOpen(true)} />
          </>
        }
        tabs={
          <TabStrip<MatchValidationView>
            value={view}
            onChange={setView}
            items={MATCH_VALIDATION_VIEWS.map((value) => ({ value, label: t(`matchValidations.views.${value}`) }))}
          />
        }
      />

      {view === "review" ? (
        <MatchValidationQueue key={gameKey ?? MATCH_VALIDATION_ALL_GAMES} gameKey={gameKey} />
      ) : (
        <MatchValidationScanList key={gameKey ?? MATCH_VALIDATION_ALL_GAMES} gameKey={gameKey} />
      )}

      <OptionSheet
        visible={gamePickerOpen}
        title={t("matchValidations.gameFilter.label")}
        options={[
          { value: MATCH_VALIDATION_ALL_GAMES, label: t("matchValidations.gameFilter.all") },
          ...games.map((game) => ({ value: game.gameKey, label: game.gameName })),
        ]}
        selected={[gameKey ?? MATCH_VALIDATION_ALL_GAMES]}
        onSelect={(value) => {
          setGamePickerOpen(false);
          setGameKey(value === MATCH_VALIDATION_ALL_GAMES ? null : value);
        }}
        onClose={() => setGamePickerOpen(false)}
      />
      <MatchValidationGuideSheet visible={guideOpen} onClose={closeGuide} />
    </View>
  );
}
