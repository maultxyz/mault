import { FeatureGroupPanel } from "@/features/landing/components/feature-group-panel";
import { FeatureSpotlightRow } from "@/features/landing/components/feature-spotlight-row";
import { MarketingSectionHeader } from "@/components/marketing-section-header";
import {
  LANDING_FEATURE_GROUPS,
  LANDING_FEATURE_SPOTLIGHTS,
} from "@/features/landing/lib/feature-highlights";
import { useInView } from "@/hooks/use-in-view";
import { FEATURE_GROUPS_REVEAL_ROOT_MARGIN } from "@/lib/constants/landing";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export function LandingFeatures() {
  const { t } = useTranslation("landing");
  const groupsRef = useRef<HTMLDivElement>(null);
  const hasRevealedGroups = useInView(groupsRef, {
    observeOnlyUntilFirstVisible: true,
    rootMargin: FEATURE_GROUPS_REVEAL_ROOT_MARGIN,
  });

  return (
    <section id="features" className="scroll-mt-14">
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-16 md:pt-24 md:pb-24">
        <MarketingSectionHeader
          eyebrow={t("features.eyebrow")}
          heading={t("features.heading")}
          subtitle={t("features.subtitle")}
        />

        <div className="mt-6 md:mt-10">
          {LANDING_FEATURE_SPOTLIGHTS.map((spotlight, index) => (
            <FeatureSpotlightRow
              key={spotlight.key}
              spotlight={spotlight}
              isMirrored={index % 2 === 1}
            />
          ))}
        </div>

        <div className="pt-10 md:pt-16">
          <h3 className="text-center text-3xl font-heading font-semibold tracking-tight text-balance md:text-4xl">
            {t("features.more.heading")}
          </h3>
          <div ref={groupsRef} className="mt-10 grid gap-4 lg:grid-cols-3">
            {LANDING_FEATURE_GROUPS.map((group) => (
              <FeatureGroupPanel
                key={group.key}
                group={group}
                isRevealed={hasRevealedGroups}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
