import type { ShortenerCustomLink, ShortenerLink } from "@magic-vault/shared";

export interface ShortLinkStore {
  findTargetPath(code: string): Promise<string | null>;
  saveLinks(links: ShortenerLink[]): Promise<void>;
  deleteLinks(codes: string[]): Promise<void>;
  listCustomLinks(): Promise<ShortenerCustomLink[]>;
  createCustomLink(code: string, targetUrl: string): Promise<ShortenerCustomLink | null>;
  updateCustomLink(code: string, targetUrl: string): Promise<ShortenerCustomLink | null>;
  deleteCustomLink(code: string): Promise<boolean>;
}

export interface ShortenerConfig {
  apiSecret: string | null;
  shortLinkTargetOrigin: string | null;
}

export interface CustomLinkRow {
  code: string;
  target_path: string;
  created_at: Date;
  updated_at: Date;
}
