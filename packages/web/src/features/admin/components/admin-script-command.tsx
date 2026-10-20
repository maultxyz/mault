import type { AdminScriptCommandProps } from "@/lib/interfaces/admin";

export function AdminScriptCommand({
  command,
  description,
}: AdminScriptCommandProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-foreground/70">{description}</p>
      <pre className="overflow-x-auto rounded-lg border bg-muted px-3 py-2 text-xs">
        <code>{command}</code>
      </pre>
    </div>
  );
}
