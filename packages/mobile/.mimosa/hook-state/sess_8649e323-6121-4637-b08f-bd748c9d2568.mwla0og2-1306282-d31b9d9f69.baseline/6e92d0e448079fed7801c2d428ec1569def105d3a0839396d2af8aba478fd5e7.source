import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { PageHeader } from "@/components/ui/page-header";
import { ExistingShareLink } from "@/features/share-links/components/existing-share-link";
import { NewShareLinkForm } from "@/features/share-links/components/new-share-link-form";
import { SubjectShareLinks } from "@/features/share-links/components/subject-share-links";
import { useTheme } from "@/hooks/use-theme";
import type { ShareLinkKind, ShareLinkSheetView } from "@/lib/interfaces/share-links";

export default function ShareLinkScreen() {
  const { kind, guid } = useLocalSearchParams<{ kind: ShareLinkKind; guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const [view, setView] = useState<ShareLinkSheetView>({ name: "links" });
  const [createdWithoutLink, setCreatedWithoutLink] = useState(false);
  const isStorage = kind === "storage";

  const show = (next: ShareLinkSheetView, announcement: string) => {
    setView(next);
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
      <PageHeader title={header.title} subtitle={header.subtitle} />
      {view.name === "link" ? (
        <ExistingShareLink linkGuid={view.linkGuid} subjectGuid={guid} onClose={showLinks} />
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
        <SubjectShareLinks
          kind={kind}
          subjectGuid={guid}
          showsCreatedInListNotice={createdWithoutLink}
          onSelect={(selectedLinkGuid) =>
            show({ name: "link", linkGuid: selectedLinkGuid }, t("shareLinks.viewAnnouncements.link"))
          }
          onNew={() => {
            setCreatedWithoutLink(false);
            show({ name: "new" }, t("shareLinks.viewAnnouncements.new"));
          }}
        />
      )}
    </View>
  );
}
