import type {
  OrgProfileFormValues,
  OrgProfileInput,
  OrgProfileShopCatalogChoice,
  OrgProfileShowcaseCard,
  PublicOrgProfileInfo,
  PublicOrgProfileShopCatalog,
} from "@magic-vault/shared";
import type { Control, UseFormReturn } from "react-hook-form";
import type { PublicCardsSource } from "@/lib/interfaces/public-cards";

export type OrgProfileShowcaseCardsById = Record<string, OrgProfileShowcaseCard>;

export interface OrgProfileDraftForm {
  form: UseFormReturn<OrgProfileFormValues, unknown, OrgProfileInput>;
  control: Control<OrgProfileFormValues, unknown, OrgProfileInput>;
}

export interface OrgProfileEditorSectionProps extends OrgProfileDraftForm {
  disabled: boolean;
}

export interface OrgProfileSwitchSectionProps extends Omit<OrgProfileEditorSectionProps, "form"> {
  name: "isPublished" | "showsPrices";
  heading: string;
  label: string;
  description: string;
}

export interface OrgProfileLinkSectionProps extends OrgProfileEditorSectionProps {
  savedHandle: string | null;
  isSavedPublished: boolean;
  shortUrl: string | null;
}

export interface OrgProfileShopCatalogsSectionProps extends OrgProfileEditorSectionProps {
  choices: OrgProfileShopCatalogChoice[];
}

export interface OrgProfileShowcaseSectionProps extends OrgProfileEditorSectionProps {
  cardsById: OrgProfileShowcaseCardsById;
  onCardsPicked: (cards: OrgProfileShowcaseCard[]) => void;
}

export interface OrgProfileShowcasePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedScanIds: string[];
  onDone: (scanIds: string[], pickedCards: OrgProfileShowcaseCard[]) => void;
}

export type OrgProfileShowcasePickerBodyProps = Pick<
  OrgProfileShowcasePickerProps,
  "selectedScanIds" | "onDone"
>;

export interface OrgProfileReorderButtonsProps {
  itemLabel: string;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: () => void;
}

export interface PublicOrgProfileShopCatalogsProps {
  catalogs: PublicOrgProfileShopCatalog[];
}

export interface PublicOrgProfileViewProps {
  source: PublicCardsSource;
  info: PublicOrgProfileInfo;
}

export interface OrgProfilePageContentProps {
  handle: string;
}
