import type { TradeOfferGuestBalanceProps } from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";
import { formatPrice } from "@magic-vault/shared";
import { IconScale } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function TradeOfferGuestBalance({ balance, priceSource, isUpdating }: TradeOfferGuestBalanceProps) {
  const { t } = useTranslation("cards");
  const format = (value: number) => formatPrice(value, priceSource);

  return (
    <div
      aria-busy={isUpdating}
      className={cn("flex flex-col gap-1 transition-opacity motion-reduce:transition-none", isUpdating && "opacity-60")}
    >
      <dl className="grid grid-cols-3 gap-2 text-control">
        <div className="flex flex-col">
          <dt className="text-xs text-foreground/70">{t("tradeOffers.balance.youGet")}</dt>
          <dd className="font-semibold tabular-nums">{format(balance.getValue)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-foreground/70">{t("tradeOffers.balance.youGive")}</dt>
          <dd className="font-semibold tabular-nums">{format(balance.giveValue)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-foreground/70">{t("tradeOffers.balance.difference")}</dt>
          <dd className="flex items-center gap-1 font-semibold tabular-nums">
            <IconScale className="size-3.5 shrink-0 text-foreground/70" aria-hidden />
            {balance.difference > 0
              ? t("tradeOffers.balance.youGiveMore", { amount: format(balance.difference) })
              : balance.difference < 0
                ? t("tradeOffers.balance.youGetMore", { amount: format(-balance.difference) })
                : t("tradeOffers.balance.even")}
          </dd>
        </div>
      </dl>
      {balance.hasMissingPrices && (
        <p className="text-xs text-foreground/70">{t("tradeOffers.balance.missingPrices")}</p>
      )}
    </div>
  );
}
