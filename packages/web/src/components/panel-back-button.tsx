import { Button } from "@/components/ui/button";
import type { PanelBackButtonProps } from "@/lib/interfaces/nav";
import { IconChevronLeft } from "@tabler/icons-react";
import { Link } from "react-router-dom";

export function PanelBackButton({ to, label }: PanelBackButtonProps) {
  return (
    <Button
      variant="ghost"
      className="self-start"
      render={<Link to={to} />}
      nativeButton={false}
    >
      <IconChevronLeft />
      {label}
    </Button>
  );
}
