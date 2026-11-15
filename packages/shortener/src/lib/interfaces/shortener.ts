import type { ShortenerLink } from "@magic-vault/shared";

export interface ShortLinkStore {
  findTargetPath(code: string): Promise<string | null>;
  saveLinks(links: ShortenerLink[]): Promise<void>;
  deleteLinks(codes: string[]): Promise<void>;
}

export interface ShortenerConfig {
  apiSecret: string | null;
  shortLinkTargetOrigin: string | null;
}
