import { CardImage } from "@/components/card-image";
import { EmptyState } from "@/components/empty-state";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { OrgProfileReorderButtons } from "@/features/org-profile/components/org-profile-reorder-buttons";
import { OrgProfileShowcasePicker } from "@/features/org-profile/components/org-profile-showcase-picker";
import { moveListItem } from "@/features/org-profile/lib/org-profile-form";
import type { OrgProfileShowcaseSectionProps } from "@/lib/interfaces/org-profile";
import { ORG_PROFILE_SHOWCASE_CARDS_MAX } from "@magic-vault/shared";
import { IconCards, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function OrgProfileShowcaseSection({
  control,
  disabled,
  cardsById,
  onCardsPicked,
}: OrgProfileShowcaseSectionProps) {
  const { t } = useTranslation("org-profile");
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <Controller
      control={control}
      name="showcaseScanIds"
      render={({ field }) => (
        <SettingsSection
          heading={t("showcase.heading")}
          description={t("showcase.description", {
            current: field.value.length,
            max: ORG_PROFILE_SHOWCASE_CARDS_MAX,
          })}
          action={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => setIsPickerOpen(true)}
            >
              <IconPlus />
              {t("showcase.add")}
            </Button>
          }
        >
          {field.value.length === 0 ? (
            <EmptyState size="compact" icon={IconCards} title={t("showcase.empty")} />
          ) : (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-2 lg:grid-cols-6">
              {field.value.map((scanId, index) => {
                const card = cardsById[scanId];
                const name = card?.name ?? t("showcase.unknownCard");
                return (
                  <li key={scanId} className="flex min-w-0 flex-col gap-1.5">
                    <span className="relative block aspect-[2.5/3.5] overflow-hidden rounded-lg">
                      <CardImage src={card?.imageUrl ?? undefined} alt={name} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-semibold">{name}</span>
                      {card?.setCode && (
                        <span className="truncate text-2xs uppercase text-foreground/70">
                          {card.setCode}
                        </span>
                      )}
                    </span>
                    <OrgProfileReorderButtons
                      itemLabel={name}
                      index={index}
                      count={field.value.length}
                      disabled={disabled}
                      onMove={(fromIndex, toIndex) =>
                        field.onChange(moveListItem(field.value, fromIndex, toIndex))
                      }
                      onRemove={() =>
                        field.onChange(field.value.filter((selected) => selected !== scanId))
                      }
                    />
                  </li>
                );
              })}
            </ol>
          )}
          <OrgProfileShowcasePicker
            open={isPickerOpen}
            onOpenChange={setIsPickerOpen}
            selectedScanIds={field.value}
            onDone={(scanIds, pickedCards) => {
              onCardsPicked(pickedCards);
              field.onChange(scanIds);
              setIsPickerOpen(false);
            }}
          />
        </SettingsSection>
      )}
    />
  );
}
