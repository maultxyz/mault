import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import type { ScanDraftOptions } from "@/lib/interfaces/cards";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  scanDraftFormSchema,
  type ScanDraftFormValues,
} from "@magic-vault/shared";

export function useScanDraft({
  scanId,
  savedFoilType,
  savedCondition,
  setCardFoilType,
  setCardCondition,
}: ScanDraftOptions) {
  const values = useMemo<ScanDraftFormValues>(
    () => ({ foilType: savedFoilType, condition: savedCondition }),
    [savedFoilType, savedCondition],
  );
  const form = useForm<ScanDraftFormValues>({
    resolver: zodResolver(scanDraftFormSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const { isDirty, dirtyFields } = form.formState;
  const [afterCommit, setAfterCommit] = useState<(() => void) | null>(null);
  const draftScanIdRef = useRef(scanId);

  useEffect(() => {
    if (draftScanIdRef.current === scanId) return;
    draftScanIdRef.current = scanId;
    form.reset(values, DISCARD_RESET_OPTIONS);
  }, [form, scanId, values]);

  const commit = useCallback(
    () =>
      form.handleSubmit((draft) => {
        if (!scanId) return;
        if (dirtyFields.foilType) {
          setCardFoilType(scanId, draft.foilType);
        }
        if (dirtyFields.condition) {
          setCardCondition(scanId, draft.condition);
        }
        form.reset(draft);
      })(),
    [form, scanId, dirtyFields, setCardFoilType, setCardCondition],
  );

  const runAfterCommit = useCallback(
    (action: () => void) => {
      if (!form.formState.isDirty) {
        action();
        return;
      }
      void commit().then(() => setAfterCommit(() => action));
    },
    [form, commit],
  );

  useEffect(() => {
    if (!afterCommit || isDirty) return;
    setAfterCommit(null);
    afterCommit();
  }, [afterCommit, isDirty]);

  return {
    foilType: form.watch("foilType"),
    condition: form.watch("condition"),
    isDirty,
    isSaving: form.formState.isSubmitting,
    setFoilType: (foilType: string | null) =>
      form.setValue("foilType", foilType, { shouldDirty: true }),
    setCondition: (condition: ScanDraftFormValues["condition"]) =>
      form.setValue("condition", condition, { shouldDirty: true }),
    save: () => void commit(),
    discard: () => form.reset(values, DISCARD_RESET_OPTIONS),
    runAfterCommit,
  };
}
