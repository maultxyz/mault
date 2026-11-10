import { ListSkeleton } from "@/components/list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useOwnerCardHolds } from "@/features/card-holds/api/use-owner-card-holds";
import type { CardHoldsButtonProps } from "@/lib/interfaces/card-holds";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CardHold } from "@magic-vault/shared";
import { IconHandStop } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CardHoldsButton({
  scope,
  buttonVariant = "outline",
  className,
}: CardHoldsButtonProps) {
  const { t, i18n } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const { holds, approveHold, releaseHold } = useOwnerCardHolds(scope);
  const holdCount = holds.data?.length ?? 0;

  if (holdCount === 0 && !open) return null;

  const heldUntil = (hold: CardHold) =>
    hold.expiresAt
      ? t("cardHolds.heldUntil", {
          time: new Date(hold.expiresAt).toLocaleTimeString(i18n.language, {
            hour: "numeric",
            minute: "2-digit",
          }),
        })
      : t("cardHolds.approved");

  const approve = async (hold: CardHold) => {
    try {
      await approveHold.mutateAsync(hold.guid);
      toast.success(t("cardHolds.approvedToast", { name: hold.cardName }));
    } catch {
      toast.error(t("cardHolds.approveFailed"));
    }
  };

  const release = async (hold: CardHold) => {
    try {
      await releaseHold.mutateAsync(hold.guid);
      toast.success(t("cardHolds.released", { name: hold.cardName }));
    } catch {
      toast.error(t("cardHolds.releaseFailed"));
    }
  };

  return (
    <DynamicDialog
      open={open}
      onOpenChange={setOpen}
      title={t("cardHolds.ownerTitle")}
      description={t("cardHolds.ownerDescription")}
      trigger={
        <Button
          variant={buttonVariant}
          className={cn("shrink-0", className)}
          aria-label={t("cardHolds.ownerTrigger", { count: holdCount })}
          title={t("cardHolds.ownerTrigger", { count: holdCount })}
        >
          <IconHandStop />
          <span aria-hidden>{holdCount}</span>
        </Button>
      }
    >
      {holds.isPending ? (
        <ListSkeleton rows={2} />
      ) : holdCount === 0 ? (
        <p className="text-control text-foreground/70">{t("cardHolds.ownerEmpty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {holds.data?.map((hold) => (
            <li key={hold.guid} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <img
                src={hold.cardImage ?? ""}
                alt=""
                className="aspect-[2.5/3.5] w-12 shrink-0 rounded-sm object-cover ring-1 ring-border"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-control">
                <p className="truncate font-medium">{hold.cardName}</p>
                <p className="truncate text-foreground/70">
                  {[hold.cardSetName, hold.isFoil ? t("cardHolds.foil") : null, hold.condition]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p>
                  {t("cardHolds.heldBy", { name: hold.guestName })}
                  {" · "}
                  {heldUntil(hold)}
                </p>
                {hold.guestNote && (
                  <p className="whitespace-pre-wrap break-words text-foreground/70">
                    {hold.guestNote}
                  </p>
                )}
                {!hold.approvedAt && (
                  <Badge variant="warning" className="self-start">
                    {t("cardHolds.awaitingApproval")}
                  </Badge>
                )}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {!hold.approvedAt && (
                    <Button
                      variant="outline"
                      disabled={approveHold.isPending}
                      onClick={() => void approve(hold)}
                      aria-label={t("cardHolds.approveFor", { name: hold.cardName })}
                    >
                      {t("cardHolds.approve")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="text-destructive"
                    disabled={releaseHold.isPending}
                    onClick={() => void release(hold)}
                    aria-label={t("cardHolds.releaseFor", { name: hold.cardName })}
                  >
                    {t("cardHolds.release")}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DynamicDialog>
  );
}
