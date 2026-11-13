import { Stack } from "expo-router";
import { useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/hooks/use-theme";
import { createHeaderActionsStore } from "@/lib/header-actions-store";
import { HeaderBarItemContext } from "@/lib/header-bar-item-context";
import type { HeaderActionsSlotProps, NativeStackHeaderProps } from "@/lib/interfaces/ui";

function HeaderActionsSlot({ store }: HeaderActionsSlotProps) {
  const actions = useSyncExternalStore(store.subscribe, store.getActions);
  return <HeaderBarItemContext.Provider value>{actions}</HeaderBarItemContext.Provider>;
}

export function NativeStackHeader({ title, actions }: NativeStackHeaderProps) {
  const colors = useTheme();
  const [actionsStore] = useState(createHeaderActionsStore);
  const hasActions = !!actions;
  const foregroundColor = colors.foreground;
  const backgroundColor = colors.background;

  useLayoutEffect(() => {
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
      headerRight: hasActions ? () => <HeaderActionsSlot store={actionsStore} /> : undefined,
    }),
    [title, foregroundColor, backgroundColor, hasActions, actionsStore],
  );

  return <Stack.Screen options={options} />;
}
