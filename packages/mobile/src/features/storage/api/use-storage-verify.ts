import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { EMPTY_STORED_STORAGE_VERIFY, STORAGE_VERIFY_CARDS_MAX, storageVerifyNameCounts } from "@magic-vault/shared";
import { useToast } from "@/components/ui/toast-provider";
import { storageVerifyCardsQueryOptions } from "@/features/storage/api/storage";
import { useStoredVerify } from "@/features/storage/lib/pick-list-store";
import { useActiveOrgId } from "@/hooks/use-org";
import { TOAST_UNDO_DURATION_MS } from "@/lib/constants/ui";
import type { StorageVerifyState } from "@/lib/interfaces/storage";

export function useStorageVerify(locationGuid: string | undefined): StorageVerifyState {
  const orgId = useActiveOrgId();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [stored, update] = useStoredVerify(orgId, locationGuid ?? "");
  const query = useQuery(storageVerifyCardsQueryOptions(locationGuid));
  const cards = useMemo(() => query.data ?? [], [query.data]);
  const verifiedScanIds = useMemo(() => new Set(stored.verifiedScanIds), [stored.verifiedScanIds]);
  const notInLocation = useMemo(
    () => storageVerifyNameCounts(stored.notInLocationCardNames),
    [stored.notInLocationCardNames],
  );

  const setVerified = useCallback(
    (scanId: string, verified: boolean) =>
      update((current) => ({
        ...current,
        verifiedScanIds: verified
          ? [...new Set([...current.verifiedScanIds, scanId])]
          : current.verifiedScanIds.filter((id) => id !== scanId),
      })),
    [update],
  );

  const addNotInLocation = useCallback(
    (cardName: string) =>
      update((current) => ({ ...current, notInLocationCardNames: [...current.notInLocationCardNames, cardName] })),
    [update],
  );

  return {
    cards,
    verifiedScanIds,
    verifiedCount: cards.filter((card) => verifiedScanIds.has(card.scanId)).length,
    notInLocation,
    isLoading: !!locationGuid && query.isPending,
    isError: query.isError,
    isTruncated: cards.length >= STORAGE_VERIFY_CARDS_MAX,
    setVerified,
    addNotInLocation,
    startOver: () => {
      const previous = stored;
      update(() => EMPTY_STORED_STORAGE_VERIFY);
      showToast({
        message: t("recovery.verifyProgressCleared"),
        durationMs: TOAST_UNDO_DURATION_MS,
        action: {
          label: t("recovery.undo"),
          onPress: () => {
            update(() => previous);
            AccessibilityInfo.announceForAccessibility(t("recovery.restored"));
          },
        },
      });
    },
    refetch: () => void query.refetch(),
  };
}
