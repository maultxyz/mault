import type {
  SettingsSectionProps,
  SettingsSectionsProps,
} from "@/lib/interfaces/settings-section";

export function SettingsSections({ children }: SettingsSectionsProps) {
  return (
    <div className="flex flex-col divide-y [&>section:first-child]:pt-2">
      {children}
    </div>
  );
}

export function SettingsSection({
  heading,
  description,
  badge,
  action,
  children,
}: SettingsSectionProps) {
  return (
    <section className="grid gap-4 py-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-base font-semibold">{heading}</h2>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-foreground/70">{description}</p>
        )}
      </div>
      {(action || children) && (
        <div className="flex min-w-0 flex-col gap-4">
          {action && <div className="flex flex-wrap gap-2">{action}</div>}
          {children}
        </div>
      )}
    </section>
  );
}
