import { getCardById, searchCards } from "@/features/cards/api/card-search";
import { useAddManualCard } from "@/features/cards/api/use-add-manual-card";
import {
  findDroppedDeckLink,
  isExternalCardDrag,
  parseExternalCardDrop,
} from "@/features/cards/lib/external-card-drop";
import type {
  ExternalCardReference,
  ExternalCardDropContext,
  UseExternalCardDropOptions,
} from "@/lib/interfaces/cards";
import { toast } from "@/lib/toast";
import type { PlayingCard } from "@magic-vault/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

async function resolveExternalCard(
  reference: ExternalCardReference,
  collectionGuid: string,
): Promise<PlayingCard | null> {
  if (reference.scryfallId) {
    const byId = await getCardById(reference.scryfallId, collectionGuid).catch(
      () => null,
    );
    if (byId?.success && byId.data) return byId.data;
  }
  const { name, setCode, collectorNumber } = reference;
  if (!name || !setCode || !collectorNumber) return null;
  const page = await searchCards(name, collectionGuid, 0, setCode).catch(
    () => null,
  );
  return (
    page?.data?.cards.find(
      (card) =>
        card.collectorNumber.toLowerCase() === collectorNumber.toLowerCase(),
    ) ?? null
  );
}

async function addDroppedCards(
  references: ExternalCardReference[],
  context: ExternalCardDropContext,
) {
  const { collectionGuid: targetGuid, t: translate } = context;
  if (!targetGuid) return;
  if (references.length === 0) {
    toast.error(translate("externalCardDrop.unrecognized"));
    return;
  }
  const findingToast = toast.loading(
    translate("externalCardDrop.finding", { count: references.length }),
  );
  const unresolved: ExternalCardReference[] = [];
  for (const reference of references) {
    const card = await resolveExternalCard(reference, targetGuid);
    if (card) {
      await context.addCard({ collectionGuid: targetGuid, card });
    } else {
      unresolved.push(reference);
    }
  }
  toast.dismiss(findingToast);
  if (unresolved.length === 0) return;
  const nameToSearch = unresolved.find((reference) => reference.name)?.name;
  if (nameToSearch) {
    context.onNeedsPrintingChoice(nameToSearch);
  } else {
    toast.error(translate("externalCardDrop.notFound"));
  }
}

export function useExternalCardDrop({
  collectionGuid,
  isEnabled,
  onNeedsPrintingChoice,
  onDeckLinkDrop,
}: UseExternalCardDropOptions) {
  const { t } = useTranslation("cards");
  const { addCard } = useAddManualCard();
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const dragDepthRef = useRef(0);
  const isInternalDragRef = useRef(false);
  const latestContext: ExternalCardDropContext = {
    collectionGuid,
    addCard,
    onNeedsPrintingChoice,
    onDeckLinkDrop,
    t,
  };
  const latestRef = useRef(latestContext);
  useEffect(() => {
    latestRef.current = latestContext;
  });

  useEffect(() => {
    if (!isEnabled) return;
    const acceptsDrag = (event: DragEvent) =>
      !isInternalDragRef.current &&
      !!event.dataTransfer &&
      isExternalCardDrag(Array.from(event.dataTransfer.types));
    const resetDrag = () => {
      dragDepthRef.current = 0;
      setIsDraggingCard(false);
    };
    const handleDragStart = () => {
      isInternalDragRef.current = true;
    };
    const handleDragEnd = () => {
      isInternalDragRef.current = false;
      resetDrag();
    };
    const handleDragEnter = (event: DragEvent) => {
      if (!acceptsDrag(event)) return;
      dragDepthRef.current += 1;
      setIsDraggingCard(true);
    };
    const handleDragLeave = (event: DragEvent) => {
      if (!acceptsDrag(event)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDraggingCard(false);
    };
    const handleDragOver = (event: DragEvent) => {
      if (!acceptsDrag(event) || event.defaultPrevented) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const handleDrop = (event: DragEvent) => {
      const accepted = acceptsDrag(event);
      resetDrag();
      if (!accepted || event.defaultPrevented || !event.dataTransfer) return;
      event.preventDefault();
      const dropData = {
        uriList: event.dataTransfer.getData("text/uri-list"),
        html: event.dataTransfer.getData("text/html"),
        plainText: event.dataTransfer.getData("text/plain"),
      };
      const deckLink = findDroppedDeckLink(dropData);
      if (deckLink) {
        latestRef.current.onDeckLinkDrop(deckLink);
        return;
      }
      void addDroppedCards(parseExternalCardDrop(dropData), latestRef.current);
    };
    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
      resetDrag();
    };
  }, [isEnabled]);

  return { isDraggingCard };
}
