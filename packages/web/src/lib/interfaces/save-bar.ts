export type SaveBarProps = {
  show: boolean;
  isSaving?: boolean;
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

export interface SaveBarGroupDraft {
  isDirty: boolean;
  isSaving: boolean;
  save: () => void;
  discard: () => void;
  saveButtonDataTour?: string;
}

export interface SaveBarGroupGuard {
  isDirty: boolean;
  discard?: () => void;
}

export interface SaveBarGroupSummary {
  isDirty: boolean;
  isSaving: boolean;
  isGuardDirty: boolean;
  saveButtonDataTour: string | undefined;
}

export interface SaveBarGroupStore {
  setDraft: (draftId: string, draft: SaveBarGroupDraft) => void;
  removeDraft: (draftId: string) => void;
  setGuard: (guardId: string, guard: SaveBarGroupGuard) => void;
  removeGuard: (guardId: string) => void;
  subscribe: (listener: () => void) => () => void;
  getSummary: () => SaveBarGroupSummary;
  saveDirtyDrafts: () => void;
  discardDirtyDrafts: () => void;
  discardDirtyGuards: () => void;
}

export type SaveBarGroupMemberProps = SaveBarProps & {
  group: SaveBarGroupStore;
};

export interface UnsavedChangesGuardGroupMemberProps
  extends UnsavedChangesGuardProps {
  group: SaveBarGroupStore;
}

export interface UnsavedChangesGuardProps {
  isDirty: boolean;
  onDiscard?: () => void;
}
