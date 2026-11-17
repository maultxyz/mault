import { zodResolver } from "@hookform/resolvers/zod";
import {
  normalizePickListEntries,
  orderDecklistSchema,
  parseDecklist,
  type OrderDecklistFormValues,
} from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { createOrder } from "@/features/business/api/business";
import { useTheme } from "@/hooks/use-theme";
import { BUSINESS_ORDERS_QUERY_KEY, ORDER_DECKLIST_DEFAULT_VALUES } from "@/lib/constants/business";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function NewPickScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const form = useForm<OrderDecklistFormValues>({
    resolver: zodResolver(orderDecklistSchema),
    defaultValues: ORDER_DECKLIST_DEFAULT_VALUES,
  });
  const create = useMutation({
    mutationFn: (values: OrderDecklistFormValues) =>
      createOrder({
        name: values.name.trim(),
        source: "generic",
        lines: normalizePickListEntries(parseDecklist(values.decklist)).map((entry) => ({
          name: entry.name,
          quantity: entry.quantity,
        })),
      }),
    onSuccess: ({ guid }) => {
      void queryClient.invalidateQueries({ queryKey: BUSINESS_ORDERS_QUERY_KEY });
      router.back();
      router.push({ pathname: "/business/order/[guid]", params: { guid } });
    },
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("business.picks.new")} subtitle={t("business.picks.newDescription")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("business.picks.create")}
            loading={create.isPending}
            onPress={form.handleSubmit((values) => create.mutate(values))}
          />
        }
      >
        {create.isError ? (
          <Callout
            tone="destructive"
            title={t("business.picks.createFailed")}
            description={create.error instanceof Error ? create.error.message : undefined}
          />
        ) : null}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t("business.picks.nameLabel")}
              placeholder={t("business.picks.namePlaceholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
            />
          )}
        />
        <Controller
          control={form.control}
          name="decklist"
          render={({ field, fieldState }) => (
            <TextField
              label={t("business.picks.cardsLabel")}
              placeholder={t("business.picks.cardsPlaceholder")}
              multiline
              autoCapitalize="none"
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
            />
          )}
        />
      </PinnedActionsLayout>
    </View>
  );
}
