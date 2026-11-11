import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TradeOfferOfferedRowProps } from "@/lib/interfaces/trade-offers";
import {
  CARD_CONDITIONS,
  TRADE_OFFER_CARD_QUANTITY_MAX,
  isCardCondition,
} from "@magic-vault/shared";
import { IconTrash } from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function TradeOfferOfferedRow({ draft, onChange, onRemove }: TradeOfferOfferedRowProps) {
  const { t } = useTranslation("cards");
  const { t: tCommon } = useTranslation("common");
  const foilId = useId();
  const { option } = draft;

  return (
    <li className="flex flex-col gap-2 p-2">
      <div className="flex items-center gap-2.5">
        <img
          src={option.imageUrl ?? ""}
          alt=""
          className="aspect-[2.5/3.5] w-10 shrink-0 rounded-sm bg-muted object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-control font-medium">{option.name}</span>
          <span className="truncate text-xs text-foreground/70">
            {[option.setName || option.setCode.toUpperCase(), option.collectorNumber ? `#${option.collectorNumber}` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={tCommon("a11y.removeItem", { name: option.name })}
          onClick={onRemove}
        >
          <IconTrash />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-12.5">
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={TRADE_OFFER_CARD_QUANTITY_MAX}
          value={draft.quantity}
          aria-label={t("tradeOffers.quantityFor", { name: option.name })}
          className="w-16"
          onChange={(event) => {
            const quantity = Math.min(
              Math.max(Number.parseInt(event.target.value, 10) || 1, 1),
              TRADE_OFFER_CARD_QUANTITY_MAX,
            );
            onChange({ ...draft, quantity });
          }}
        />
        <Select
          value={draft.condition}
          onValueChange={(next) => {
            if (isCardCondition(next)) onChange({ ...draft, condition: next });
          }}
        >
          <SelectTrigger
            className="w-44"
            aria-label={t("tradeOffers.conditionFor", { name: option.name })}
          >
            <SelectValue>{t(`condition.names.${draft.condition}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CARD_CONDITIONS.map((condition) => (
              <SelectItem key={condition} value={condition}>
                {t(`condition.names.${condition}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex items-center gap-1.5 pl-1">
          <Checkbox
            id={foilId}
            checked={draft.isFoil}
            onCheckedChange={(checked) => onChange({ ...draft, isFoil: checked === true })}
          />
          <label htmlFor={foilId} className="text-control">
            {t("foil")}
          </label>
        </span>
      </div>
    </li>
  );
}
