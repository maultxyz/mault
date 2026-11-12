import { useOrg } from "@/features/companies/api/use-organization";
import { soundClipsQueryOptions } from "@/features/sounds/api/sounds";
import { isSoundPlaying, playSoundExclusively } from "@/features/sounds/lib/sound-playback";
import { useAppStreamSource } from "@/lib/app-stream";
import type { PiScanSessionState } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function usePiScanSound(state: PiScanSessionState, enabled: boolean) {
  const { activeOrg } = useOrg();
  const eventSource = useAppStreamSource();
  const { data: clips = [] } = useQuery(soundClipsQueryOptions(activeOrg?.id));
  const audioRef = useRef(new Map<string, HTMLAudioElement>());
  const seenRef = useRef(new Set<string>());
  const baselineRef = useRef(false);

  useEffect(() => () => {
    for (const audio of audioRef.current.values()) audio.pause();
    audioRef.current.clear();
  }, [activeOrg?.id]);

  useEffect(() => {
    const next = new Map<string, HTMLAudioElement>();
    for (const clip of clips) {
      if (!clip.url) continue;
      const existing = audioRef.current.get(clip.guid);
      const audio = existing?.src === clip.url ? existing : new Audio(clip.url);
      audio.preload = "auto";
      next.set(clip.guid, audio);
    }
    audioRef.current = next;
  }, [clips, activeOrg?.id]);

  useEffect(() => {
    baselineRef.current = false;
    const reset = () => {
      baselineRef.current = false;
    };
    eventSource?.addEventListener("open", reset);
    return () => eventSource?.removeEventListener("open", reset);
  }, [enabled, activeOrg?.id, eventSource]);

  useEffect(() => {
    if (!enabled || !state.soundEvents) return;
    const events = state.soundEvents;
    const seen = seenRef.current;
    seenRef.current = new Set(events.map((event) => event.id));
    if (!baselineRef.current) {
      baselineRef.current = true;
      return;
    }
    for (const event of events) {
      if (seen.has(event.id)) continue;
      if (isSoundPlaying()) continue;
      const audio = audioRef.current.get(event.clipGuid);
      if (audio) playSoundExclusively(audio);
    }
  }, [enabled, activeOrg?.id, state.soundEvents]);
}
