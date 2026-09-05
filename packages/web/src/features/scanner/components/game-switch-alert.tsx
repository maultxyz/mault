import { useCollections } from "@/features/collections/api/use-collections";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function GameSwitchAlert() {
  const { t } = useTranslation("scanner");
  const { activeCollection } = useCollections();
  const gameKey = activeCollection?.game?.key;
  const prevGameKeyRef = useRef(gameKey);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prevGameKey = prevGameKeyRef.current;
    if (
      prevGameKey !== undefined &&
      gameKey !== undefined &&
      gameKey !== prevGameKey
    ) {
      setVisible(true);
    }
    prevGameKeyRef.current = gameKey;
  }, [gameKey]);

  if (!visible) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
      <IconAlertTriangle
        size={14}
        className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-400"
      />
      <p className="flex-1 text-[11px]/relaxed text-amber-800 dark:text-amber-400">
        {t("gameSwitchAlert.message")}
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="shrink-0 text-amber-800/70 hover:text-amber-800 dark:text-amber-400/70 dark:hover:text-amber-400"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}
