import { MarketingRule } from "@/components/marketing-rule";
import {
  FEATURE_GROUP_ITEM_REVEAL_STAGGER_MS,
  FEATURE_REVEAL_HIDDEN_CLASS,
} from "@/lib/constants/landing";
import type { FeatureGroupPanelProps } from "@/lib/interfaces/landing";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function FeatureGroupPanel({
  group,
  numberLabel,
  isRevealed,
}: FeatureGroupPanelProps) {
  const { t } = useTranslation("landing");
  const { key, icon: GroupIcon, items } = group;

  return (
    <div className="flex flex-col gap-5 bg-card p-5 md:p-6">
      <MarketingRule
        lead={numberLabel}
        label={t(`features.groups.${key}`)}
        aside={<GroupIcon className="size-4" />}
      />
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
            <ItemIcon className="mt-0.5 size-4 shrink-0 text-primary" />
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
