import type { UserInitialsProps } from "@/lib/interfaces/account";
import { getInitials } from "@magic-vault/shared";

export function UserInitials({ name }: UserInitialsProps) {
  return (
    <span
      aria-hidden
      className="grid size-5.5 place-items-center rounded-full bg-primary text-2xs font-semibold text-primary-foreground"
    >
      {getInitials(name)}
    </span>
  );
}
