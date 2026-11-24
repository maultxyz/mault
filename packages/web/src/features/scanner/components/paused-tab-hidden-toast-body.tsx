import { DOWNLOAD_PATH } from "@/lib/constants/download";
import { useTranslation } from "react-i18next";

export function PausedTabHiddenToastBody() {
  const { t } = useTranslation("scanner");
  const { t: tCommon } = useTranslation("common");
  return (
    <div className="flex flex-col gap-2">
      <span>{t("cardScanner.pausedTabHidden.description")}</span>
      <span>
        {t("cardScanner.pausedTabHidden.desktopAppHint")}{" "}
        <a
          href={DOWNLOAD_PATH}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline underline-offset-2"
        >
          {t("cardScanner.pausedTabHidden.desktopAppLink")}
          <span className="sr-only"> {tCommon("publicNav.opensInNewTab")}</span>
        </a>
      </span>
    </div>
  );
}
