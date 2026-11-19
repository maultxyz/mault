import {
  saveShareLinkLengths,
  shareLinkLengthsQueryOptions,
} from "@/features/admin/api/share-link-lengths";
import {
  shareLinkLengthsFromFormValues,
  shareLinkLengthsToFormValues,
} from "@/features/admin/lib/share-link-lengths-form";
import { billingKeys } from "@/features/billing/api/billing";
import { EMPTY_SHARE_LINK_LENGTHS_FORM } from "@/lib/constants/admin";
import { requestWithToasts } from "@/lib/request-with-toasts";
import {
  shareLinkLengthsFormSchema,
  type ShareLinkLengthsFormValues,
} from "@/schemas/share-link-lengths.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function useShareLinkLengthsDraft() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery(shareLinkLengthsQueryOptions);

  const form = useForm<ShareLinkLengthsFormValues>({
    resolver: zodResolver(shareLinkLengthsFormSchema),
    defaultValues: EMPTY_SHARE_LINK_LENGTHS_FORM,
    values: data ? shareLinkLengthsToFormValues(data.lengths) : undefined,
    resetOptions: { keepDirtyValues: true },
  });

  const save = (values: ShareLinkLengthsFormValues) =>
    requestWithToasts(
      () => saveShareLinkLengths(shareLinkLengthsFromFormValues(values)),
      {
        successMessage: t("shareLinkLengths.saved"),
        failureMessage: t("shareLinkLengths.saveFailed"),
        onSuccess: (saved) => {
          queryClient.setQueryData(shareLinkLengthsQueryOptions.queryKey, saved);
          form.reset(shareLinkLengthsToFormValues(saved.lengths));
          void queryClient.invalidateQueries({ queryKey: billingKeys.root() });
        },
      },
    );

  const restoreDefaults = () => {
    if (!data) return;
    form.reset(shareLinkLengthsToFormValues(data.defaults), {
      keepDefaultValues: true,
    });
  };

  return {
    form,
    isLoading: isPending && !isError,
    isError: isError && !data,
    refetch,
    save: form.handleSubmit(save),
    restoreDefaults,
  };
}
