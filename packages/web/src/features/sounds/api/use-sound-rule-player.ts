import { useOrg } from "@/features/companies/api/use-organization";
import {
  soundClipsQueryOptions,
  soundRulesQueryOptions,
} from "@/features/sounds/api/sounds";
import {
  isSoundPlaying,
  playSoundExclusively,
} from "@/features/sounds/lib/sound-playback";
import { useSecondaryRequestsEnabled } from "@/lib/initial-load-context";
import {
  selectScanSound,
  type FieldMeta,
  type PlayingCard,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";

export function useSoundRulePlayer(
  gameGuid: string | undefined,
  fieldDefinitions: FieldMeta[],
) {
  const { activeOrg } = useOrg();
  const areSecondaryRequestsEnabled = useSecondaryRequestsEnabled();
  const { data: rules = [] } = useQuery({
    ...soundRulesQueryOptions(activeOrg?.id, gameGuid),
    enabled: !!activeOrg?.id && !!gameGuid && areSecondaryRequestsEnabled,
  });
  const clipGuidsUsedByEnabledRules = useMemo(
    () =>
      new Set(
        rules
          .filter((rule) => rule.isEnabled && rule.clipGuid)
          .map((rule) => rule.clipGuid!),
      ),
    [rules],
  );
  const { data: clips = [] } = useQuery({
    ...soundClipsQueryOptions(activeOrg?.id),
    enabled: !!activeOrg?.id && clipGuidsUsedByEnabledRules.size > 0,
  });

  const audioByClipRef = useRef(new Map<string, HTMLAudioElement>());
  useEffect(() => {
    const next = new Map<string, HTMLAudioElement>();
    for (const clip of clips) {
      if (!clip.url || !clipGuidsUsedByEnabledRules.has(clip.guid)) continue;
      const existing = audioByClipRef.current.get(clip.guid);
      if (existing && existing.src === clip.url) {
        next.set(clip.guid, existing);
        continue;
      }
      const audio = new Audio(clip.url);
      audio.preload = "auto";
      next.set(clip.guid, audio);
    }
    audioByClipRef.current = next;
  }, [clips, clipGuidsUsedByEnabledRules]);

  const latestRef = useRef({ rules, fieldDefinitions });
  latestRef.current = { rules, fieldDefinitions };

  return useCallback((card: PlayingCard) => {
    if (isSoundPlaying()) return;
    const { rules: currentRules, fieldDefinitions: fields } =
      latestRef.current;
    const clipGuid = selectScanSound(card, currentRules, fields);
    const audio = clipGuid ? audioByClipRef.current.get(clipGuid) : undefined;
    if (audio) playSoundExclusively(audio);
  }, []);
}
