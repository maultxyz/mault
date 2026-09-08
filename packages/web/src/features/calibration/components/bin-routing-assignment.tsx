import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBinRoutes } from "@/features/calibration/api/use-bin-routes";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { computeBinCount, type BinDirection, type BinRoute } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

function routeValue(route: BinRoute | undefined): string {
  if (!route) return "";
  return `${route.module}:${route.direction}`;
}

export function BinRoutingAssignment() {
  const { t } = useTranslation("calibration");
  const moduleCount = useModuleCount();
  const { routes, isPending, save, resetToDefaults } = useBinRoutes();

  const binCount = computeBinCount(moduleCount);
  const binNumbers = Array.from({ length: binCount }, (_, i) => i + 1);
  const modules = Array.from({ length: moduleCount }, (_, i) => i + 1);

  function handleChange(binNumber: number, value: string | null) {
    if (!value) return;
    const [moduleStr, direction] = value.split(":");
    save({
      binNumber,
      module: Number(moduleStr),
      direction: direction as BinDirection,
    });
  }

  return (
    <div className="flex flex-col gap-2" data-tour="bin-routing-assignment">
      <div className="flex items-center justify-between">
        <Label>{t("binRoutingAssignment.label")}</Label>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={resetToDefaults}
        >
          {t("binRoutingAssignment.resetToDefaults")}
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {binNumbers.map((binNumber) => {
          const route = routes.find((r) => r.binNumber === binNumber);
          return (
            <div key={binNumber} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">
                {t("binRoutingAssignment.binLabel", { bin: binNumber })}
              </span>
              <Select
                value={routeValue(route)}
                onValueChange={(value) => handleChange(binNumber, value)}
              >
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modules.flatMap((module) => [
                    <SelectItem key={`${module}:left`} value={`${module}:left`}>
                      {t("binRoutingAssignment.moduleLeft", { module })}
                    </SelectItem>,
                    <SelectItem key={`${module}:right`} value={`${module}:right`}>
                      {t("binRoutingAssignment.moduleRight", { module })}
                    </SelectItem>,
                    <SelectItem key={`${module}:bottom`} value={`${module}:bottom`}>
                      {t("binRoutingAssignment.moduleBottom", { module })}
                    </SelectItem>,
                  ])}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
