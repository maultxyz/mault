import { buildMonitorLinkUrl } from "@/features/collections/api/monitor-links";
import { buildStorageShareLinkUrl } from "@/features/storage/api/storage-share-links";
import type { OrgShareLink } from "@magic-vault/shared";

export function shareLinkUrl(link: OrgShareLink): string {
  return link.kind === "collection"
    ? buildMonitorLinkUrl(link.subjectGuid, link.token)
    : buildStorageShareLinkUrl(link.subjectGuid, link.token);
}
