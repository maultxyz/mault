import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { formatUsd } from "@/features/scanner/components/scan-stats";
import { computeStats } from "@/features/scanner/lib/compute-stats";
import { DOCUMENT_TITLE_CYCLE_MS as CYCLE_MS } from "@/lib/constants/timing";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const BASE_TITLE = "MAULT";

export function DocumentTitleUpdater() {
  const { t } = useTranslation("scanner");
  const { cards } = useScannedCards();
  const { activeCollection } = useCollections();
  const { selectedSet } = useBinConfigs();
  const stats = useMemo(() => computeStats(cards), [cards]);

  const slides = useMemo(() => {
    const result: string[] = [];
    if (activeCollection) result.push(activeCollection.name);
    if (selectedSet)
      result.push(t("documentTitle.sorting", { setName: selectedSet.name }));
    result.push(
      stats
        ? t("documentTitle.cardsScanned", { count: stats.totalCount })
        : t("documentTitle.noCardsScanned"),
    );
    if (stats?.mostValuable) {
      result.push(
        t("documentTitle.mostValuable", {
          price: formatUsd(stats.mostValuable.price),
          name: stats.mostValuable.name,
        }),
      );
    }
    return result;
  }, [activeCollection, selectedSet, stats, t]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      CYCLE_MS,
    );
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    const slide = slides[index % slides.length];
    document.title = slide ? `${slide} - ${BASE_TITLE}` : BASE_TITLE;
  }, [slides, index]);

  useEffect(
    () => () => {
      document.title = BASE_TITLE;
    },
    [],
  );

  return null;
}
