import { buildShortLinkUrl, type OrgShareLink } from "@magic-vault/shared";

export function shareLinkUrl(link: Pick<OrgShareLink, "shortCode">): string {
  return buildShortLinkUrl(window.location.origin, link.shortCode);
}
