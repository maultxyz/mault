import { router, useNavigation, usePreventRemove } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import type { LeaveGuard, LeaveGuardOptions } from "@/lib/interfaces/settings";

const goBack = () => router.back();

export function useLeaveGuard({ isGuarded, title, description, stayLabel, leaveLabel }: LeaveGuardOptions): LeaveGuard {
  const navigation = useNavigation();
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  usePreventRemove(isGuarded && !pendingLeave, ({ data }) => {
    Alert.alert(title, description, [
      { text: stayLabel, style: "cancel" },
      { text: leaveLabel, style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  useEffect(() => {
    pendingLeave?.();
  }, [pendingLeave]);
  const leaveWithoutGuard = useCallback((leave: () => void = goBack) => setPendingLeave(() => leave), []);
  return { leaveWithoutGuard };
}

export function useDiscardChangesGuard(hasUnsavedChanges: boolean): LeaveGuard {
  const { t } = useTranslation();
  return useLeaveGuard({
    isGuarded: hasUnsavedChanges,
    title: t("common.discardTitle"),
    description: t("settings.discardDescription"),
    stayLabel: t("common.keepEditing"),
    leaveLabel: t("common.discard"),
  });
}

export function useSecretRevealGuard(isSecretShown: boolean): LeaveGuard {
  const { t } = useTranslation();
  return useLeaveGuard({
    isGuarded: isSecretShown,
    title: t("settings.secretReveal.leaveTitle"),
    description: t("settings.secretReveal.leaveDescription"),
    stayLabel: t("settings.secretReveal.keepOpen"),
    leaveLabel: t("settings.secretReveal.close"),
  });
}
