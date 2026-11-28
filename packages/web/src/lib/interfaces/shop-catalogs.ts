import type { ShopCatalog, ShopCatalogInput } from "@magic-vault/shared";

export interface ShopCatalogEditorFormProps {
  catalog: ShopCatalog | null;
  isSaving: boolean;
  onSubmit: (input: ShopCatalogInput, onSaved: (savedGuid: string) => void) => void;
}

export interface ShopCatalogLinkDialogProps {
  catalog: ShopCatalog | null;
  onOpenChange: (open: boolean) => void;
  isResetting: boolean;
  onResetLink: (catalog: ShopCatalog) => void;
}

export interface ShopCatalogSourceChecklistProps {
  idPrefix: string;
  label: string;
  options: { guid: string; name: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}

export interface ShopPhotoSettingsProps {
  photoUrl: string | null;
  canEdit: boolean;
  isUploading: boolean;
  isRemoving: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}
