// Jump cuts from word timestamps: keep the speech, drop the pauses between
// words (and, optionally, filler words), and map times onto the shorter edit.

import type { Cue, Word } from "./subtitles";

export type Segment = { start: number; end: number };

export type CutOptions = {
  /** Silences at least this long (seconds) are cut. */
  minPause: number;
  /** Air kept around the speech on each side of a cut, in seconds. */
  pad: number;
  /** Also cut filler words ("ehm", "uhm", "hmm"…). */
  fillers: boolean;
};

export const DEFAULT_CUT_OPTIONS: CutOptions = { minPause: 0.7, pad: 0.12, fillers: false };

/** Hesitations in the 25 languages Voz writes: ehm, uhm, hmm, äh, euh… */
const FILLER = /^(e+h+m*|e{2,}m*|u+h+m*|u+m+|a+h+m*|ä+h+m*|ö+h+m*|h+m+|m+h+m+|m{2,}|euh+)$/i;

export function isFiller(text: string): boolean {
  return FILLER.test(text.trim().replace(/[.,;:!?…"“”«»()]/g, ""));
}

/** The parts of the recording to keep, in order and not overlapping. */
export function keepSegments(words: readonly Word[], duration: number, options: Partial<CutOptions> = {}): Segment[] {
  const o = { ...DEFAULT_CUT_OPTIONS, ...options };
  const speech = words.filter((w) => w.text.trim() && !(o.fillers && isFiller(w.text)));
  if (!speech.length || duration <= 0) return [{ start: 0, end: Math.max(0, duration) }];

  const segments: Segment[] = [];
  // Silence before the first word counts as a pause too.
  let start = speech[0].start >= o.minPause ? speech[0].start - o.pad : 0;
  let end = speech[0].end;
  for (const word of speech.slice(1)) {
    // A pause is measured between kept words, so a removed filler leaves a gap.
    if (word.start - end >= o.minPause) {
      segments.push({ start, end: end + o.pad });
      start = word.start - o.pad;
    }
    end = Math.max(end, word.end);
  }
  segments.push({ start, end: duration - end >= o.minPause ? end + o.pad : duration });

  return segments
    .map((s) => ({ start: Math.max(0, s.start), end: Math.min(duration, s.end) }))
    .filter((s) => s.end - s.start > 0.01);
}

export function keptDuration(segments: readonly Segment[]): number {
  return segments.reduce((sum, s) => sum + (s.end - s.start), 0);
}

/** Where time `t` of the original lands in the cut edit; a cut moment maps to the join. */
export function mapTime(t: number, segments: readonly Segment[]): number {
  return segments.reduce((sum, s) => sum + Math.min(Math.max(t - s.start, 0), s.end - s.start), 0);
}

/** The segment that contains `t`, or the first one after it; -1 past the end. */
export function segmentAt(t: number, segments: readonly Segment[]): number {
  return segments.findIndex((s) => t < s.end);
}

/** Subtitles for the cut edit: times mapped, cues that fell in a cut dropped. */
export function retimeCues(cues: readonly Cue[], segments: readonly Segment[]): Cue[] {
  return cues
    .map((c) => ({ ...c, start: mapTime(c.start, segments), end: mapTime(c.end, segments) }))
    .filter((c) => c.end - c.start >= 0.05);
}
