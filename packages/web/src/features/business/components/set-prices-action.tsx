import { Button } from "@/components/ui/button";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { useHasBusinessTools } from "@/features/business/api/use-has-business-tools";
import { SetPricesDialog } from "@/features/business/components/set-prices-dialog";
import { setPricesTabsFor } from "@/features/business/lib/set-prices";
import type { SetPricesActionProps } from "@/lib/interfaces/business";
import { IconTag } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function SetPricesActionForBusiness({ scanIds, buttonClassName }: SetPricesActionProps) {
  const { t } = useTranslation("business");
  const { access } = useBusinessAccess();
  const [open, setOpen] = useState(false);
  const tabs = setPricesTabsFor(access);

  if (tabs.length === 0) return null;

  return (
    <>
      <Button variant="ghost" className={buttonClassName} onClick={() => setOpen(true)}>
        <IconTag />
        {t("setPrices.button")}
      </Button>
      <SetPricesDialog scanIds={scanIds} open={open} onOpenChange={setOpen} tabs={tabs} />
    </>
  );
}

export function SetPricesAction(props: SetPricesActionProps) {
  const hasBusinessTools = useHasBusinessTools();
  return hasBusinessTools ? <SetPricesActionForBusiness {...props} /> : null;
}
