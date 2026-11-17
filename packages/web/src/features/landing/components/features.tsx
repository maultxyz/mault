import { MarketingSectionHeader } from "@/components/marketing-section-header";
import { FeatureGroupPanel } from "@/features/landing/components/feature-group-panel";
import { FeatureSpotlightRow } from "@/features/landing/components/feature-spotlight-row";
import {
  LANDING_FEATURE_GROUPS,
  LANDING_FEATURE_SPOTLIGHTS,
} from "@/features/landing/lib/feature-highlights";
import { useInView } from "@/hooks/use-in-view";
import { FEATURE_GROUPS_REVEAL_ROOT_MARGIN } from "@/lib/constants/landing";
import type { MarketingStepProps } from "@/lib/interfaces/marketing-rule";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export function LandingFeatures({ step }: MarketingStepProps) {
  const { t } = useTranslation("landing");
  const groupsRef = useRef<HTMLDivElement>(null);
  const hasRevealedGroups = useInView(groupsRef, {
    observeOnlyUntilFirstVisible: true,
    rootMargin: FEATURE_GROUPS_REVEAL_ROOT_MARGIN,
  });

  return (
    <section id="features">
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-16 md:pt-24 md:pb-24">
        <MarketingSectionHeader
          step={step}
          eyebrow={t("features.eyebrow")}
          heading={t("features.heading")}
          subtitle={t("features.subtitle")}
        />

        <div className="mt-6 divide-y md:mt-10">
          {LANDING_FEATURE_SPOTLIGHTS.map((spotlight, index) => (
            <FeatureSpotlightRow
              key={spotlight.key}
              spotlight={spotlight}
              numberLabel={`${step}.${String(index + 1).padStart(2, "0")}`}
              isMirrored={index % 2 === 1}
            />
          ))}
        </div>

        <div className="mt-10 border-t pt-16 md:pt-24">
          <h3 className="font-heading text-2xl font-semibold tracking-tight text-balance md:text-4xl">
            {t("features.more.heading")}
          </h3>
          <div
            ref={groupsRef}
            className="mt-8 grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border lg:grid-cols-3"
          >
            {LANDING_FEATURE_GROUPS.map((group, index) => (
              <FeatureGroupPanel
                key={group.key}
                group={group}
                numberLabel={`${step}.${String(LANDING_FEATURE_SPOTLIGHTS.length + index + 1).padStart(2, "0")}`}
                isRevealed={hasRevealedGroups}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
