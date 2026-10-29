import { EmptyState } from "@/components/empty-state";
import { IconUserScan } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScanningBlockedWhileImpersonating() {
  const { t } = useTranslation("common");
  return (
    <EmptyState
      icon={IconUserScan}
      title={t("impersonation.scanningBlockedTitle")}
      description={t("impersonation.scanningBlockedDescription")}
      className="h-full"
    />
  );
}
