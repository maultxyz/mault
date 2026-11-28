import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface StatGroupTile {
  key: string;
  label: string;
  value: ReactNode;
  detail?: string | null;
  icon?: Icon;
  onClick?: () => void;
  to?: string;
}

export interface StatTileContentProps {
  tile: StatGroupTile;
  prominent?: boolean;
}

export interface StatGroupProps {
  heading: string;
  tiles: StatGroupTile[];
  live?: boolean;
  prominent?: boolean;
  gridClassName?: string;
  dataTour?: string;
}

export interface StatCellProps {
  label: string;
  value: ReactNode;
  className?: string;
}
