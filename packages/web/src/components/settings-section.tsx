import type {
  SettingsSectionProps,
  SettingsSectionsProps,
} from "@/lib/interfaces/settings-section";
import { SettingsSectionLayoutContext } from "@/lib/settings-section-context";
import { cn } from "@/lib/utils";
import { useContext } from "react";

export function SettingsSections({ children }: SettingsSectionsProps) {
  return (
    <SettingsSectionLayoutContext value="flat">
      <div className="flex flex-col gap-6">{children}</div>
    </SettingsSectionLayoutContext>
  );
}

export function SettingsSection({
  heading,
  description,
  badge,
  action,
  dataTour,
  children,
}: SettingsSectionProps) {
  const layout = useContext(SettingsSectionLayoutContext);

  const title = (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="font-heading text-sm font-semibold">{heading}</h2>
      {badge}
    </div>
  );
  const text = description && (
    <p className="text-sm text-foreground/70">{description}</p>
  );

  return (
    <section
      data-tour={dataTour}
      className={cn(
        "flex flex-col gap-4",
        layout === "flat"
          ? "border-t pt-6 first:border-t-0 first:pt-0"
          : "rounded-lg border p-4",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {title}
          {text}
        </div>
        {action && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {action}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
