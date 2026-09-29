// Render the edit in the browser: decode the kept segments of the original
// with WebCodecs, shift their timestamps together, optionally paint the
// subtitles into the picture, and re-encode.
// MP4 (H.264/AAC) where the browser can encode it, otherwise WebM (VP9/Opus).

import { CaptionPainter, loadCaptionFont } from "./burn";
import type { Segment } from "./cuts";

export type Rendered = { blob: Blob; extension: string };

export type RenderOptions = {
  /** Caption lines to burn in at a time of the original, or null for none. */
  captionAt?: (time: number) => readonly string[] | null;
};

export async function renderCut(
  file: Blob,
  segments: readonly Segment[],
  onProgress: (fraction: number) => void,
  options: RenderOptions = {},
): Promise<Rendered> {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const videoTrack = await input.getPrimaryVideoTrack();
  const audioTrack = await input.getPrimaryAudioTrack();
  if (!videoTrack && !audioTrack) throw new Error("no audio or video track");
  if ((videoTrack && !(await videoTrack.canDecode())) || (audioTrack && !(await audioTrack.canDecode()))) {
    throw new Error("the browser can't decode this file");
  }

  // Burning captions means drawing each frame upright on a canvas, so the output
  // is encoded at the display size with no rotation flag.
  const captionAt = videoTrack ? options.captionAt : undefined;
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const painter = videoTrack && captionAt ? new CaptionPainter(even(videoTrack.displayWidth), even(videoTrack.displayHeight)) : null;
  if (painter) await loadCaptionFont();
  const size = videoTrack
    ? painter
      ? { width: painter.width, height: painter.height }
      : { width: videoTrack.codedWidth, height: videoTrack.codedHeight }
    : null;

  // The first container this browser can fill with codecs it can encode.
  const formats = [new mb.Mp4OutputFormat({ fastStart: "in-memory" }), new mb.WebMOutputFormat()];
  let chosen: { format: (typeof formats)[number]; video: string | null; audio: string | null } | null = null;
  for (const format of formats) {
    const video = size ? await mb.getFirstEncodableVideoCodec(format.getSupportedVideoCodecs(), size) : null;
    const audio = audioTrack
      ? await mb.getFirstEncodableAudioCodec(format.getSupportedAudioCodecs(), {
          numberOfChannels: audioTrack.numberOfChannels,
          sampleRate: audioTrack.sampleRate,
        })
      : null;
    if ((!videoTrack || video) && (!audioTrack || audio)) {
      chosen = { format, video, audio };
      break;
    }
  }
  if (!chosen) throw new Error("the browser can't encode video here");

  const target = new mb.BufferTarget();
  const output = new mb.Output({ format: chosen.format, target });
  const videoSource = videoTrack
    ? new mb.VideoSampleSource({ codec: chosen.video as never, bitrate: mb.QUALITY_HIGH })
    : null;
  const audioSource = audioTrack
    ? new mb.AudioSampleSource({ codec: chosen.audio as never, bitrate: mb.QUALITY_HIGH })
    : null;
  if (videoSource && videoTrack) output.addVideoTrack(videoSource, { rotation: painter ? 0 : videoTrack.rotation });
  if (audioSource) output.addAudioTrack(audioSource);
  await output.start();

  const videoSink = videoTrack ? new mb.VideoSampleSink(videoTrack) : null;
  const audioSink = audioTrack ? new mb.AudioSampleSink(audioTrack) : null;
  const total = segments.reduce((sum, s) => sum + (s.end - s.start), 0) || 1;
  let offset = 0;
  for (const segment of segments) {
    // Segment by segment keeps the two tracks roughly interleaved.
    if (videoSink && videoSource) {
      for await (const sample of videoSink.samples(segment.start, segment.end)) {
        const time = sample.timestamp;
        const timestamp = offset + Math.max(0, time - segment.start);
        if (painter && captionAt) {
          const canvas = painter.paint((ctx) => sample.drawWithFit(ctx, { fit: "fill" }), captionAt(time));
          const painted = new mb.VideoSample(canvas, { timestamp, duration: sample.duration });
          await videoSource.add(painted);
          painted.close();
        } else {
          sample.setTimestamp(timestamp);
          await videoSource.add(sample);
        }
        onProgress(Math.min(1, (offset + time - segment.start) / total));
        sample.close();
      }
    }
    if (audioSink && audioSource) {
      for await (const sample of audioSink.samples(segment.start, segment.end)) {
        // Audio packets straddle the cut points by a few ms; drop the leading
        // one rather than overlap the previous segment.
        if (sample.timestamp < segment.start - 0.001 && offset > 0) {
          sample.close();
          continue;
        }
        sample.setTimestamp(offset + Math.max(0, sample.timestamp - segment.start));
        await audioSource.add(sample);
        sample.close();
      }
    }
    offset += segment.end - segment.start;
  }
  await output.finalize();
  onProgress(1);
  return {
    blob: new Blob([target.buffer!], { type: chosen.format.mimeType }),
    extension: chosen.format.fileExtension.replace(/^\./, ""),
  };
}
