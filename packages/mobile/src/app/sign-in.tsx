import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Screen } from "@/components/ui/screen";
import { SignInForm } from "@/features/account/components/sign-in-form";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session";
import { SIGN_IN_BRAND_ICON_SIZE, WEB_FORGOT_PASSWORD_PATH, WEB_SIGN_UP_PATH } from "@/lib/constants/auth";
import { WEB_URL } from "@/lib/constants/config";
import { SPACING } from "@/lib/constants/theme";

export default function SignInScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { signedOutReason } = useSession();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen edges={["top", "bottom"]}>
        <View style={{ gap: SPACING.sm, marginTop: SPACING.xxl, marginBottom: SPACING.lg }}>
          <View style={{ marginBottom: SPACING.sm }}>
            <BrandIcon size={SIGN_IN_BRAND_ICON_SIZE} color={colors.primaryText} />
          </View>
          <AppText size="3xl" heading weight="semibold" accessibilityRole="header">
            {t("app.name")}
          </AppText>
          <AppText tone="secondary">{t("auth.tagline")}</AppText>
        </View>
        {signedOutReason ? (
          <Callout
            tone="warning"
            title={t("auth.signedOut.title")}
            description={t(`auth.signedOut.${signedOutReason}`)}
          />
        ) : null}
        <SignInForm />
        <Button
          variant="ghost"
          label={t("auth.forgotPassword")}
          accessibilityHint={t("auth.opensInBrowser")}
          onPress={() => void Linking.openURL(`${WEB_URL}${WEB_FORGOT_PASSWORD_PATH}`)}
        />
        <Button
          variant="ghost"
          label={t("auth.createAccountOnWeb")}
          onPress={() => void Linking.openURL(`${WEB_URL}${WEB_SIGN_UP_PATH}`)}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
