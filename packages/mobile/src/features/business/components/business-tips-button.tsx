import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import type { BusinessTipsButtonProps } from "@/lib/interfaces/business";

export function BusinessTipsButton({ onPress }: BusinessTipsButtonProps) {
  const { t } = useTranslation();
  return <IconButton icon="help" accessibilityLabel={t("businessTips.open")} onPress={onPress} />;
}
