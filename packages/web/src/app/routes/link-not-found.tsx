import { ShareLinkStatusScreen } from "@/features/public-cards/components/share-link-status-screen";
import { useTranslation } from "react-i18next";

export default function LinkNotFoundPage() {
  const { t } = useTranslation("common");
  return (
    <ShareLinkStatusScreen
      status="invalid"
      invalidTitle={t("shareLink.shortLinkInvalidTitle")}
      invalidDescription={t("shareLink.shortLinkInvalidDescription")}
      onRetry={() => window.location.reload()}
    />
  );
}
