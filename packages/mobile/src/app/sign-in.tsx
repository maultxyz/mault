import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { SignInForm } from "@/features/account/components/sign-in-form";
import { WEB_SIGN_UP_PATH } from "@/lib/constants/auth";
import { WEB_URL } from "@/lib/constants/config";
import { SPACING } from "@/lib/constants/theme";

export default function SignInScreen() {
  const { t } = useTranslation();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top", "bottom"]}>
        <View style={{ gap: SPACING.sm, marginTop: SPACING.xxl, marginBottom: SPACING.lg }}>
          <AppText size="3xl" heading weight="semibold">
            {t("app.name")}
          </AppText>
          <AppText tone="secondary">{t("auth.tagline")}</AppText>
        </View>
        <SignInForm />
        <Button
          variant="ghost"
          label={t("auth.createAccountOnWeb")}
          onPress={() => void Linking.openURL(`${WEB_URL}${WEB_SIGN_UP_PATH}`)}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
