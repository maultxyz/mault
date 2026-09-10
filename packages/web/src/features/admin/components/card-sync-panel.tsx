import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCardSync } from "@/features/admin/api/use-card-sync";
import { formatDuration } from "@/features/admin/lib/format-duration";
import { SYNC_STATUS_COLORS } from "@/lib/constants/colors";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function CardSyncPanel() {
  const { t } = useTranslation("admin");
  const {
    syncState,
    sources,
    isRunning,
    total,
    done,
    progress,
    etaMs,
    start,
    isStarting,
    cancel,
    isCancelling,
  } = useCardSync();
  const logRef = useRef<HTMLDivElement>(null);
  const [syncGameKey, setSyncGameKey] = useState<string | null>(null);
  const [syncLang, setSyncLang] = useState<string>("en");

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [syncState.logs]);

  const selectedSource = sources.find((s) => s.gameKey === syncGameKey);

  return (
    <div className="flex flex-col flex-none">
      <div className="rounded-lg rounded-b-none border p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-sm font-medium">
              {t("cardImageVectors.heading")}
            </p>
            <p
              className="text-xs font-medium"
              style={{ color: SYNC_STATUS_COLORS[syncState.status] }}
            >
              {t(`cardImageVectors.syncStatus.${syncState.status}`)}
              {isRunning &&
                ` — ${
                  sources.find((s) => s.gameKey === syncState.gameKey)
                    ?.label ?? syncState.gameKey
                }${
                  syncState.lang !== "en"
                    ? ` (${LANGUAGE_LABELS[syncState.lang] ?? syncState.lang})`
                    : ""
                }`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isRunning && (
              <Select
                value={syncGameKey}
                onValueChange={(value) => {
                  setSyncGameKey(value);
                  const source = sources.find((s) => s.gameKey === value);
                  setSyncLang(source?.languages[0] ?? "en");
                }}
              >
                <SelectTrigger className="w-56">
                  <SelectValue
                    placeholder={t("cardImageVectors.selectGamePlaceholder")}
                  >
                    {selectedSource?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sources.map((source) => (
                    <SelectItem key={source.gameKey} value={source.gameKey}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!isRunning && (selectedSource?.languages.length ?? 0) > 1 && (
              <Select
                value={syncLang}
                onValueChange={(value) => setSyncLang(value ?? "en")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue
                    placeholder={t("cardImageVectors.languagePlaceholder")}
                  >
                    {LANGUAGE_LABELS[syncLang] ?? syncLang}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {selectedSource?.languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang] ?? lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isRunning ? (
              <Button
                variant="outline"
                disabled={isCancelling}
                onClick={() => cancel()}
              >
                {isCancelling
                  ? t("cardImageVectors.cancellingButton")
                  : t("cardImageVectors.cancelButton")}
              </Button>
            ) : (
              <Button
                disabled={isRunning || isStarting || !syncGameKey}
                onClick={() => start(syncGameKey!, syncLang)}
              >
                {isStarting
                  ? t("cardImageVectors.startingButton")
                  : t("cardImageVectors.startSyncButton")}
              </Button>
            )}
          </div>
        </div>

        {total > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground tabular-nums">
              <span>{t("cardImageVectors.progressCount", { done, total })}</span>
              <span>
                {t("cardImageVectors.vectorizedCount", {
                  count: syncState.processed,
                })}
              </span>
              <span>
                {t("cardImageVectors.skippedCount", {
                  count: syncState.skipped,
                })}
              </span>
              {isRunning && etaMs !== null && (
                <span>
                  {t("cardImageVectors.etaRemaining", {
                    duration: formatDuration(etaMs),
                  })}
                </span>
              )}
              {syncState.errors > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {t("cardImageVectors.errorsCount", {
                    count: syncState.errors,
                  })}
                </span>
              )}
            </div>
            {isRunning && syncState.currentCard && (
              <p className="text-xs text-muted-foreground truncate">
                {syncState.currentCard}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg rounded-t-none border border-t-0 overflow-hidden">
        <div className="px-3 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">
            {t("log.heading")}
          </p>
        </div>
        <div
          ref={logRef}
          className="max-h-96 overflow-y-auto p-3 font-mono text-xs leading-relaxed space-y-0.5"
        >
          {syncState.logs.length > 0 ? (
            syncState.logs.map((line, i) => (
              <p
                key={i}
                className="text-muted-foreground whitespace-pre-wrap break-all"
              >
                {line}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground whitespace-pre-wrap break-all">
              {t("log.empty")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
