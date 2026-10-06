import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTour } from "@/features/onboarding/api/use-tour";
import type { TourHelpButtonProps } from "@/lib/interfaces/tours";
import { cn } from "@/lib/utils";
import { IconHelpCircle } from "@tabler/icons-react";

export function TourHelpButton({
  steps,
  completedKey,
  tooltip,
  className,
}: TourHelpButtonProps) {
  const { controls, Tour } = useTour({ steps, completedKey });

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className={cn(className)}
              onClick={() => controls.start(0)}
            >
              <IconHelpCircle />
            </Button>
          }
        />
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
      {Tour}
    </>
  );
}
