import { beforeEach, expect, it, vi } from "vitest";
import { pendingScanCardsStore } from "@/features/cards/lib/pending-scan-cards-store";
import { createPiScanPendingSaveObserver } from "./pi-scan-pending-save";
import type { PiScanPendingSave } from "@magic-vault/shared";

const pending: PiScanPendingSave = {
  orgId: "org-a",
  collectionGuid: "collection",
  scanId: "scan",
  status: "saving",
  updatedAt: 1,
  card: { id: "card", name: "Card", set: "set", collectorNumber: "1" },
};
beforeEach(() => {
  for (const card of pendingScanCardsStore.getSnapshot())
    pendingScanCardsStore.remove(card.scanId);
});
it("reconstructs a saving placeholder from the current host snapshot without images or diagnostics", () => {
  const observer = createPiScanPendingSaveObserver("org-a", vi.fn());
  observer.apply(pending);
  expect(pendingScanCardsStore.getSnapshot()).toMatchObject([
    {
      scanId: "scan",
      collectionGuid: "collection",
      status: "saving",
      card: { name: "Card", image: null },
    },
  ]);
  expect(pendingScanCardsStore.getSnapshot()[0].card).not.toHaveProperty("raw");
  observer.clear();
});
it("marks persisted cards saved and refreshes the collection once", () => {
  const refresh = vi.fn();
  const observer = createPiScanPendingSaveObserver("org-a", refresh);
  observer.apply(pending);
  observer.apply({ ...pending, status: "saved", updatedAt: 2 });
  observer.apply({ ...pending, status: "saved", updatedAt: 2 });
  expect(pendingScanCardsStore.getSnapshot()).toMatchObject([
    { status: "saved", savedAt: expect.any(Number) },
  ]);
  expect(refresh).toHaveBeenCalledExactlyOnceWith("collection");
  observer.clear();
});
it("a reconnect after persistence reconstructs saved state and refreshes the real cards", () => {
  const refresh = vi.fn();
  const observer = createPiScanPendingSaveObserver("org-a", refresh);
  observer.apply({ ...pending, status: "saved", updatedAt: 2 });
  expect(pendingScanCardsStore.getSnapshot()[0].status).toBe("saved");
  expect(refresh).toHaveBeenCalledExactlyOnceWith("collection");
  observer.clear();
});
it("failure clears the optimistic placeholder without pretending the durable save succeeded", () => {
  const refresh = vi.fn();
  const observer = createPiScanPendingSaveObserver("org-a", refresh);
  observer.apply(pending);
  observer.apply({ ...pending, status: "failed", updatedAt: 2 });
  expect(pendingScanCardsStore.getSnapshot()).toEqual([]);
  expect(refresh).not.toHaveBeenCalled();
});
it("keeps at most the current or last host card and preserves unrelated browser placeholders", () => {
  const observer = createPiScanPendingSaveObserver("org-a", vi.fn());
  observer.apply(pending);
  const browserCard = pendingScanCardsStore.getSnapshot()[0].card;
  pendingScanCardsStore.add({
    scanId: "browser",
    collectionGuid: "other",
    card: browserCard,
  });
  observer.apply({ ...pending, scanId: "next", updatedAt: 3 });
  expect(
    pendingScanCardsStore.getSnapshot().map((card) => card.scanId),
  ).toEqual(["next", "browser"]);
  observer.clear();
  expect(
    pendingScanCardsStore.getSnapshot().map((card) => card.scanId),
  ).toEqual(["browser"]);
});
it("organization changes and unmount cleanup cannot retain a saving ghost", () => {
  const old = createPiScanPendingSaveObserver("org-a", vi.fn());
  old.apply(pending);
  old.clear();
  const next = createPiScanPendingSaveObserver("org-b", vi.fn());
  next.apply(pending);
  expect(pendingScanCardsStore.getSnapshot()).toEqual([]);
  next.apply({ ...pending, orgId: "org-b", scanId: "new-org", updatedAt: 5 });
  next.apply(pending);
  expect(
    pendingScanCardsStore.getSnapshot().map((card) => card.scanId),
  ).toEqual(["new-org"]);
  next.clear();
  expect(pendingScanCardsStore.getSnapshot()).toEqual([]);
});
it("late poll snapshots cannot turn a saved card back into saving or replace a newer card", () => {
  const observer = createPiScanPendingSaveObserver("org-a", vi.fn());
  observer.apply({ ...pending, status: "saved", updatedAt: 2 });
  observer.apply(pending);
  expect(pendingScanCardsStore.getSnapshot()[0].status).toBe("saved");
  observer.apply({ ...pending, scanId: "next", updatedAt: 4 });
  observer.apply({ ...pending, status: "saved", updatedAt: 2 });
  expect(
    pendingScanCardsStore.getSnapshot().map((card) => card.scanId),
  ).toEqual(["next"]);
  observer.clear();
});
it("absent host snapshots such as sort-only scans do not create collection placeholders", () => {
  const observer = createPiScanPendingSaveObserver("org-a", vi.fn());
  observer.apply(undefined);
  observer.apply(null);
  expect(pendingScanCardsStore.getSnapshot()).toEqual([]);
});
