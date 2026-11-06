import { Button } from "@/components/ui/button";
import { MATCH_VALIDATIONS_PATH } from "@/lib/constants/match-validations";
import type { ValidateMatchesButtonProps } from "@/lib/interfaces/match-validations";
import { IconCircleCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

export function ValidateMatchesButton({ iconOnly }: ValidateMatchesButtonProps) {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const isCurrentPage = pathname === MATCH_VALIDATIONS_PATH;
  const label = t("nav.validateMatches");

  return (
    <Button
      variant="outline-selected"
      size={iconOnly ? "icon-lg" : "default"}
      aria-label={iconOnly ? label : undefined}
      aria-current={isCurrentPage ? "page" : undefined}
      nativeButton={false}
      render={<Link to={MATCH_VALIDATIONS_PATH} />}
    >
      <IconCircleCheck />
      {!iconOnly && label}
    </Button>
  );
}
