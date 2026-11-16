import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface StatGroupTile {
  key: string;
  label: string;
  value: ReactNode;
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
  value: ReactNode;
  className?: string;
}
