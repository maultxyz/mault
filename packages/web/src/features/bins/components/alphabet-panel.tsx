import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAlphabetPass } from "@/features/bins/api/use-alphabet-pass";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { AlphabetPassDialog } from "@/features/bins/components/alphabet-pass-dialog";
import { getCatchAllBin } from "@magic-vault/shared";
import { IconArrowLeft, IconArrowRight, IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function AlphabetPanel() {
  const { t } = useTranslation("bins");
  const { configs, isPresetMutating } = useBinConfigs();
  const { isActive, pass, passCount, letters, from, to, isLastPass } =
    useAlphabetPass();
  const [pendingPass, setPendingPass] = useState<number | null>(null);

  if (!isActive) return null;

  if (passCount === 0) {
    return (
      <p className="py-1.5 rounded-lg border px-3 text-xs bg-sidebar">
        {t("alphabetPanel.needBins")}
      </p>
    );
  }

  const catchAll = getCatchAllBin(configs);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold font-heading">
          {t("alphabetPanel.passHeading", {
            current: pass + 1,
            total: passCount,
          })}
        </h2>
        <p className="text-sm text-foreground/70">
          {t("alphabetPanel.passRange", { from, to })}
        </p>
      </div>

      <div className="grid grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-4 gap-2">
        {configs.map((config) => (
          <div
            key={config.binNumber}
            className="rounded-lg border p-2.5 flex items-center justify-between gap-2"
          >
            <span className="text-sm font-medium font-heading">
              {t("binLabel", { number: config.binNumber })}
            </span>
            {config.binNumber === catchAll?.binNumber ? (
              <Badge variant="default">{t("catchAll")}</Badge>
            ) : letters.has(config.binNumber) ? (
              <span className="text-lg font-semibold font-heading">
                {letters.get(config.binNumber)}
              </span>
            ) : (
              <span className="text-sm text-foreground/70">
                {t("alphabetPanel.unusedBin")}
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="py-1.5 rounded-lg border px-3 text-xs bg-sidebar">
        {isLastPass
          ? t("alphabetPanel.lastPassHint")
          : t("alphabetPanel.nextPassHint")}
      </p>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPresetMutating || pass === 0}
          onClick={() => setPendingPass(pass - 1)}
        >
          <IconArrowLeft /> {t("alphabetPanel.previous")}
        </Button>
        {isLastPass ? (
          <Button
            type="button"
            disabled={isPresetMutating || passCount === 1}
            onClick={() => setPendingPass(0)}
          >
            <IconRefresh /> {t("alphabetPanel.startOver")}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={isPresetMutating}
            onClick={() => setPendingPass(pass + 1)}
          >
            {t("alphabetPanel.next")} <IconArrowRight />
          </Button>
        )}
      </div>

      <AlphabetPassDialog
        pendingPass={pendingPass}
        onClose={() => setPendingPass(null)}
      />
    </div>
  );
}
