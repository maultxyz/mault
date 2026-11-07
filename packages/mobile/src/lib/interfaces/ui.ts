import type { ReactNode } from "react";
import type { StyleProp, TextProps, ViewStyle } from "react-native";
import type { CommLogEntry, PlayingCard, ScanRegion } from "@magic-vault/shared";
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
  iconOnly?: boolean;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
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
  textContentType?: "emailAddress" | "password" | "newPassword" | "name" | "none";
  keyboardType?: "default" | "email-address" | "decimal-pad" | "number-pad";
  editable?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
  returnKeyType?: "next" | "done" | "go" | "search";
  onSubmitEditing?: () => void;
  multiline?: boolean;
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
  rightIsInteractive?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  subtitleNumberOfLines?: number;
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
  titleAccessory?: ReactNode;
  subtitle?: string | null;
  subtitleAccessory?: ReactNode;
  onBack?: () => void;
  actions?: ReactNode;
  tabs?: ReactNode;
  children?: ReactNode;
}

export interface ListGroupProps {
  children: ReactNode;
}

export interface PillButtonProps {
  label: string;
  tone?: PillProps["tone"];
  icon?: IconName;
  onPress: () => void;
}

export interface PillProps {
  label: string;
  tone?: StatusTone | "neutral" | "primary";
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

export interface StatGroupProps {
  heading?: string;
  children: ReactNode;
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
  checked?: boolean;
  onPress?: () => void;
}

export interface CommLogProps {
  entries: CommLogEntry[];
}


export interface CardTileProps {
  name: string;
  caption: string;
  imageUrl: string | null;
  isFoil?: boolean;
  quantity?: number;
  flagged?: boolean;
  corrected?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
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
  inline?: boolean;
}

export interface HomeCollectionRowProps {
  name: string;
  subtitle: string;
  value?: string | null;
  isScanTarget: boolean;
  isLive?: boolean;
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


export interface BinBadgeProps {
  binNumber: number;
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
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface OptionItem {
  value: string;
  label: string;
  badge?: string;
}

export interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selected: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
  searchPlaceholder?: string;
  maxVisibleOptions?: number;
}

export interface SelectFieldProps {
  label?: string;
  value: string | null;
  placeholder: string;
  accessibilityLabel?: string;
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
  corners: LiveCorners | null;
  color: string;
}

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityValueText?: string;
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
  selected?: boolean;
}

export interface TopBarSwitcherProps {
  initial: string;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}

export type AppTopBarSheet = "alerts" | "organizations";

export interface PickerCardProps {
  icon: IconName;
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

export interface PanelClipProps {
  children: ReactNode;
  backgroundColor?: string;
}

export interface ListSkeletonProps {
  rows?: number;
  withIcon?: boolean;
}

export interface PageSkeletonProps {
  sections?: number;
}
