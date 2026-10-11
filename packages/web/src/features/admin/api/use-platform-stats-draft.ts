import {
  platformStatsGuildQueryOptions,
  platformStatsQueryOptions,
  postPlatformStatsNow,
  savePlatformStatsSettings,
} from "@/features/admin/api/platform-stats";
import { EMPTY_PLATFORM_STATS_FORM } from "@/lib/constants/admin";
import { toast } from "@/lib/toast";
import {
  platformStatsSchema,
  type PlatformStatsFormValues,
} from "@/schemas/platform-stats.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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

  const guildId = useWatch({ control: form.control, name: "guildId" });
  const guildQuery = useQuery(platformStatsGuildQueryOptions(guildId));

  const save = async (values: PlatformStatsFormValues) => {
    try {
      const result = await savePlatformStatsSettings(values);
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("platformStats.saveFailed"));
        return;
      }
      queryClient.setQueryData(platformStatsQueryOptions.queryKey, result.data);
      form.reset(result.data.settings);
      toast.success(t("platformStats.saved"));
    } catch {
      toast.error(t("platformStats.saveFailed"));
    }
  };

  const postNow = async () => {
    setIsPosting(true);
    try {
      const result = await postPlatformStatsNow();
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("platformStats.postFailed"));
        return;
      }
      queryClient.setQueryData(platformStatsQueryOptions.queryKey, result.data);
      toast.success(t("platformStats.posted"));
    } catch {
      toast.error(t("platformStats.postFailed"));
    } finally {
      setIsPosting(false);
    }
  };

  return {
    form,
    data,
    guild: guildQuery.data ?? null,
    isGuildLoading: guildQuery.isFetching,
    isLoading: isPending,
    isPosting,
    save: form.handleSubmit(save),
    postNow,
  };
}
