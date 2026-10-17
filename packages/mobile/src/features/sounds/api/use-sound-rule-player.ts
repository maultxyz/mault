import { useQuery } from "@tanstack/react-query";
import type { AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import { evaluateRuleGroup, type FieldMeta, type PlayingCard } from "@magic-vault/shared";
import { soundClipsQueryOptions, soundRulesQueryOptions } from "@/features/sounds/api/sounds";
import { createClipPlayer, isSoundPlaying, playSoundExclusively } from "@/features/sounds/lib/sound-playback";
import { useActiveOrgId } from "@/hooks/use-org";

export function useSoundRulePlayer(gameGuid: string | undefined, fieldDefinitions: FieldMeta[]) {
  const orgId = useActiveOrgId();
  const { data: rules = [] } = useQuery(soundRulesQueryOptions(orgId, gameGuid));
  const { data: clips = [] } = useQuery(soundClipsQueryOptions(orgId));
  const playersRef = useRef(new Map<string, { url: string; player: AudioPlayer }>());

  useEffect(() => {
    const next = new Map<string, { url: string; player: AudioPlayer }>();
    for (const clip of clips) {
      if (!clip.url) continue;
      const existing = playersRef.current.get(clip.guid);
      if (existing && existing.url === clip.url) {
        next.set(clip.guid, existing);
        continue;
      }
      existing?.player.remove();
      next.set(clip.guid, { url: clip.url, player: createClipPlayer(clip.url) });
    }
    for (const [guid, entry] of playersRef.current) {
      if (!next.has(guid)) entry.player.remove();
    }
    playersRef.current = next;
  }, [clips]);

  useEffect(
    () => () => {
      for (const entry of playersRef.current.values()) entry.player.remove();
      playersRef.current = new Map();
    },
    [],
  );

  const latestRef = useRef({ rules, fieldDefinitions });
  latestRef.current = { rules, fieldDefinitions };

  return useCallback((card: PlayingCard) => {
    if (isSoundPlaying()) return;
    const { rules: currentRules, fieldDefinitions: fields } = latestRef.current;
    const rule = currentRules.find((r) => r.isEnabled && r.clipGuid && evaluateRuleGroup(card, r.rules, fields));
    const entry = rule?.clipGuid ? playersRef.current.get(rule.clipGuid) : undefined;
    if (entry) playSoundExclusively(entry.player);
  }, []);
}
