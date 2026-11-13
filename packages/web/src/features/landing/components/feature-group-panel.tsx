import {
  FEATURE_GROUP_ITEM_REVEAL_STAGGER_MS,
  FEATURE_REVEAL_HIDDEN_CLASS,
  MARKETING_CARD_CLASS,
} from "@/lib/constants/landing";
import type { FeatureGroupPanelProps } from "@/lib/interfaces/landing";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function FeatureGroupPanel({
  group,
  isRevealed,
}: FeatureGroupPanelProps) {
  const { t } = useTranslation("landing");
  const { key, icon: GroupIcon, items } = group;

  return (
    <div className={cn(MARKETING_CARD_CLASS, "gap-6")}>
      <div className="flex items-center gap-3">
        <GroupIcon aria-hidden className="size-5 text-primary" />
        <h4 className="font-heading text-base font-semibold">
          {t(`features.groups.${key}`)}
        </h4>
      </div>
      <ul className="flex flex-col gap-5">
        {items.map(({ key: itemKey, icon: ItemIcon }, index) => (
          <li
            key={itemKey}
            style={{
              animationDelay: `${index * FEATURE_GROUP_ITEM_REVEAL_STAGGER_MS}ms`,
            }}
            className={cn(
              "flex gap-3",
              isRevealed
                ? "animate-in fade-in slide-in-from-bottom-2 duration-500 [animation-fill-mode:both] motion-reduce:animate-none"
                : FEATURE_REVEAL_HIDDEN_CLASS,
            )}
          >
            <ItemIcon
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-foreground/70"
            />
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold">
                {t(`features.more.items.${itemKey}.title`)}
              </p>
              <p className="mt-1 text-sm/relaxed text-foreground/70">
                {t(`features.more.items.${itemKey}.description`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
