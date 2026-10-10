import { Button } from "@/components/ui/button";
import {
  formatVideoTimestamp,
  getYouTubeVideoId,
} from "@/features/build/lib/build-phases";
import type { PhaseVideoProps } from "@/lib/interfaces/build";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function PhaseVideo({ video }: PhaseVideoProps) {
  const { t } = useTranslation("build");
  const [activeChapter, setActiveChapter] = useState(video.chapters[0]);
  const [autoplay, setAutoplay] = useState(false);
  const id = getYouTubeVideoId(video.url);
  if (!id) return null;

  const params = new URLSearchParams({
    start: String(activeChapter?.startSeconds ?? 0),
  });
  if (autoplay) params.set("autoplay", "1");

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <iframe
          key={`${activeChapter?.key}-${autoplay}`}
          src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
          title={t("assembly.videoTitle")}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
          className="size-full"
        />
      </div>
      {video.chapters.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {video.chapters.map((chapter) => (
            <Button
              key={chapter.key}
              type="button"
              variant={
                chapter.key === activeChapter?.key
                  ? "outline-selected"
                  : "outline"
              }
              className="text-sm"
              onClick={() => {
                setActiveChapter(chapter);
                setAutoplay(true);
              }}
            >
              <IconPlayerPlay />
              <span>{t(`assembly.videoChapters.${chapter.key}`)}</span>
              <span className="font-mono text-foreground/70">
                {formatVideoTimestamp(chapter.startSeconds)}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
