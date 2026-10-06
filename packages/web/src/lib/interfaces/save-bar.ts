export type SaveBarProps = {
  show: boolean;
  isSaving?: boolean;
  saveDisabled?: boolean;
  onDiscard: () => void;
  className?: string;
  saveButtonDataTour?: string;
} & (
  | {
      formId: string;
      onSave?: never;
    }
  | {
      formId?: never;
      onSave: () => void;
    }
);
