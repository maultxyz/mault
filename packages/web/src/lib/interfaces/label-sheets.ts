import type { LABEL_SHEET_TEMPLATE_IDS } from "@/lib/constants/label-sheets";
import type { ReactNode } from "react";

export type LabelSheetTemplateId = (typeof LABEL_SHEET_TEMPLATE_IDS)[number];

export interface LabelSheetTemplate {
  id: LabelSheetTemplateId;
  pageWidth: number;
  pageHeight: number;
  columns: number;
  rows: number;
  labelWidth: number;
  labelHeight: number;
  marginLeft: number;
  marginTop: number;
  horizontalPitch: number;
  verticalPitch: number;
  contentPadding: number;
}

export interface LabelSheetPlacement {
  x: number;
  y: number;
  itemIndex: number;
}

export interface LabelSheetPage {
  pageNumber: number;
  placements: LabelSheetPlacement[];
}

export interface LabelSheetProps {
  template: LabelSheetTemplate;
  itemCount: number;
  startPosition: number;
  itemKey: (itemIndex: number) => string;
  renderLabel: (itemIndex: number) => ReactNode;
  describePage: (itemIndexes: number[], pageNumber: number) => string;
}

export interface LabelSheetOptionValues {
  templateId: LabelSheetTemplateId;
  startPosition: number;
}

export interface LabelSheetOptionFieldsProps {
  idPrefix: string;
  templateId: LabelSheetTemplateId;
  onTemplateIdChange: (templateId: LabelSheetTemplateId) => void;
  startPositionField: {
    name: string;
    value: number;
    ref: (element: HTMLInputElement | null) => void;
    onBlur: () => void;
    onChange: (value: number) => void;
  };
  startPositionError?: { message?: string };
}

export interface LabelBrandProps {
  fontSize: number;
  className?: string;
}
