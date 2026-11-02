import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { useSwitchOrg } from "@/hooks/use-org";
import { clearMemberSeatLock } from "@/lib/api/member-seat-lock";
import { signOut, useSession } from "@/lib/auth/session";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { MemberSeatLockedProps } from "@/lib/interfaces/api";

export function MemberSeatLocked({ lock }: MemberSeatLockedProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const switchOrg = useSwitchOrg();
  const { organizations } = useSession();
  const otherOrganizations = organizations.filter((org) => org.id !== lock.orgId);
  const lockedOrgName = organizations.find((org) => org.id === lock.orgId)?.name ?? "";

  const tryAgain = () => {
    clearMemberSeatLock(lock.orgId);
    void queryClient.invalidateQueries();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: SCREEN_GUTTER, gap: SPACING.xl }}>
      <EmptyState
        icon="account"
        title={t("settings.org.seatLocked.title", { name: lockedOrgName })}
        description={t("settings.org.seatLocked.description", { count: lock.limit })}
        action={<Button variant="secondary" icon="refresh" label={t("settings.org.seatLocked.tryAgain")} onPress={tryAgain} />}
      />
      {otherOrganizations.length > 0 ? (
        <View style={{ gap: SPACING.sm }}>
          <SectionHeader title={t("settings.org.seatLocked.switchHeading")} />
          <ListGroup>
            {otherOrganizations.map((org) => (
              <ListRow key={org.id} icon="account" title={org.name} onPress={() => switchOrg(org.id)} />
            ))}
          </ListGroup>
        </View>
      ) : null}
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
    </ScrollView>
  );
}
