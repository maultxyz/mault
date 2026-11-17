import type { GuideSetupStepProps } from "@/lib/interfaces/guide";

export function GuideSetupStep({
  step,
  label,
  hint,
  children,
}: GuideSetupStepProps) {
  return (
    <div className="group/step flex gap-3">
      <div className="flex flex-col items-center">
        <span className="grid size-6 shrink-0 place-items-center rounded-sm border border-primary font-heading text-2xs font-semibold text-primary">
          {String(step).padStart(2, "0")}
        </span>
        <span
          aria-hidden
          className="my-1.5 w-px flex-1 bg-border group-last/step:hidden"
        />
      </div>
      <div className="min-w-0 flex-1 pb-5 group-last/step:pb-0">
        <h3 className="font-heading text-sm font-semibold">{label}</h3>
        {hint && (
          <div className="mt-0.5 text-sm/relaxed text-foreground/70">
            {hint}
          </div>
        )}
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
