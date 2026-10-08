import type { ReactNode } from "react";

export interface MarketingFooterLink {
  label: string;
  to?: string;
  href?: string;
  external?: boolean;
}

export interface MarketingFooterProps {
  links: MarketingFooterLink[];
  end: ReactNode;
  wide?: boolean;
}
