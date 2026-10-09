import { useBoardType } from "@/features/build/api/use-board-type";
import { useEsp32MountType } from "@/features/build/api/use-esp32-mount-type";
import { useKitMode } from "@/features/build/api/use-kit-mode";
import { useModuleCount } from "@/features/build/api/use-module-count";
import { BOARD_INFO, BUILD_SETUP_ANCHOR } from "@/lib/constants/build";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function BuildSelectionSummary() {
  const { t } = useTranslation("build");
  const { moduleCount } = useModuleCount();
  const { boardType } = useBoardType();
  const { mountType } = useEsp32MountType();
  const { usingKit } = useKitMode();

  const items = [
    usingKit ? t("setup.summary.kit") : t("setup.summary.diy"),
    BOARD_INFO[boardType].shortName,
    ...(boardType === "esp32" ? [t(`setup.summary.${mountType}`)] : []),
    t("setup.summary.modules", { count: moduleCount }),
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-foreground/70">{t("setup.summary.label")}</span>
      {items.map((item) => (
        <span
          key={item}
          className="rounded-md border bg-card px-2 py-0.5 font-medium"
        >
          {item}
        </span>
      ))}
      <a
        href={`#${BUILD_SETUP_ANCHOR}`}
        className="inline-flex items-center gap-1.5 rounded-sm px-1 font-medium text-primary underline-offset-2 hover:underline"
      >
        <IconAdjustmentsHorizontal className="size-4" />
        {t("setup.summary.change")}
      </a>
    </div>
  );
}
