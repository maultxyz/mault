import { buildShareLinkUrl, type ShareableLink } from "@magic-vault/shared";

export function shareLinkUrl(link: ShareableLink): string {
  return buildShareLinkUrl(window.location.origin, link);
}
