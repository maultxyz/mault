import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { activeAnnouncementsQueryOptions } from "@/features/stream/api/announcements";
import { useAppStream } from "@/features/stream/api/use-app-stream";
import { useActiveOrgId } from "@/hooks/use-org";
import type { AppAlert } from "@/lib/interfaces/stream";

export function useAppAlerts(): AppAlert[] {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const sorter = useSorter();
  const { deployNotice } = useAppStream();
  const { data: announcements } = useQuery(activeAnnouncementsQueryOptions(orgId));
  const firmwareMissing = sorter.isConnected && sorter.isReady && !sorter.firmwareVersion;

  return useMemo(
    () =>
      [
        deployNotice ? { id: `deploy-${deployNotice.guid}`, severity: "info" as const, message: deployNotice.message } : null,
        firmwareMissing ? { id: "firmware-version-missing", severity: "danger" as const, message: t("alerts.firmwareMissing") } : null,
        ...(announcements ?? []).map((announcement) => ({
          id: `announcement-${announcement.guid}`,
          severity: announcement.severity,
          message: announcement.message,
          link: announcement.link,
        })),
      ].filter((alert): alert is AppAlert => alert !== null),
    [announcements, deployNotice, firmwareMissing, t],
  );
}
