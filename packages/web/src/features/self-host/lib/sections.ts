import { SELF_HOST_SECTIONS } from "@/lib/constants/self-host";
import type {
  SelfHostCondition,
  SelfHostSection,
  SelfHostSetupState,
} from "@/lib/interfaces/self-host";

function matches(
  when: SelfHostCondition | undefined,
  setup: SelfHostSetupState,
): boolean {
  if (!when) return true;
  return (
    (!when.host || when.host === setup.host) &&
    (!when.auth || when.auth === setup.auth)
  );
}

export function visibleSelfHostSections(
  setup: SelfHostSetupState,
): SelfHostSection[] {
  return SELF_HOST_SECTIONS.filter((section) => matches(section.when, setup))
    .map((section) => ({
      ...section,
      steps: section.steps.filter((step) => matches(step.when, setup)),
    }))
    .filter((section) => section.steps.length > 0);
}

export function selfHostStepKey(sectionKey: string, stepKey: string): string {
  return `${sectionKey}.${stepKey}`;
}
