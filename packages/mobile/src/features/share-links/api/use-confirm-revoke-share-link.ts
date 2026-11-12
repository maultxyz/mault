import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

export function useConfirmRevokeShareLink(): (revoke: () => void) => void {
  const { t } = useTranslation();
  return (revoke) =>
    Alert.alert(t("shareLinks.revokeTitle"), t("shareLinks.revokeDescription"), [
      { text: t("shareLink.cancel"), style: "cancel" },
      { text: t("shareLinks.revoke"), style: "destructive", onPress: revoke },
    ]);
}
