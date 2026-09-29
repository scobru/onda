// node --test --experimental-strip-types scripts/cuts.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { isFiller, keepSegments, keptDuration, mapTime, retimeCues, segmentAt } from "../src/cuts.ts";

const w = (text, start, end) => ({ text, start, end });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("long pauses are cut, short ones kept, with air around the speech", () => {
  const words = [w("one", 1.0, 1.4), w("two", 1.6, 2.0), w("three", 4.0, 4.5)];
  const segments = keepSegments(words, 6, { minPause: 0.7, pad: 0.1 });
  assert.equal(segments.length, 2);
  close(segments[0].start, 0.9); // leading second of silence cut
  close(segments[0].end, 2.1);
  close(segments[1].start, 3.9);
  close(segments[1].end, 4.6); // trailing 1.5 s cut
  close(keptDuration(segments), 1.9);
});

test("nothing to cut keeps the whole recording", () => {
  assert.deepEqual(keepSegments([], 5), [{ start: 0, end: 5 }]);
  const words = [w("a", 0.1, 0.5), w("b", 0.6, 4.8)];
  assert.deepEqual(keepSegments(words, 5, { minPause: 0.7 }), [{ start: 0, end: 5 }]);
});

test("filler words are cut when asked", () => {
  assert.ok(isFiller("Ehm,") && isFiller("uhm") && isFiller("hmm...") && isFiller("äh") && isFiller("euh"));
  assert.ok(!isFiller("hello") && !isFiller("um-brella") && !isFiller("em"));
  const words = [w("so", 0, 0.3), w("ehm", 0.5, 1.1), w("yes", 1.3, 1.6)];
  assert.equal(keepSegments(words, 1.6, { minPause: 0.7, pad: 0.1 }).length, 1);
  const cut = keepSegments(words, 1.6, { minPause: 0.7, pad: 0.1, fillers: true });
  assert.equal(cut.length, 2);
  close(cut[0].end, 0.4);
  close(cut[1].start, 1.2);
});

test("times map onto the cut edit", () => {
  const segments = [{ start: 1, end: 2 }, { start: 4, end: 5 }];
  close(mapTime(0.5, segments), 0);
  close(mapTime(1.5, segments), 0.5);
  close(mapTime(3, segments), 1); // inside a cut: the join
  close(mapTime(4.5, segments), 1.5);
  close(mapTime(9, segments), 2);
  assert.equal(segmentAt(0.5, segments), 0);
  assert.equal(segmentAt(3, segments), 1);
  assert.equal(segmentAt(6, segments), -1);
});

test("subtitles follow the cuts", () => {
  const segments = [{ start: 1, end: 2 }, { start: 4, end: 5 }];
  const cues = [
    { start: 1.2, end: 1.8, lines: ["a"] },
    { start: 2.2, end: 3.8, lines: ["gone"] },
    { start: 4.1, end: 4.9, lines: ["b"] },
  ];
  const out = retimeCues(cues, segments);
  assert.deepEqual(out.map((c) => c.lines[0]), ["a", "b"]);
  close(out[1].start, 1.1);
  close(out[1].end, 1.9);
});
