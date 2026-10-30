import { MobileListRow } from "@/components/mobile-list-row";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { AlphabetPanel } from "@/features/bins/components/alphabet-panel";
import { AutoAssignPanel } from "@/features/bins/components/auto-assign-panel";
import { BinConfigPanel } from "@/features/bins/components/bin-config-panel";
import { BinList } from "@/features/bins/components/bin-list";
import { BinRulesMenu } from "@/features/bins/components/bin-rules-menu";
import { MobilePresetSelector } from "@/features/bins/components/mobile-preset-selector";
import { RepackPanel } from "@/features/bins/components/repack-panel";
import {
  MOBILE_BINS_BIN_PARAM,
  MOBILE_BINS_SCREEN_PARAM,
} from "@/lib/constants/bins";
import {
  MOBILE_LIST_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
} from "@/lib/constants/nav";
import type { MobileBinsScreen } from "@/lib/interfaces/bins";
import { cn } from "@/lib/utils";
import { binSetMode } from "@magic-vault/shared";
import { IconAdjustmentsHorizontal, IconPackages } from "@tabler/icons-react";
import { useCallback, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export function MobileBins() {
  const { t } = useTranslation("bins");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    configs,
    selectedBin,
    setSelectedBin,
    selectedSet,
    isModeDirty,
  } = useBinConfigs();

  const binParam = Number(searchParams.get(MOBILE_BINS_BIN_PARAM));
  const openBinNumber = configs.some((config) => config.binNumber === binParam)
    ? binParam
    : null;
  const screenParam = searchParams.get(MOBILE_BINS_SCREEN_PARAM);
  const screen: MobileBinsScreen =
    openBinNumber != null
      ? "bin"
      : screenParam === "mode"
        ? "mode"
        : screenParam === "repack" && selectedSet?.isRepackMode
          ? "repack"
          : "overview";

  useEffect(() => {
    if (openBinNumber != null && openBinNumber !== selectedBin) {
      setSelectedBin(openBinNumber);
    }
  }, [openBinNumber, selectedBin, setSelectedBin]);

  const openScreen = (params: Record<string, string>) =>
    setSearchParams(params);

  const goBack = useCallback(() => {
    if (location.key !== "default") navigate(-1);
    else setSearchParams({}, { replace: true });
  }, [location.key, navigate, setSearchParams]);

  const savedMode = binSetMode(selectedSet);
  const modeLabel =
    savedMode === "rules"
      ? t("mobileBins.rulesMode")
      : t(`presetSelector.modeBadges.${savedMode}`);

  const screenBody = (content: ReactNode) => (
    <div
      className={cn(
        "@container min-h-0 flex-1 overflow-y-auto",
        MOBILE_NAV_SCROLL_PADDING_CLASS,
      )}
    >
      <div className={cn(MOBILE_PAGE_BODY_CLASS, "gap-4")}>{content}</div>
    </div>
  );

  if (screen === "bin" && openBinNumber != null) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <MobilePageHeader
          title={t("binLabel", { number: openBinNumber })}
          subtitle={selectedSet?.name}
          onBack={goBack}
        />
        {screenBody(<BinConfigPanel showTitle={false} />)}
      </div>
    );
  }

  if (screen === "mode") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <MobilePageHeader
          title={t("sortingModePanel.title")}
          subtitle={selectedSet?.name}
          onBack={goBack}
        />
        {screenBody(<AutoAssignPanel />)}
      </div>
    );
  }

  if (screen === "repack") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <MobilePageHeader
          title={t("repackPanel.heading")}
          subtitle={selectedSet?.name}
          onBack={goBack}
        />
        {screenBody(<RepackPanel />)}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MobilePageHeader
        title={t("page.title")}
        actions={<BinRulesMenu className="shrink-0" />}
      />
      {screenBody(
        <>
          <MobilePresetSelector />
          {selectedSet && (
            <div className={MOBILE_LIST_CLASS}>
              <MobileListRow
                icon={<IconAdjustmentsHorizontal />}
                label={t("sortingModePanel.title")}
                value={modeLabel}
                onClick={() => openScreen({ [MOBILE_BINS_SCREEN_PARAM]: "mode" })}
              />
              {selectedSet.isRepackMode && !isModeDirty && (
                <MobileListRow
                  icon={<IconPackages />}
                  label={t("repackPanel.heading")}
                  onClick={() =>
                    openScreen({ [MOBILE_BINS_SCREEN_PARAM]: "repack" })
                  }
                />
              )}
            </div>
          )}
          <AlphabetPanel />
          <section className="flex flex-col gap-2">
            <h2 className="font-heading text-sm font-semibold text-foreground">
              {t("mobileBins.binsTitle")}
            </h2>
            <BinList
              onOpenBin={(binNumber) => {
                setSelectedBin(binNumber);
                openScreen({ [MOBILE_BINS_BIN_PARAM]: String(binNumber) });
              }}
            />
          </section>
        </>,
      )}
    </div>
  );
}
