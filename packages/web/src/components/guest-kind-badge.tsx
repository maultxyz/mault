import { Badge } from "@/components/ui/badge";
import type { GuestKindBadgeProps } from "@/lib/interfaces/public-cards";
import { useTranslation } from "react-i18next";

export function GuestKindBadge({ isFromAccount }: GuestKindBadgeProps) {
  const { t } = useTranslation("common");
  if (isFromAccount === null || isFromAccount === undefined) return null;
  return (
    <Badge variant="secondary">
      {isFromAccount ? t("guestKind.signedIn") : t("guestKind.guest")}
    </Badge>
  );
}
