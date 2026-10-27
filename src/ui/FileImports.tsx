import type { RefObject } from "react";
import { importPhotos } from "../media/photos";
import { importPodcasts } from "../media/podcasts";
type InputRef = RefObject<HTMLInputElement | null>;
export function FileImports({
  audio,
  photos,
  podcasts,
  texts,
  locked,
  onAudio,
  onPhotos,
  onPodcasts,
  onTexts,
}: {
  audio: InputRef;
  photos: InputRef;
  podcasts: InputRef;
  texts: InputRef;
  locked: boolean;
  onAudio: (files: File[]) => void;
  onPhotos: (result: { added: number; persisted: boolean }) => void;
  onPodcasts: (persisted: boolean) => void;
  onTexts: (files: File[]) => void;
}) {
  return (
    <>
      <input
        ref={texts}
        id="text-files"
        className="sr-only"
        type="file"
        accept=".txt,.md,.text,text/plain,text/markdown"
        multiple
        aria-label="选择文本文件"
        disabled={locked}
        onChange={(event) => {
          if (!locked) onTexts(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <input
        ref={audio}
        id="audio-files"
        className="sr-only"
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus,.aiff,.lrc"
        multiple
        aria-label="选择本地音频或歌词文件"
        disabled={locked}
        onChange={(event) => {
          if (!locked) onAudio(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <input
        ref={photos}
        id="photo-files"
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp"
        multiple
        aria-label="选择照片文件"
        disabled={locked}
        onChange={(event) => {
          if (!locked)
            void importPhotos(Array.from(event.target.files ?? [])).then(
              onPhotos,
            );
          event.target.value = "";
        }}
      />
      <input
        ref={podcasts}
        id="podcast-files"
        className="sr-only"
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac"
        multiple
        aria-label="选择播客文件"
        disabled={locked}
        onChange={(event) => {
          if (!locked)
            onPodcasts(
              importPodcasts(Array.from(event.target.files ?? [])).persisted,
            );
          event.target.value = "";
        }}
      />
    </>
  );
}
