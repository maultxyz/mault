import type {
  SaveBarGroupDraft,
  SaveBarGroupGuard,
  SaveBarGroupStore,
  SaveBarGroupSummary,
} from "@/lib/interfaces/save-bar";
import { createContext } from "react";

export const SaveBarGroupContext = createContext<SaveBarGroupStore | null>(
  null,
);

function summarize(
  drafts: Map<string, SaveBarGroupDraft>,
  guards: Map<string, SaveBarGroupGuard>,
): SaveBarGroupSummary {
  const dirtyDrafts = [...drafts.values()].filter((draft) => draft.isDirty);
  return {
    isDirty: dirtyDrafts.length > 0,
    isSaving: dirtyDrafts.some((draft) => draft.isSaving),
    isGuardDirty: [...guards.values()].some((guard) => guard.isDirty),
    saveButtonDataTour: dirtyDrafts.find((draft) => draft.saveButtonDataTour)
      ?.saveButtonDataTour,
  };
}

function isSameSummary(a: SaveBarGroupSummary, b: SaveBarGroupSummary) {
  return (
    a.isDirty === b.isDirty &&
    a.isSaving === b.isSaving &&
    a.isGuardDirty === b.isGuardDirty &&
    a.saveButtonDataTour === b.saveButtonDataTour
  );
}

export function createSaveBarGroupStore(): SaveBarGroupStore {
  const drafts = new Map<string, SaveBarGroupDraft>();
  const guards = new Map<string, SaveBarGroupGuard>();
  const listeners = new Set<() => void>();
  let summary = summarize(drafts, guards);

  const refresh = () => {
    const next = summarize(drafts, guards);
    if (isSameSummary(summary, next)) return;
    summary = next;
    for (const listener of listeners) listener();
  };

  return {
    setDraft: (draftId, draft) => {
      drafts.set(draftId, draft);
      refresh();
    },
    removeDraft: (draftId) => {
      drafts.delete(draftId);
      refresh();
    },
    setGuard: (guardId, guard) => {
      guards.set(guardId, guard);
      refresh();
    },
    removeGuard: (guardId) => {
      guards.delete(guardId);
      refresh();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSummary: () => summary,
    saveDirtyDrafts: () => {
      for (const draft of [...drafts.values()]) {
        if (draft.isDirty && !draft.isSaving) draft.save();
      }
    },
    discardDirtyDrafts: () => {
      for (const draft of [...drafts.values()]) {
        if (draft.isDirty) draft.discard();
      }
    },
    discardDirtyGuards: () => {
      for (const guard of [...guards.values()]) {
        if (guard.isDirty) guard.discard?.();
      }
    },
  };
}

export function submitFormById(formId: string) {
  const form = document.getElementById(formId);
  if (form instanceof HTMLFormElement) form.requestSubmit();
}
