import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { usePendingSaves } from "@/features/scanner/api/use-pending-saves";
import { useLanguagePreference } from "@/hooks/use-language-preference";
import { useSwitchOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { signOut, useSession } from "@/lib/auth/session";
import { API_BASE, AUTH_PROVIDER } from "@/lib/constants/config";
import { APP_LANGUAGES, LANGUAGE_NAMES } from "@/lib/constants/i18n";
import { ICON_BADGE_SIZE, THEME_PREFERENCES } from "@/lib/constants/ui";
import type { LanguagePreference } from "@/lib/interfaces/i18n";
import type { ThemePreference } from "@/lib/interfaces/theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { getInitials } from "@/lib/initials";

export default function AccountScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const { user, organizations, activeOrgId } = useSession();
  const { pendingCount } = usePendingSaves();
  const [themePreference, setThemePreference] = useThemePreference();
  const [languagePreference, setLanguagePreference] = useLanguagePreference();
  const [languageOpen, setLanguageOpen] = useState(false);

  const switchOrg = useSwitchOrg();

  return (
    <Screen header={<PageHeader title={t("tabs.account")} />}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: RADIUS.full,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppText size="lg" weight="bold" style={{ color: colors.primaryForeground }}>
            {getInitials(user?.name ?? user?.email)}
          </AppText>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText size="lg" heading weight="bold" numberOfLines={1}>
            {user?.name || user?.email}
          </AppText>
          {user?.name && user.email ? (
            <AppText size="sm" tone="secondary" numberOfLines={1}>
              {user.email}
            </AppText>
          ) : null}
        </View>
      </View>
      {pendingCount > 0 ? (
        <Callout
          tone="info"
          title={t("account.pendingSaves.title", { count: pendingCount })}
          description={t("account.pendingSaves.description")}
        />
      ) : null}
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("account.organizations")} />
        {organizations.length === 0 ? (
          <Callout tone="warning" title={t("account.noOrganizations")} />
        ) : (
          <ListGroup>
            {organizations.map((org) => {
              const active = org.id === activeOrgId;
              return (
                <ListRow
                  key={org.id}
                  title={org.name}
                  subtitle={t(`account.roles.${org.role}`, { defaultValue: org.role })}
                  selected={active}
                  onPress={() => switchOrg(org.id)}
                  leading={
                    <View
                      style={{
                        width: ICON_BADGE_SIZE,
                        height: ICON_BADGE_SIZE,
                        borderRadius: RADIUS.md,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: active ? colors.primary : colors.muted,
                      }}
                    >
                      <AppText
                        size="sm"
                        weight="bold"
                        style={{ color: active ? colors.primaryForeground : colors.foreground }}
                      >
                        {org.name[0]?.toUpperCase()}
                      </AppText>
                    </View>
                  }
                />
              );
            })}
          </ListGroup>
        )}
      </View>
      <ListGroup>
        <ListRow
          icon="adjust"
          title={t("settings.title")}
          subtitle={t("settings.entrySubtitle")}
          onPress={() => router.push("/settings")}
        />
        <ListRow icon="stats" title={t("tabs.stats")} onPress={() => router.push("/stats")} />
        <ListRow
          icon="account"
          title={t("account.settingsRow")}
          subtitle={AUTH_PROVIDER === "local" ? t("account.settingsRowSubtitleLocal") : t("account.settingsRowSubtitle")}
          onPress={() => router.push("/profile")}
        />
        <ListRow icon="health" title={t("health.title")} subtitle={t("health.subtitle")} onPress={() => router.push("/health")} />
      </ListGroup>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("account.appearance")} />
        <SegmentedControl<ThemePreference>
          value={themePreference}
          onChange={setThemePreference}
          options={THEME_PREFERENCES.map((value) => ({ value, label: t(`account.themes.${value}`) }))}
        />
        <ListGroup>
          <ListRow
            icon="language"
            title={t("account.language")}
            value={languagePreference === "system" ? t("account.languageSystem") : LANGUAGE_NAMES[languagePreference]}
            onPress={() => setLanguageOpen(true)}
          />
        </ListGroup>
      </View>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("account.about")} />
        <ListGroup>
          <ListRow title={t("account.server")} value={API_BASE.replace(/^https?:\/\//, "")} />
          <ListRow title={t("account.version")} value={Constants.expoConfig?.version ?? ""} />
        </ListGroup>
      </View>
      <ListGroup>
        <ListRow
          icon="logout"
          tone="destructive"
          title={t("account.signOut")}
          onPress={() => {
            queryClient.clear();
            void signOut();
          }}
        />
      </ListGroup>
      <OptionSheet
        visible={languageOpen}
        title={t("account.language")}
        options={[
          { value: "system", label: t("account.languageSystem") },
          ...APP_LANGUAGES.map((lang) => ({ value: lang, label: LANGUAGE_NAMES[lang] })),
        ]}
        selected={[languagePreference]}
        onSelect={(value) => {
          setLanguageOpen(false);
          setLanguagePreference(value as LanguagePreference);
        }}
        onClose={() => setLanguageOpen(false)}
      />
    </Screen>
  );
}
