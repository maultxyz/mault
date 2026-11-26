import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ORG_PROFILE_SHOWCASE_CARDS_MAX } from "@magic-vault/shared";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { AppText } from "@/components/ui/app-text";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ReorderButtons } from "@/features/org-profile/components/reorder-buttons";
import { moveListItem } from "@/features/org-profile/lib/move-list-item";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { ORG_PROFILE_SHOWCASE_THUMBNAIL_WIDTH } from "@/lib/constants/org-profile";
import type { OrgProfileShowcaseSectionProps } from "@/lib/interfaces/org-profile";

export function OrgProfileShowcaseSection({ control, disabled, cardsById, onAddCards }: OrgProfileShowcaseSectionProps) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="showcaseScanIds"
      render={({ field }) => (
        <SettingsSection
          title={t("settings.orgProfile.showcase.heading")}
          description={t("settings.orgProfile.showcase.description", { max: ORG_PROFILE_SHOWCASE_CARDS_MAX })}
          badge={t("settings.orgProfile.showcase.count", { selected: field.value.length, max: ORG_PROFILE_SHOWCASE_CARDS_MAX })}
        >
          {field.value.length === 0 ? (
            <AppText size="xs" tone="secondary">
              {t("settings.orgProfile.showcase.empty")}
            </AppText>
          ) : (
            <ListGroup>
              {field.value.map((scanId, index) => {
                const card = cardsById[scanId];
                const name = card?.name ?? t("settings.orgProfile.showcase.unknownCard");
                return (
                  <ListRow
                    key={scanId}
                    title={name}
                    subtitle={card?.setCode?.toUpperCase() ?? undefined}
                    leading={
                      <CardThumbnail imageUrl={card?.imageUrl ?? null} width={ORG_PROFILE_SHOWCASE_THUMBNAIL_WIDTH} />
                    }
                    rightIsInteractive
                    right={
                      <ReorderButtons
                        itemLabel={name}
                        isFirst={index === 0}
                        isLast={index === field.value.length - 1}
                        disabled={disabled}
                        onMoveUp={() => field.onChange(moveListItem(field.value, index, index - 1))}
                        onMoveDown={() => field.onChange(moveListItem(field.value, index, index + 1))}
                        onRemove={() => field.onChange(field.value.filter((candidate) => candidate !== scanId))}
                      />
                    }
                  />
                );
              })}
            </ListGroup>
          )}
          {!disabled ? (
            <ListGroup>
              <ListRow icon="plus" title={t("settings.orgProfile.showcase.add")} onPress={onAddCards} />
            </ListGroup>
          ) : null}
        </SettingsSection>
      )}
    />
  );
}
