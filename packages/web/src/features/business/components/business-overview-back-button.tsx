import { Button } from "@/components/ui/button";
import { ORDERS_PATH } from "@/lib/constants/business";
import { IconChevronLeft } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function BusinessOverviewBackButton() {
  const { t } = useTranslation("business");
  return (
    <Button
      variant="ghost"
      className="self-start"
      render={<Link to={ORDERS_PATH} />}
      nativeButton={false}
    >
      <IconChevronLeft />
      {t("overview.back")}
    </Button>
  );
}
