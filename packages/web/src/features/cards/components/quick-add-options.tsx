import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CardSearchLanguageSelect } from "@/features/cards/components/card-search-language-select";
import { useCollections } from "@/features/collections/api/use-collections";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { QUICK_ADD_NO_LOCATION } from "@/lib/constants/cards";
import type { QuickAddOptionsProps } from "@/lib/interfaces/cards";
import { CARD_CONDITIONS, toCardCondition } from "@magic-vault/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function QuickAddOptions({
  collectionGuid,
  onCollectionChange,
  locationGuid,
  onLocationChange,
  showsLocations,
  condition,
  onConditionChange,
  isFoilByDefault,
  onFoilByDefaultChange,
  language,
  onLanguageChange,
}: QuickAddOptionsProps) {
  const { t } = useTranslation("cards");
  const { collections } = useCollections();
  const { locations } = useStorageLocations({ withList: showsLocations });
  const collectionSelectId = useId();
  const locationSelectId = useId();
  const conditionSelectId = useId();
  const foilSwitchId = useId();
  const locationName = (guid: string) =>
    guid === QUICK_ADD_NO_LOCATION
      ? t("quickAdd.noLocation")
      : (locations.find((location) => location.guid === guid)?.name ?? "");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <Label htmlFor={collectionSelectId}>{t("quickAdd.collection")}</Label>
        <Select
          value={collectionGuid ?? null}
          onValueChange={(value) => {
            if (value) onCollectionChange(value as string);
          }}
        >
          <SelectTrigger id={collectionSelectId} className="w-full">
            <SelectValue>
              {collections.find((c) => c.guid === collectionGuid)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {collections.map((collection) => (
              <SelectItem key={collection.guid} value={collection.guid}>
                {collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showsLocations && (
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor={locationSelectId}>{t("quickAdd.location")}</Label>
          <Select
            value={locationGuid}
            onValueChange={(value) => {
              if (value) onLocationChange(value as string);
            }}
          >
            <SelectTrigger id={locationSelectId} className="w-full">
              <SelectValue>{locationName(locationGuid)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={QUICK_ADD_NO_LOCATION}>
                {t("quickAdd.noLocation")}
              </SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.guid} value={location.guid}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={conditionSelectId}>{t("quickAdd.condition")}</Label>
        <Select
          value={condition}
          onValueChange={(value) => onConditionChange(toCardCondition(value))}
        >
          <SelectTrigger id={conditionSelectId} className="w-36">
            <SelectValue>{t(`condition.names.${condition}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CARD_CONDITIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`condition.names.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <span aria-hidden className="text-xs/relaxed leading-none font-medium">
          {t("language")}
        </span>
        <CardSearchLanguageSelect value={language} onChange={onLanguageChange} />
      </div>
      <div className="flex min-h-7 items-center gap-2">
        <Switch
          id={foilSwitchId}
          checked={isFoilByDefault}
          onCheckedChange={onFoilByDefaultChange}
        />
        <Label htmlFor={foilSwitchId}>{t("quickAdd.foil")}</Label>
      </div>
    </div>
  );
}
