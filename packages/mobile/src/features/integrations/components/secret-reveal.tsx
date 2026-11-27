import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { AccessibilityInfo, Share, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { Surface } from "@/components/ui/surface";
import { useSecretRevealGuard } from "@/features/settings/lib/use-leave-guard";
import { useTheme } from "@/hooks/use-theme";
import type { SecretCopyStatus, SecretRevealProps } from "@/lib/interfaces/settings";
import { playSuccessHaptic } from "@/lib/haptics";

export function SecretReveal({
  title,
  subtitle,
  description,
  secret,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  shareLabel,
  doneLabel,
}: SecretRevealProps) {
  const colors = useTheme();
  const [copyStatus, setCopyStatus] = useState<SecretCopyStatus>("idle");
  const { leaveWithoutGuard } = useSecretRevealGuard(true);

  const copySecret = async () => {
    try {
      await Clipboard.setStringAsync(secret);
      setCopyStatus("copied");
      playSuccessHaptic();
      AccessibilityInfo.announceForAccessibility(copiedLabel);
    } catch {
      setCopyStatus("failed");
    }
  };

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={title} subtitle={subtitle} />
      <PinnedActionsLayout
        actions={
          <>
            <Button
              size="lg"
              icon={copyStatus === "copied" ? "check" : "copy"}
              label={copyStatus === "copied" ? copiedLabel : copyLabel}
              onPress={() => void copySecret()}
            />
            <Button variant="secondary" icon="share" label={shareLabel} onPress={() => void Share.share({ message: secret })} />
            <Button variant="ghost" label={doneLabel} onPress={() => leaveWithoutGuard()} />
          </>
        }
      >
        {copyStatus === "failed" ? <Callout tone="destructive" title={copyFailedLabel} /> : null}
        <AppText size="sm" tone="secondary">
          {description}
        </AppText>
        <Surface>
          <AppText mono selectable>
            {secret}
          </AppText>
        </Surface>
      </PinnedActionsLayout>
    </View>
  );
}
