export interface StatGroupTile {
  key: string;
  label: string;
  value: string | number | null | undefined;
  detail?: string | null;
}

export interface StatGroupProps {
  heading: string;
  tiles: StatGroupTile[];
  live?: boolean;
  gridClassName?: string;
}
