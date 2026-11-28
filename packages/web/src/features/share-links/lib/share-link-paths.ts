import {
  buildShareLinkDisplayUrl,
  buildShareLinkUrl,
  type ShareableLink,
} from "@magic-vault/shared";

export function shareLinkUrl(link: ShareableLink): string {
  return buildShareLinkUrl(window.location.origin, link);
}

export function shareLinkDisplayUrl(link: ShareableLink): string | null {
  return buildShareLinkDisplayUrl(window.location.origin, link);
}
