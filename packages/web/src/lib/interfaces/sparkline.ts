export interface SparklineProps {
  values: number[];
  formatPoint: (value: number, index: number) => string;
  ariaLabel: string;
  className?: string;
}
