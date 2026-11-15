import type { Icon } from "@tabler/icons-react";

export interface StatGroupTile {
  key: string;
  label: string;
  value: string | number | null | undefined;
  detail?: string | null;
  icon?: Icon;
  onClick?: () => void;
}

export interface StatTileContentProps {
  tile: StatGroupTile;
}

export interface StatGroupProps {
  heading: string;
  tiles: StatGroupTile[];
  live?: boolean;
  gridClassName?: string;
}

export interface StatCellProps {
  label: string;
  value: string;
  className?: string;
}
