import { useUnmatchedView } from "@/features/scanner/api/use-unmatched-view";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { InlineUnmatchedCardsState } from "@/lib/interfaces/scanner";
import { useState } from "react";

export function useInlineUnmatchedCards(): InlineUnmatchedCardsState {
  const isMobile = useIsMobile();
  const unmatchedView = useUnmatchedView();
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const [mobileDialogIndex, setMobileDialogIndex] = useState<number | null>(
    null,
  );
  return {
    open: (position) => {
      if (isMobile) {
        setMobileDialogIndex(position);
        setIsMobileDialogOpen(true);
        return;
      }
      unmatchedView.open(position);
    },
    isMobileDialogOpen,
    setIsMobileDialogOpen,
    mobileDialogIndex,
    setMobileDialogIndex,
  };
}
