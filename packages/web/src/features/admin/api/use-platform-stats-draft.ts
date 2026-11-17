import {
  platformStatsQueryOptions,
  postPlatformStatsNow,
  savePlatformStatsSettings,
} from "@/features/admin/api/platform-stats";
import { EMPTY_PLATFORM_STATS_FORM } from "@/lib/constants/admin";
import { requestWithToasts } from "@/lib/request-with-toasts";
import {
  platformStatsSchema,
  type PlatformStatsFormValues,
} from "@/schemas/platform-stats.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function usePlatformStatsDraft() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(platformStatsQueryOptions);
  const [isPosting, setIsPosting] = useState(false);

  const form = useForm<PlatformStatsFormValues>({
    resolver: zodResolver(platformStatsSchema),
    defaultValues: EMPTY_PLATFORM_STATS_FORM,
    values: data?.settings,
    resetOptions: { keepDirtyValues: true },
  });

  const save = (values: PlatformStatsFormValues) =>
    requestWithToasts(() => savePlatformStatsSettings(values), {
      successMessage: t("platformStats.saved"),
      failureMessage: t("platformStats.saveFailed"),
      onSuccess: (saved) => {
        queryClient.setQueryData(platformStatsQueryOptions.queryKey, saved);
        form.reset(saved.settings);
      },
    });

  const postNow = async () => {
    setIsPosting(true);
    await requestWithToasts(postPlatformStatsNow, {
      successMessage: t("platformStats.posted"),
      failureMessage: t("platformStats.postFailed"),
      onSuccess: (posted) =>
        queryClient.setQueryData(platformStatsQueryOptions.queryKey, posted),
    });
    setIsPosting(false);
  };

  return {
    form,
    data,
    isLoading: isPending,
    isPosting,
    save: form.handleSubmit(save),
    postNow,
  };
}
