import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TradeLinkSourceDialog } from "@/features/trade-offers/components/trade-link-source-dialog";
import { IN_PERSON_TRADE_PATH } from "@/lib/constants/trade-offers";
import { IconUsers, IconLink, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function NewTradeMenu() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button>
              <IconPlus />
              {t("tradeOffers.newTrade.button")}
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={() => setIsLinkDialogOpen(true)}>
            <IconLink />
            <span className="flex flex-col">
              <span>{t("tradeOffers.newTrade.link")}</span>
              <span className="text-xs text-foreground/70">{t("tradeOffers.newTrade.linkHint")}</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(IN_PERSON_TRADE_PATH)}>
            <IconUsers />
            <span className="flex flex-col">
              <span>{t("tradeOffers.newTrade.inPerson")}</span>
              <span className="text-xs text-foreground/70">{t("tradeOffers.newTrade.inPersonHint")}</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TradeLinkSourceDialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen} />
    </>
  );
}
