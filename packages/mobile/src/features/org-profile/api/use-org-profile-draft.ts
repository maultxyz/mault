import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import {
  DEFAULT_ORG_PROFILE_SHOWS_PRICES,
  ORG_PROFILE_DISPLAY_NAME_MAX_LENGTH,
  orgProfileFormSchema,
  suggestOrgProfileHandle,
  type OrgProfile,
  type OrgProfileFormValues,
  type OrgProfileInput,
  type OrgProfileSettings,
} from "@magic-vault/shared";
import { useToast } from "@/components/ui/toast-provider";
import { orgProfileQueryOptions, saveOrgProfile } from "@/features/org-profile/api/org-profile";
import { readShowcasePick, startShowcasePick, subscribeToShowcasePick } from "@/features/org-profile/lib/showcase-pick";
import { useActiveOrg } from "@/hooks/use-org";
import { ORG_PROFILE_SHOWCASE_PICKER_PATH } from "@/lib/constants/org-profile";
import type { OrgProfileDraft, OrgProfileShowcaseCardsById } from "@/lib/interfaces/org-profile";

function toFormValues(profile: OrgProfile | null, orgName: string): OrgProfileFormValues {
  if (!profile) {
    return {
      handle: suggestOrgProfileHandle(orgName),
      displayName: orgName.trim().slice(0, ORG_PROFILE_DISPLAY_NAME_MAX_LENGTH),
      bio: "",
      links: [],
      showcaseScanIds: [],
      shopCatalogGuids: [],
      showsPrices: DEFAULT_ORG_PROFILE_SHOWS_PRICES,
      isPublished: false,
    };
  }
  return {
    handle: profile.handle,
    displayName: profile.displayName,
    bio: profile.bio,
    links: profile.links,
    showcaseScanIds: profile.showcaseCards.map((card) => card.scanId),
    shopCatalogGuids: profile.shopCatalogGuids,
    showsPrices: profile.showsPrices,
    isPublished: profile.isPublished,
  };
}

function showcaseCardsOf(profile: OrgProfile | null | undefined): OrgProfileShowcaseCardsById {
  return Object.fromEntries((profile?.showcaseCards ?? []).map((card) => [card.scanId, card]));
}

export function useOrgProfileDraft(): OrgProfileDraft {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgName = org?.name ?? "";
  const options = orgProfileQueryOptions(org?.id ?? null);
  const { data, isError, isFetching, refetch } = useQuery(options);
  const isLoadError = isError && !data;
  const values = useMemo(() => toFormValues(data?.profile ?? null, orgName), [data, orgName]);
  const [pickedCardsById, setPickedCardsById] = useState<OrgProfileShowcaseCardsById>({});
  const [saveError, setSaveError] = useState(false);
  const form = useForm<OrgProfileFormValues, unknown, OrgProfileInput>({
    resolver: zodResolver(orgProfileFormSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const showcaseCardsById = useMemo(
    () => ({ ...pickedCardsById, ...showcaseCardsOf(data?.profile) }),
    [pickedCardsById, data],
  );

  useEffect(
    () =>
      subscribeToShowcasePick(() => {
        const pick = readShowcasePick();
        setPickedCardsById((current) => ({ ...current, ...pick.cardsById }));
        form.setValue("showcaseScanIds", pick.scanIds, { shouldDirty: true });
      }),
    [form],
  );

  const submit = async (input: OrgProfileInput) => {
    setSaveError(false);
    try {
      const result = await saveOrgProfile(input);
      if (!result.success || !result.data) {
        if (result.errorCode === "handleTaken") {
          form.setError("handle", { type: "server", message: t("settings.orgProfile.handleTaken") });
          return;
        }
        showToast({
          tone: "destructive",
          message: t(`settings.orgProfile.saveErrors.${result.errorCode ?? "invalid"}`),
        });
        return;
      }
      const saved = result.data;
      queryClient.setQueryData(options.queryKey, (current: OrgProfileSettings | undefined) =>
        current ? { ...current, profile: saved } : current,
      );
      form.reset(toFormValues(saved, orgName));
      AccessibilityInfo.announceForAccessibility(t("common.changesSaved"));
    } catch {
      setSaveError(true);
    }
  };

  return {
    control: form.control,
    settings: data ?? null,
    savedProfile: data?.profile ?? null,
    canEdit: !!data?.canEdit,
    showcaseCardsById,
    openShowcasePicker: () => {
      startShowcasePick(form.getValues("showcaseScanIds"), showcaseCardsById);
      router.push(ORG_PROFILE_SHOWCASE_PICKER_PATH);
    },
    isLoading: !data && !isLoadError,
    isLoadError,
    isRetryingLoad: isLoadError && isFetching,
    retryLoad: () => void refetch(),
    refresh: () => queryClient.invalidateQueries({ queryKey: options.queryKey }),
    isDirty: !!data && form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    saveError,
    save: () => {
      if (data?.canEdit) void form.handleSubmit(submit)();
    },
    discard: () => form.reset(values),
  };
}
