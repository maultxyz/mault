import { describe, expect, it, vi } from "vitest";
import { createSaveBarGroupStore, submitFormById } from "@/lib/save-bar-group";
import type { SaveBarGroupDraft } from "@/lib/interfaces/save-bar";

function draft(overrides: Partial<SaveBarGroupDraft> = {}): SaveBarGroupDraft {
  return {
    isDirty: false,
    isSaving: false,
    save: vi.fn(),
    discard: vi.fn(),
    ...overrides,
  };
}

describe("createSaveBarGroupStore", () => {
  it("is clean while no draft is dirty", () => {
    const store = createSaveBarGroupStore();
    store.setDraft("name", draft());
    expect(store.getSummary()).toEqual({
      isDirty: false,
      isSaving: false,
      isGuardDirty: false,
      saveButtonDataTour: undefined,
    });
  });

  it("saves and discards only the dirty drafts", () => {
    const store = createSaveBarGroupStore();
    const clean = draft();
    const dirty = draft({ isDirty: true });
    const alsoDirty = draft({ isDirty: true });
    store.setDraft("clean", clean);
    store.setDraft("dirty", dirty);
    store.setDraft("alsoDirty", alsoDirty);

    expect(store.getSummary().isDirty).toBe(true);

    store.saveDirtyDrafts();
    expect(clean.save).not.toHaveBeenCalled();
    expect(dirty.save).toHaveBeenCalledOnce();
    expect(alsoDirty.save).toHaveBeenCalledOnce();

    store.discardDirtyDrafts();
    expect(clean.discard).not.toHaveBeenCalled();
    expect(dirty.discard).toHaveBeenCalledOnce();
    expect(alsoDirty.discard).toHaveBeenCalledOnce();
  });

  it("stays dirty for a draft whose save failed", () => {
    const store = createSaveBarGroupStore();
    store.setDraft("saved", draft({ isDirty: true }));
    store.setDraft("failed", draft({ isDirty: true }));
    store.saveDirtyDrafts();
    store.setDraft("saved", draft({ isDirty: false }));

    expect(store.getSummary().isDirty).toBe(true);
    const retried = draft({ isDirty: true });
    store.setDraft("failed", retried);
    store.saveDirtyDrafts();
    expect(retried.save).toHaveBeenCalledOnce();
  });

  it("reports saving and skips a draft that is already saving", () => {
    const store = createSaveBarGroupStore();
    const saving = draft({ isDirty: true, isSaving: true });
    store.setDraft("saving", saving);
    expect(store.getSummary().isSaving).toBe(true);
    store.saveDirtyDrafts();
    expect(saving.save).not.toHaveBeenCalled();
  });

  it("uses the tour hook of the first dirty draft in mount order", () => {
    const store = createSaveBarGroupStore();
    store.setDraft("mode", draft({ isDirty: true }));
    store.setDraft("repack", draft({ saveButtonDataTour: "repack-save" }));
    store.setDraft(
      "bin",
      draft({ isDirty: true, saveButtonDataTour: "save-bin-config" }),
    );
    expect(store.getSummary().saveButtonDataTour).toBe("save-bin-config");

    store.setDraft(
      "repack",
      draft({ isDirty: true, saveButtonDataTour: "repack-save" }),
    );
    expect(store.getSummary().saveButtonDataTour).toBe("repack-save");
  });

  it("covers the union of guards and discards only dirty ones", () => {
    const store = createSaveBarGroupStore();
    const cleanDiscard = vi.fn();
    const dirtyDiscard = vi.fn();
    store.setGuard("clean", { isDirty: false, discard: cleanDiscard });
    expect(store.getSummary().isGuardDirty).toBe(false);
    store.setGuard("dirty", { isDirty: true, discard: dirtyDiscard });
    store.setGuard("noDiscard", { isDirty: true });
    expect(store.getSummary().isGuardDirty).toBe(true);

    store.discardDirtyGuards();
    expect(cleanDiscard).not.toHaveBeenCalled();
    expect(dirtyDiscard).toHaveBeenCalledOnce();

    store.removeGuard("dirty");
    store.removeGuard("noDiscard");
    expect(store.getSummary().isGuardDirty).toBe(false);
  });

  it("notifies subscribers only when the summary changes", () => {
    const store = createSaveBarGroupStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setDraft("name", draft());
    expect(listener).not.toHaveBeenCalled();
    store.setDraft("name", draft({ isDirty: true }));
    store.setDraft("name", draft({ isDirty: true }));
    expect(listener).toHaveBeenCalledOnce();
    store.removeDraft("name");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.setDraft("name", draft({ isDirty: true }));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("submitFormById", () => {
  it("submits the form through its own submit handler", () => {
    const form = document.createElement("form");
    form.id = "draft-form";
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("submit", onSubmit);
    document.body.append(form);
    submitFormById("draft-form");
    expect(onSubmit).toHaveBeenCalledOnce();
    form.remove();
  });
});
