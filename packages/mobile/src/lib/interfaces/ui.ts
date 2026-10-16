import type { ReactNode } from "react";
import type { StyleProp, TextProps, ViewStyle } from "react-native";
import type { OrgOverviewCard, OrgOverviewDay, PlayingCard, ScanRegion } from "@magic-vault/shared";
import type { ICONS } from "@/lib/constants/icons";
import type { LiveCorners, MonitorState } from "@/lib/interfaces/scanner";
import type { FontSize, StatusTone } from "@/lib/interfaces/theme";

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
}

export type TextTone = "default" | "secondary" | "primary" | StatusTone | "inverse";

export interface AppTextProps extends TextProps {
  size?: FontSize;
  tone?: TextTone;
  weight?: "regular" | "medium" | "semibold" | "bold";
  mono?: boolean;
  heading?: boolean;
}

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoComplete?: "email" | "password" | "name" | "off" | "new-password";
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words";
  returnKeyType?: "next" | "done" | "go" | "search";
  onSubmitEditing?: () => void;
}

export interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
}

export interface SurfaceProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export interface CalloutProps {
  tone?: StatusTone;
  title: string;
  description?: string;
  action?: ReactNode;
}

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}

export interface SkeletonProps {
  width?: number | `${number}%`;
  height: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  leading?: ReactNode;
  value?: string;
  tone?: "default" | "destructive";
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
}

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ("top" | "bottom")[];
  header?: ReactNode;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string | null;
  subtitleAccessory?: ReactNode;
  onBack?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
}

export interface ListGroupProps {
  children: ReactNode;
}

export interface PillProps {
  label: string;
  tone?: StatusTone | "neutral";
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
}

export interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
}


export interface CardRowProps {
  name: string;
  subtitle: string;
  imageUrl: string | null;
  quantity?: number;
  price?: string | null;
  binNumber?: number;
  lowConfidence?: boolean;
  onPress?: () => void;
}

export interface CommLogProps {
  entries: { direction: "sent" | "received"; text: string; timestamp: number }[];
}


export interface CardTileProps {
  name: string;
  caption: string;
  imageUrl: string | null;
  isFoil?: boolean;
  quantity?: number;
  flagged?: boolean;
  corrected?: boolean;
  onPress?: () => void;
}

export interface HomeStatTileProps {
  label: string;
  value: string;
}

export interface ActivityChartProps {
  days: OrgOverviewDay[];
}

export interface CardStripProps {
  title: string;
  cards: OrgOverviewCard[];
  onOpen: (card: OrgOverviewCard) => void;
}

export interface TabStripItem<T extends string> {
  value: T;
  label: string;
  badge?: number;
}

export interface TabStripProps<T extends string> {
  items: TabStripItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

export interface HomeCollectionRowProps {
  name: string;
  subtitle: string;
  value?: string | null;
  isActive: boolean;
  onPress: () => void;
}

export interface CardDetailsListProps {
  card: PlayingCard;
  binNumber?: number;
}

export interface DetailRowProps {
  label: string;
  value: string;
}

export interface HomeHeroProps {
  value: string | null;
  summary: string | null;
}

export interface CollectionActivityProps {
  state: MonitorState;
  onOpen: (scanId: string) => void;
}

export interface CameraChipProps {
  label: string;
  dotColor?: string;
  icon?: IconName;
  onPress?: () => void;
}

export interface CameraNoticeProps {
  tone: StatusTone;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ShutterButtonProps {
  running: boolean;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface OptionItem {
  value: string;
  label: string;
}

export interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selected: string[];
  multiple?: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export interface SelectFieldProps {
  label?: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface SwitchRowProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export interface SaveBarProps {
  visible: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export interface InputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "number-pad";
  maxLength?: number;
  editable?: boolean;
  compact?: boolean;
}

export interface ScanRegionOverlayProps {
  region: ScanRegion;
  frameAspect: number;
  strokeColor: string;
}

export interface DetectedOutlineProps {
  corners: LiveCorners;
  color: string;
}

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  accessibilityLabel: string;
  onValueChange: (value: number) => void;
}

export interface SliderFieldProps extends SliderProps {
  label: string;
  description?: string;
  valueLabel: string;
  children?: ReactNode;
}

export interface StepperRowProps {
  value: number;
  min: number;
  max?: number;
  bigStep: number;
  smallStep: number;
  disabled?: boolean;
  valueLabel: string;
  onChange: (value: number) => void;
}

export interface IconBadgeProps {
  name: IconName;
  tone?: "neutral" | "primary" | "destructive" | "success" | "warning";
  size?: number;
}

export interface IconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: "neutral" | "primary" | "plain" | "camera";
  size?: number;
  disabled?: boolean;
}

export interface QuickActionProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface PickerCardProps {
  icon: IconName;
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}
