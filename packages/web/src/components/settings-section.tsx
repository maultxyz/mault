import type {
  SettingsSectionProps,
  SettingsSectionsProps,
} from "@/lib/interfaces/settings-section";

export function SettingsSections({ children }: SettingsSectionsProps) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

export function SettingsSection({
  heading,
  description,
  badge,
  action,
  children,
}: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-sm font-semibold">{heading}</h2>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-foreground/70">{description}</p>
          )}
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
