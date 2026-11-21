import type { FieldType, Game } from "@magic-vault/shared";
import type { ADMIN_CARDS_TABS } from "@/lib/constants/admin-cards";

export type AdminCardsTab = (typeof ADMIN_CARDS_TABS)[number];

export interface AdminCatalogCard {
  id: number;
  cardId: string;
  gameKey: string;
  lang: string;
  name: string;
  setCode: string;
  updatedAt: string;
}

export interface AdminCatalogCardsPage {
  cards: AdminCatalogCard[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminSyncSource {
  gameKey: string;
  label: string;
  languages: string[];
}

export interface AdminCardGameCount {
  gameKey: string;
  count: number;
}

export interface AdminScanVectorizeStats {
  server: number;
  web: number;
}

export interface AdminMessageResult {
  success: boolean;
  message: string;
}

export interface StartCardSyncInput {
  gameKey: string;
  lang: string;
  forceResync: boolean;
  concurrency: number;
}

export interface SyncCardByIdInput {
  gameKey: string;
  cardId: string;
  lang: string;
}

export interface GameFieldDefinitionDraft {
  field: string;
  label: string;
  type: FieldType;
  path: string;
  optionsText: string;
  originalField?: string;
}

export interface GameEditorFormValues {
  key: string;
  name: string;
  apiDocsUrl: string;
  cardThicknessText: string;
  isActive: boolean;
  fieldDefinitions: GameFieldDefinitionDraft[];
}

export interface GamesEditorProps {
  game: Game | null;
}

export interface GamesFieldDefinitionCardProps {
  index: number;
  onRemove: () => void;
}

export interface CardsTypedConfirmPanelProps {
  title: string;
  description: string;
  expectedText: string;
  confirmLabel: string;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface CardsProgressBarProps {
  accessibilityLabel: string;
  done: number;
  total: number;
}

export interface CardSyncProgress {
  total: number;
  done: number;
  etaMs: number | null;
  isBrowserJob: boolean;
}

export interface CardsSyncSourceSelection {
  gameKey: string | null;
  lang: string;
}

export interface CardsSyncSourceFieldsProps {
  sources: AdminSyncSource[];
  selection: CardsSyncSourceSelection;
  onChange: (selection: CardsSyncSourceSelection) => void;
  disabled?: boolean;
}

export interface CardsSyncByIdPanelProps {
  sources: AdminSyncSource[];
}

export type GamesEditorExit = { kind: "replace"; gameGuid: string } | { kind: "back" };
