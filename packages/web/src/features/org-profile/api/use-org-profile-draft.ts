import { useOrg } from "@/features/companies/api/use-organization";
import {
  orgProfileKeys,
  orgProfileSettingsQueryOptions,
  saveOrgProfile,
} from "@/features/org-profile/api/org-profile";
import {
  orgProfileFormValues,
  showcaseCardsById,
} from "@/features/org-profile/lib/org-profile-form";
import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import type { OrgProfileShowcaseCardsById } from "@/lib/interfaces/org-profile";
import { toast } from "@/lib/toast";
import {
  orgProfileFormSchema,
  type OrgProfileFormValues,
  type OrgProfileInput,
  type OrgProfileSettings,
  type OrgProfileShowcaseCard,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function useOrgProfileDraft() {
  const { t } = useTranslation("org-profile");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id;
  const orgName = activeOrg?.name ?? "";
  const settingsQuery = useQuery(orgProfileSettingsQueryOptions(orgId));
  const settings = settingsQuery.data;
  const profile = settings?.profile ?? null;
  const [pickedCardsById, setPickedCardsById] = useState<OrgProfileShowcaseCardsById>({});
  const values = useMemo(() => orgProfileFormValues(profile, orgName), [profile, orgName]);
  const cardsById = useMemo(
    () => ({ ...pickedCardsById, ...showcaseCardsById(profile?.showcaseCards ?? []) }),
    [pickedCardsById, profile],
  );

  const form = useForm<OrgProfileFormValues, unknown, OrgProfileInput>({
    resolver: zodResolver(orgProfileFormSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const addPickedCards = useCallback((cards: OrgProfileShowcaseCard[]) => {
    if (cards.length === 0) return;
    setPickedCardsById((previous) => ({ ...previous, ...showcaseCardsById(cards) }));
  }, []);

  const save = async (input: OrgProfileInput) => {
    try {
      const result = await saveOrgProfile(input);
      if (!result.success || !result.data) {
        if (result.errorCode === "handleTaken") {
          form.setError("handle", { message: t("errors.handleTaken") }, { shouldFocus: true });
          return;
        }
        toast.error(
          result.errorCode === "forbidden"
            ? t("errors.forbidden")
            : result.errorCode === "sourcesInvalid"
              ? t("errors.sourcesInvalid")
              : t("errors.saveFailed"),
        );
        return;
      }
      const savedProfile = result.data;
      queryClient.setQueryData<OrgProfileSettings>(orgProfileKeys.settings(orgId), (previous) =>
        previous ? { ...previous, profile: savedProfile } : previous,
      );
      form.reset(orgProfileFormValues(savedProfile, orgName));
      toast.success(t("saved"));
    } catch {
      toast.error(t("errors.saveFailed"));
    }
  };

  return {
    form,
    control: form.control,
    settings,
    profile,
    cardsById,
    addPickedCards,
    canEdit: settings?.canEdit ?? false,
    isLoading: settingsQuery.isPending,
    isError: settingsQuery.isError,
    refetch: settingsQuery.refetch,
    isDirty: form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    save: () => void form.handleSubmit(save)(),
    discard: () => form.reset(values, DISCARD_RESET_OPTIONS),
  };
}
