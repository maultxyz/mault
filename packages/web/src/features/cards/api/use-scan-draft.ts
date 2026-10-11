import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import type { ScanDraftOptions } from "@/lib/interfaces/cards";
import {
  scanDraftSchema,
  type ScanDraftValues,
} from "@/schemas/scan-draft.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

export function useScanDraft({
  scanId,
  savedFoilType,
  savedCondition,
  setCardFoilType,
  setCardCondition,
}: ScanDraftOptions) {
  const values = useMemo<ScanDraftValues>(
    () => ({ foilType: savedFoilType, condition: savedCondition }),
    [savedFoilType, savedCondition],
  );
  const form = useForm<ScanDraftValues>({
    resolver: zodResolver(scanDraftSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const isDirty = form.formState.isDirty;
  const [afterCommit, setAfterCommit] = useState<(() => void) | null>(null);

  const commit = useCallback(
    () =>
      form.handleSubmit((draft) => {
        if (!scanId) return;
        if (draft.foilType !== values.foilType) {
          setCardFoilType(scanId, draft.foilType);
        }
        if (draft.condition !== values.condition) {
          setCardCondition(scanId, draft.condition);
        }
        form.reset(draft);
      })(),
    [form, scanId, values, setCardFoilType, setCardCondition],
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
    setCondition: (condition: ScanDraftValues["condition"]) =>
      form.setValue("condition", condition, { shouldDirty: true }),
    save: () => void commit(),
    discard: () => form.reset(values, DISCARD_RESET_OPTIONS),
    runAfterCommit,
  };
}
