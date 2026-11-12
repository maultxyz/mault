import { useLocalSearchParams } from "expo-router";
import { type ComponentRef, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { ExistingShareLink } from "@/features/share-links/components/existing-share-link";
import { NewShareLinkForm } from "@/features/share-links/components/new-share-link-form";
import { SubjectShareLinks } from "@/features/share-links/components/subject-share-links";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { ShareLinkKind, ShareLinkSheetView } from "@/lib/interfaces/share-links";

export default function ShareLinkScreen() {
  const { kind, guid } = useLocalSearchParams<{ kind: ShareLinkKind; guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [view, setView] = useState<ShareLinkSheetView>({ name: "links" });
  const [createdWithoutLink, setCreatedWithoutLink] = useState(false);
  const isStorage = kind === "storage";

  const show = (next: ShareLinkSheetView, announcement: string) => {
    setView(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    AccessibilityInfo.announceForAccessibility(announcement);
  };
  const showLinks = () => show({ name: "links" }, t("shareLinks.viewAnnouncements.links"));

  const header =
    view.name === "link"
      ? { title: t("shareLinks.linkTitle"), subtitle: t("shareLinks.detailDescription") }
      : view.name === "new"
        ? { title: t("shareLinks.newLinkTitle"), subtitle: isStorage ? t("shareLink.storageDescription") : t("shareLink.collectionDescription") }
        : { title: isStorage ? t("shareLink.storageTitle") : t("shareLink.collectionTitle"), subtitle: t("shareLinks.subjectDescription") };

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}
      >
        <PageHeader title={header.title} subtitle={header.subtitle} />
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, gap: SPACING.xl }}>
          {view.name === "link" ? (
            <ExistingShareLink
              linkGuid={view.linkGuid}
              subjectGuid={guid}
              onClose={showLinks}
            />
          ) : view.name === "new" ? (
            <NewShareLinkForm
              kind={kind}
              subjectGuid={guid}
              onBack={showLinks}
              onCreated={(createdLinkGuid) => {
                if (createdLinkGuid) {
                  show({ name: "link", linkGuid: createdLinkGuid }, t("shareLink.created"));
                } else {
                  setCreatedWithoutLink(true);
                  showLinks();
                }
              }}
            />
          ) : (
            <>
              {createdWithoutLink ? <Callout tone="success" title={t("shareLinks.createdInList")} /> : null}
              <SubjectShareLinks
                kind={kind}
                subjectGuid={guid}
                onSelect={(selectedLinkGuid) =>
                  show({ name: "link", linkGuid: selectedLinkGuid }, t("shareLinks.viewAnnouncements.link"))
                }
                onNew={() => {
                  setCreatedWithoutLink(false);
                  show({ name: "new" }, t("shareLinks.viewAnnouncements.new"));
                }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
