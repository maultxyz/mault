import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { BUSINESS_TIPS_SEEN_KEY_PREFIX } from "@/lib/constants/storage-keys";
import type { BusinessTipsState, BusinessTipsTopic } from "@/lib/interfaces/business";
import { readKv, writeKv } from "@/lib/storage/kv";

export function useBusinessTips(topic: BusinessTipsTopic, canShowAutomatically: boolean): BusinessTipsState {
  const focused = useIsFocused();
  const seenKey = `${BUSINESS_TIPS_SEEN_KEY_PREFIX}${topic}`;
  const [hasSeenTips, setHasSeenTips] = useState(() => readKv(seenKey) === "true");
  const [isOpen, setIsOpen] = useState(false);
  const shouldOpenAutomatically = canShowAutomatically && focused && !hasSeenTips;

  useEffect(() => {
    if (shouldOpenAutomatically) setIsOpen(true);
  }, [shouldOpenAutomatically]);

  return {
    isOpen: isOpen && focused,
    open: () => setIsOpen(true),
    close: () => {
      setIsOpen(false);
      setHasSeenTips(true);
      writeKv(seenKey, "true");
    },
  };
}
