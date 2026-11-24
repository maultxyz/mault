import { FormSkeleton } from "@/components/ui/form-skeleton";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { SwitchRowSkeleton } from "@/components/ui/switch-row-skeleton";
import { RuleGroupSkeleton } from "@/features/rules/components/rule-group-skeleton";
import type { RuleFormSkeletonProps } from "@/lib/interfaces/rules";

export function RuleFormSkeleton({ fields }: RuleFormSkeletonProps) {
  return (
    <>
      <FormSkeleton fields={fields} />
      <SwitchRowSkeleton />
      <SectionSkeleton titleWidth={112}>
        <RuleGroupSkeleton rows={1} />
      </SectionSkeleton>
    </>
  );
}
