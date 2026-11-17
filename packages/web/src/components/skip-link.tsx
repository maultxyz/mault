import { MAIN_CONTENT_ID, SKIP_LINK_CLASS } from "@/lib/constants/a11y";
import { useTranslation } from "react-i18next";

export function SkipLink() {
  const { t } = useTranslation("common");
  return (
    <a href={`#${MAIN_CONTENT_ID}`} className={SKIP_LINK_CLASS}>
      {t("a11y.skipToContent")}
    </a>
  );
}
