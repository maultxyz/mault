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
import { InitialBadge } from "@/components/ui/initial-badge";
import { Surface } from "@/components/ui/surface";
import { useRole } from "@/hooks/use-role";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { usePendingSaves } from "@/features/scanner/api/use-pending-saves";
import { useLanguagePreference } from "@/hooks/use-language-preference";
import { useSwitchOrg } from "@/hooks/use-org";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { signOut, useSession } from "@/lib/auth/session";
import { API_BASE, AUTH_PROVIDER } from "@/lib/constants/config";
import { APP_LANGUAGES, LANGUAGE_NAMES } from "@/lib/constants/i18n";
import { PROFILE_INITIAL_BADGE_SIZE } from "@/lib/constants/account";
import { THEME_PREFERENCES } from "@/lib/constants/ui";
import type { LanguagePreference } from "@/lib/interfaces/i18n";
import type { ThemePreference } from "@/lib/interfaces/theme";
import { SPACING } from "@/lib/constants/theme";
import { getInitials } from "@/lib/initials";

export default function AccountScreen() {
  const { t } = useTranslation();
  const { isStaff } = useRole();
  const queryClient = useQueryClient();
  const { user, organizations, activeOrgId } = useSession();
  const { pendingCount } = usePendingSaves();
  const [themePreference, setThemePreference] = useThemePreference();
  const [languagePreference, setLanguagePreference] = useLanguagePreference();
  const [languageOpen, setLanguageOpen] = useState(false);

  const switchOrg = useSwitchOrg();

  return (
    <Screen header={<PageHeader title={t("tabs.more")} />}>
      <Surface>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
          <InitialBadge initials={getInitials(user?.name ?? user?.email)} tone="solid" size={PROFILE_INITIAL_BADGE_SIZE} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText size="lg" heading weight="bold" numberOfLines={1} accessibilityRole="header">
              {user?.name || user?.email}
            </AppText>
            {user?.name && user.email ? (
              <AppText size="sm" tone="secondary" numberOfLines={1}>
                {user.email}
              </AppText>
            ) : null}
          </View>
        </View>
      </Surface>
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
                  leading={<InitialBadge initials={org.name[0]?.toUpperCase() ?? ""} tone={active ? "solid" : "neutral"} />}
                />
              );
            })}
          </ListGroup>
        )}
      </View>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("tabs.sorter")} />
        <ListGroup>
          <ListRow icon="sorter" title={t("tabs.sorter")} onPress={() => router.push("/sorter")} />
          <ListRow icon="rules" title={t("rules.title")} onPress={() => router.push("/rules")} />
          <ListRow icon="stats" title={t("tabs.stats")} onPress={() => router.push("/stats")} />
        </ListGroup>
      </View>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("account.profile.title")} />
        <ListGroup>
          <ListRow
            icon="adjust"
            title={t("settings.title")}
            subtitle={t("settings.entrySubtitle")}
            onPress={() => router.push("/settings")}
          />
          <ListRow
            icon="account"
            title={t("account.settingsRow")}
            subtitle={AUTH_PROVIDER === "local" ? t("account.settingsRowSubtitleLocal") : t("account.settingsRowSubtitle")}
            onPress={() => router.push("/profile")}
          />
          <ListRow icon="health" title={t("health.title")} subtitle={t("health.subtitle")} onPress={() => router.push("/health")} />
          {isStaff ? (
            <ListRow icon="admin" title={t("admin.title")} subtitle={t("admin.entrySubtitle")} onPress={() => router.push("/admin")} />
          ) : null}
        </ListGroup>
      </View>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("account.appearance")} />
        <Surface>
          <SegmentedControl<ThemePreference>
            value={themePreference}
            onChange={setThemePreference}
            options={THEME_PREFERENCES.map((value) => ({ value, label: t(`account.themes.${value}`) }))}
          />
        </Surface>
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
