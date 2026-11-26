import type { Control } from "react-hook-form";
import type {
  OrgProfile,
  OrgProfileFormValues,
  OrgProfileInput,
  OrgProfileSettings,
  OrgProfileShowcaseCard,
} from "@magic-vault/shared";

export type OrgProfileShowcaseCardsById = Record<string, OrgProfileShowcaseCard>;

export interface OrgProfileDraft {
  control: Control<OrgProfileFormValues, unknown, OrgProfileInput>;
  settings: OrgProfileSettings | null;
  savedProfile: OrgProfile | null;
  canEdit: boolean;
  showcaseCardsById: OrgProfileShowcaseCardsById;
  openShowcasePicker: () => void;
  isLoading: boolean;
  isLoadError: boolean;
  isRetryingLoad: boolean;
  retryLoad: () => void;
  refresh: () => Promise<unknown>;
  isDirty: boolean;
  isSaving: boolean;
  saveError: boolean;
  save: () => void;
  discard: () => void;
}

export interface ShowcasePick {
  scanIds: string[];
  cardsById: OrgProfileShowcaseCardsById;
}

export interface OrgProfileSectionProps {
  control: Control<OrgProfileFormValues, unknown, OrgProfileInput>;
  disabled: boolean;
}

export interface OrgProfileLinkSectionProps extends OrgProfileSectionProps {
  savedProfile: OrgProfile | null;
}

export interface OrgProfileShopCatalogsSectionProps extends OrgProfileSectionProps {
  choices: OrgProfileSettings["shopCatalogChoices"];
}

export interface OrgProfileShowcaseSectionProps extends OrgProfileSectionProps {
  cardsById: OrgProfileShowcaseCardsById;
  onAddCards: () => void;
}

export interface ReorderButtonsProps {
  itemLabel: string;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}
