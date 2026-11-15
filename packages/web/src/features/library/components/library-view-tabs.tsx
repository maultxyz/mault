import { ViewTabs } from "@/components/view-tabs";
import { usePendingTradeOffers } from "@/features/trade-offers/api/trade-offers";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { COLLECTIONS_PATH } from "@/lib/constants/collections";
import { LIBRARY_PATH } from "@/lib/constants/nav";
import { STORAGE_PATH } from "@/lib/constants/storage";
import { TRADES_PATH } from "@/lib/constants/trade-offers";
import type { LibraryView, LibraryViewTabsProps } from "@/lib/interfaces/library";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function LibraryViewTabs({ value }: LibraryViewTabsProps) {
  const { t } = useTranslation("home");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const pendingTradeOffers = usePendingTradeOffers();
  const pathByView: Record<LibraryView, string> = {
    collections: isMobile ? LIBRARY_PATH : COLLECTIONS_PATH,
    storage: STORAGE_PATH,
    trades: TRADES_PATH,
  };
  return (
    <ViewTabs
      label={t("library.title")}
      className="border-b-0"
      items={[
        { key: "collections" as const, label: t("library.collections") },
        { key: "storage" as const, label: t("library.storage") },
        { key: "trades" as const, label: t("library.trades"), badge: pendingTradeOffers.length },
      ]}
      value={value}
      onChange={(next) => navigate(pathByView[next])}
    />
  );
}
