import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FeatureHighlightsPanel } from "@/features/feature-highlights/components/feature-highlights-panel";
import type { FeatureHighlightsDrawerProps } from "@/lib/interfaces/feature-highlights";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function FeatureHighlightsDrawer({
  open,
  status,
  slides,
  onDismiss,
  onRetry,
}: FeatureHighlightsDrawerProps) {
  const { t } = useTranslation("common");
  const [shownContent, setShownContent] = useState({ status, slides });
  if (open && (shownContent.status !== status || shownContent.slides !== slides)) {
    setShownContent({ status, slides });
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onDismiss();
      }}
    >
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader className="py-0">
          <DrawerTitle className="text-start text-base font-semibold">
            {t("featureHighlights.title")}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-3">
          <FeatureHighlightsPanel
            status={shownContent.status}
            slides={shownContent.slides}
            onDismiss={onDismiss}
            onRetry={onRetry}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
