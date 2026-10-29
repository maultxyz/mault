import { ListSkeleton } from "@/components/list-skeleton";
import { StatGroup } from "@/components/stat-group";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  accuracyCheckQueryOptions,
  completeAccuracyCheck,
  recordAccuracySample,
} from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import { StatusBadge } from "@/features/business/components/status-badge";
import { formatPercent } from "@/features/business/lib/format";
import { collectionViewPath } from "@/lib/constants/collections";
import type { SpotCheckRunnerProps } from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import type { AccuracySampleResult } from "@magic-vault/shared";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconFlagCheck,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function SpotCheckRunner({ guid, onClose }: SpotCheckRunnerProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const { data: check, isLoading } = useQuery(accuracyCheckQueryOptions(guid));
  const [index, setIndex] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  if (isLoading || !check) return <ListSkeleton rows={8} />;

  const firstOpen = check.samples.findIndex((sample) => sample.result === null);
  const current = Math.min(
    index ?? (firstOpen === -1 ? 0 : firstOpen),
    check.samples.length - 1,
  );
  const sample = check.samples[current];
  const isOpen = check.status === "open";
  const wrong = check.samples.filter((s) => s.result === "incorrect");

  const record = async (result: AccuracySampleResult) => {
    setPending(true);
    const saved = await run(() =>
      recordAccuracySample(check.guid, { scanId: sample.scanId, result }),
    );
    setPending(false);
    if (saved && current < check.samples.length - 1) setIndex(current + 1);
  };

  const finish = async () => {
    setPending(true);
    await run(() => completeAccuracyCheck(check.guid), t("accuracy.finished"));
    setPending(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={onClose}>
          <IconArrowLeft />
          {t("accuracy.back")}
        </Button>
        <h2 className="mr-auto font-heading text-sm font-semibold">
          {t("accuracy.checkTitle", { name: check.collectionName })}
        </h2>
        <StatusBadge status={check.status} />
        {isOpen && (
          <Button disabled={pending || check.checked === 0} onClick={() => void finish()}>
            <IconFlagCheck />
            {t("accuracy.finish")}
          </Button>
        )}
      </div>

      <StatGroup
        heading={t("accuracy.progress")}
        gridClassName="grid-cols-2 sm:grid-cols-4"
        tiles={[
          {
            key: "checked",
            label: t("accuracy.checked"),
            value: `${check.checked}/${check.sampleSize}`,
          },
          { key: "wrong", label: t("accuracy.wrong"), value: check.incorrect },
          {
            key: "accuracy",
            label: t("accuracy.estimate"),
            value: formatPercent(check.estimate?.accuracy),
          },
          {
            key: "range",
            label: t("accuracy.range"),
            value: check.estimate
              ? `${formatPercent(check.estimate.low)} - ${formatPercent(check.estimate.high)}`
              : null,
          },
        ]}
      />

      {sample && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("accuracy.previous")}
              disabled={current === 0}
              onClick={() => setIndex(current - 1)}
            >
              <IconChevronLeft />
            </Button>
            <p className="text-xs tabular-nums text-foreground/70">
              {t("accuracy.position", {
                current: current + 1,
                total: check.samples.length,
              })}
            </p>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("accuracy.next")}
              disabled={current >= check.samples.length - 1}
              onClick={() => setIndex(current + 1)}
            >
              <IconChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <figure className="flex flex-col gap-1">
              <figcaption className="text-xs text-foreground/70">
                {t("accuracy.scanned")}
              </figcaption>
              <div className="aspect-[2.5/3.5] overflow-hidden rounded-md bg-muted">
                {sample.capturedImageUrl && (
                  <img
                    src={sample.capturedImageUrl}
                    alt={t("accuracy.scanned")}
                    className="size-full object-fill"
                  />
                )}
              </div>
            </figure>
            <figure className="flex flex-col gap-1">
              <figcaption className="text-xs text-foreground/70">
                {t("accuracy.matched")}
              </figcaption>
              <div className="aspect-[2.5/3.5] overflow-hidden rounded-md bg-muted">
                {sample.card?.image?.normal && (
                  <img
                    src={sample.card.image.normal}
                    alt={sample.card.name}
                    className="size-full object-cover"
                  />
                )}
              </div>
            </figure>
          </div>
          {sample.card ? (
            <p className="text-sm">
              <span className="font-medium">{sample.card.name}</span>{" "}
              <span className="text-foreground/70">
                {sample.card.set.toUpperCase()} #{sample.card.collectorNumber} ·{" "}
                {sample.condition}
                {sample.isFoil ? ` · ${t("table.foil")}` : ""}
              </span>
            </p>
          ) : (
            <p className="text-sm text-foreground/70">{t("accuracy.cardGone")}</p>
          )}
          {isOpen && sample.card && (
            <div className="flex gap-1.5">
              <Button
                variant={sample.result === "incorrect" ? "destructive" : "outline-destructive"}
                className="flex-1"
                disabled={pending}
                onClick={() => void record("incorrect")}
              >
                <IconX />
                {t("accuracy.markWrong")}
              </Button>
              <Button
                variant={sample.result === "correct" ? "default" : "outline"}
                className="flex-1"
                disabled={pending}
                onClick={() => void record("correct")}
              >
                <IconCheck />
                {t("accuracy.markCorrect")}
              </Button>
            </div>
          )}
        </div>
      )}

      {wrong.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-heading text-sm font-semibold">
            {t("accuracy.wrongList")}
          </h3>
          <div className="flex flex-col divide-y rounded-lg border">
            {wrong.map((entry) => (
              <div key={entry.scanId} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {entry.card?.name ?? t("accuracy.cardGone")}
                </span>
                <Link
                  to={`${collectionViewPath(check.collectionGuid)}/cards/${entry.scanId}`}
                  className={cn(buttonVariants({ variant: "ghost", size: "default" }))}
                >
                  <IconExternalLink />
                  {t("accuracy.fix")}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
