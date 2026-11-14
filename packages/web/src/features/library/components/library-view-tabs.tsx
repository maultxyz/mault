import { ViewTabs } from "@/components/view-tabs";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { COLLECTIONS_PATH } from "@/lib/constants/collections";
import { LIBRARY_PATH } from "@/lib/constants/nav";
import { STORAGE_PATH } from "@/lib/constants/storage";
import type { LibraryViewTabsProps } from "@/lib/interfaces/library";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function LibraryViewTabs({ value }: LibraryViewTabsProps) {
  const { t } = useTranslation("home");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  return (
    <ViewTabs
      label={t("library.title")}
      className="border-b-0"
      items={[
        { key: "collections" as const, label: t("library.collections") },
        { key: "storage" as const, label: t("library.storage") },
      ]}
      value={value}
      onChange={(next) => navigate(next === "storage" ? STORAGE_PATH : isMobile ? LIBRARY_PATH : COLLECTIONS_PATH)}
    />
  );
}
