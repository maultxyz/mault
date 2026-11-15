import { shortLinkUrlOf, type ShortLinkReference } from "@magic-vault/shared";

export function shareLinkUrl(link: ShortLinkReference): string {
  return shortLinkUrlOf(link, window.location.origin);
}
