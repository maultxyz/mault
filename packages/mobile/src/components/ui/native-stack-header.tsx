import { Stack, usePathname } from "expo-router";
import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { useTheme } from "@/hooks/use-theme";
import { createHeaderActionsStore } from "@/lib/header-actions-store";
import { MODAL_ROUTE_PATTERN } from "@/lib/constants/nav";
import type { HeaderActionsSlotProps, NativeStackHeaderProps } from "@/lib/interfaces/ui";

function HeaderActionsSlot({ store }: HeaderActionsSlotProps) {
  return useSyncExternalStore(store.subscribe, store.getActions);
}

export function NativeStackHeader({ title, onBack, actions }: NativeStackHeaderProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const isPresentedAsModal = MODAL_ROUTE_PATTERN.test(usePathname());
  const [actionsStore] = useState(createHeaderActionsStore);
  const latestOnBack = useRef(onBack);
  const hasActions = !!actions;
  const backLabel = t("common.back");
  const foregroundColor = colors.foreground;
  const backgroundColor = colors.background;

  useLayoutEffect(() => {
    latestOnBack.current = onBack;
    actionsStore.setActions(actions);
  });

  const options = useMemo(
    () => ({
      headerShown: true,
      title,
      headerBackButtonDisplayMode: "minimal" as const,
      headerShadowVisible: false,
      headerTintColor: foregroundColor,
      headerStyle: { backgroundColor },
      headerLeft: isPresentedAsModal
        ? () => (
            <IconButton
              icon="dismiss"
              variant="plain"
              accessibilityLabel={backLabel}
              onPress={() => latestOnBack.current()}
            />
          )
        : undefined,
      headerRight: hasActions ? () => <HeaderActionsSlot store={actionsStore} /> : undefined,
    }),
    [title, foregroundColor, backgroundColor, isPresentedAsModal, backLabel, hasActions, actionsStore],
  );

  return <Stack.Screen options={options} />;
}
