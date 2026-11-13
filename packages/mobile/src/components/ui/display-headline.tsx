import { AppText } from "@/components/ui/app-text";
import type { DisplayHeadlineProps } from "@/lib/interfaces/ui";

export function DisplayHeadline({ title, subtitle }: DisplayHeadlineProps) {
  return (
    <AppText size="3xl" heading weight="bold" accessibilityRole="header" style={{ letterSpacing: -0.5 }}>
      {title}
      {subtitle ? (
        <AppText size="3xl" heading weight="bold" tone="secondary" style={{ letterSpacing: -0.5 }}>
          {`\n${subtitle}`}
        </AppText>
      ) : null}
    </AppText>
  );
}
