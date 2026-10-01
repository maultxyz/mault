import { useOrg } from "@/features/companies/api/use-organization";
import {
  soundClipsQueryOptions,
  soundRulesQueryOptions,
} from "@/features/sounds/api/sounds";
import {
  isSoundPlaying,
  playSoundExclusively,
} from "@/features/sounds/lib/sound-playback";
import {
  evaluateRuleGroup,
  type FieldMeta,
  type PlayingCard,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

export function useSoundRulePlayer(
  gameGuid: string | undefined,
  fieldDefinitions: FieldMeta[],
) {
  const { activeOrg } = useOrg();
  const { data: rules = [] } = useQuery(
    soundRulesQueryOptions(activeOrg?.id, gameGuid),
  );
  const { data: clips = [] } = useQuery(
    soundClipsQueryOptions(activeOrg?.id),
  );

  const audioByClipRef = useRef(new Map<string, HTMLAudioElement>());
  useEffect(() => {
    const next = new Map<string, HTMLAudioElement>();
    for (const clip of clips) {
      if (!clip.url) continue;
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
  }, [clips]);

  const latestRef = useRef({ rules, fieldDefinitions });
  latestRef.current = { rules, fieldDefinitions };

  return useCallback((card: PlayingCard) => {
    if (isSoundPlaying()) return;
    const { rules: currentRules, fieldDefinitions: fields } =
      latestRef.current;
    const rule = currentRules.find(
      (r) => r.isEnabled && r.clipGuid && evaluateRuleGroup(card, r.rules, fields),
    );
    const audio = rule?.clipGuid
      ? audioByClipRef.current.get(rule.clipGuid)
      : undefined;
    if (audio) playSoundExclusively(audio);
  }, []);
}
