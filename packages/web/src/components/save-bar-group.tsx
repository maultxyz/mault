import { SaveBarView } from "@/components/save-bar";
import { UnsavedChangesGuardView } from "@/components/unsaved-changes-guard";
import {
  createSaveBarGroupStore,
  SaveBarGroupContext,
} from "@/lib/save-bar-group";
import { useState, useSyncExternalStore, type ReactNode } from "react";

export function SaveBarGroup({ children }: { children: ReactNode }) {
  const [store] = useState(createSaveBarGroupStore);
  const summary = useSyncExternalStore(store.subscribe, store.getSummary);

  return (
    <SaveBarGroupContext.Provider value={store}>
      {children}
      <SaveBarView
        show={summary.isDirty}
        isSaving={summary.isSaving}
        onSave={store.saveDirtyDrafts}
        onDiscard={store.discardDirtyDrafts}
        saveButtonDataTour={summary.saveButtonDataTour}
      />
      <UnsavedChangesGuardView
        isDirty={summary.isGuardDirty}
        onDiscard={store.discardDirtyGuards}
      />
    </SaveBarGroupContext.Provider>
  );
}
