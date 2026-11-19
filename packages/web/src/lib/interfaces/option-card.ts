import type { Icon } from "@tabler/icons-react";

export interface OptionCardProps {
  icon: Icon;
  title: string;
  description: string;
  badge?: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}
