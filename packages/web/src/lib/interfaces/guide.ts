import type { ReactNode } from "react";

export interface ChecklistStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Record<string, boolean>;
  toggle: (key: string) => void;
  check: (keys: readonly string[]) => void;
}

export interface GuideTocEntry {
  id: string;
  label: string;
  done?: number;
  total?: number;
  depth: 0 | 1;
  number?: number;
}

export interface GuideTocListProps {
  entries: GuideTocEntry[];
  onNavigate?: () => void;
}

export interface GuideTableOfContentsProps {
  entries: GuideTocEntry[];
}

export interface GuidePageProps {
  footer: ReactNode;
  children: ReactNode;
}

export interface GuideHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

export interface GuideSectionHeaderProps {
  id: string;
  step: string;
  eyebrow: string;
  heading: string;
  aside?: ReactNode;
  children?: ReactNode;
}

export interface GuideSetupStepProps {
  step: number;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}

export interface GuideChecklistItemProps {
  id: string;
  checked: boolean;
  onToggle: () => void;
  number?: string;
  children: ReactNode;
  details?: ReactNode;
  aside?: ReactNode;
  className?: string;
}

export interface GuideProgressProps {
  label: string;
  done: number;
  total: number;
}

export interface GuideCodeBlockProps {
  code: string;
}

export interface AnchorLinkButtonProps {
  id: string;
  className?: string;
}
