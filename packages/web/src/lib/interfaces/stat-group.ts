export interface StatGroupTile {
  key: string;
  label: string;
  value: string | number | null | undefined;
  detail?: string | null;
  onClick?: () => void;
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
