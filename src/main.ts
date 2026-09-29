import "@fontsource/nunito/600.css";
import "@fontsource/nunito/800.css";
import type { Clear } from "@desert-ant-labs/clear";
import type { Ear, Detection } from "@desert-ant-labs/ear";
import type { Voz } from "@desert-ant-labs/voz";
import { applyLanguage, getCurrentLanguage, languageName, onLanguageChange, setLanguage, t } from "./i18n";
import { keepSegments, keptDuration, retimeCues, segmentAt, type Segment } from "./cuts";
import { renderCut } from "./render";
import { cuesToText, toCues, toSrt, toVtt, type Cue, type Word } from "./subtitles";
import { initThemeToggle } from "./theme";
import { Waveform } from "./waveform";

/** The rate Ear and Voz listen at; decoding straight to it keeps memory low. */
const RATE = 16_000;

/** What Voz transcribes (Sources/Voz/Voz.swift `supportedLanguages`). */
const VOZ_LANGUAGES = new Set([
  "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hr", "hu", "it",
  "lt", "lv", "mt", "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "uk",
]);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  drop: $<HTMLLabelElement>("drop"),
  file: $<HTMLInputElement>("file"),
  stage: $("stage"),
  screen: $("screen"),
  video: $<HTMLVideoElement>("video"),
  audiogram: $("audiogram"),
  audioName: $("audio-name"),
  caption: $("caption"),
  timeline: $<HTMLCanvasElement>("timeline"),
  play: $<HTMLButtonElement>("play"),
  clock: $("clock"),
  sourceInfo: $("source-info"),
  replace: $<HTMLButtonElement>("replace"),
  recordRow: $("record-row"),
  record: $<HTMLButtonElement>("record"),
  recordTime: $("record-time"),
  langDetect: $("lang-detect"),
  langChip: $("lang-chip"),
  langNote: $("lang-note"),
  clean: $<HTMLInputElement>("clean"),
  lineLength: $<HTMLSelectElement>("line-length"),
  transcribe: $<HTMLButtonElement>("transcribe"),
  progress: $("progress"),
  progressBar: $("progress-bar"),
  status: $("status"),
  error: $("error"),
  cuesPanel: $("cues-panel"),
  cues: $<HTMLOListElement>("cues"),
  txStats: $("tx-stats"),
  dlSrt: $<HTMLAnchorElement>("dl-srt"),
  dlVtt: $<HTMLAnchorElement>("dl-vtt"),
  dlTxt: $<HTMLAnchorElement>("dl-txt"),
  cutPanel: $("cut-panel"),
  minPause: $<HTMLInputElement>("min-pause"),
  minPauseOut: $<HTMLOutputElement>("min-pause-out"),
  cutFillers: $<HTMLInputElement>("cut-fillers"),
  cutPreview: $<HTMLInputElement>("cut-preview"),
  cutSubs: $<HTMLInputElement>("cut-subs"),
  cutStats: $("cut-stats"),
  render: $<HTMLButtonElement>("render"),
  renderProgress: $("render-progress"),
  renderBar: $("render-bar"),
  renderStatus: $("render-status"),
  renderError: $("render-error"),
  dlCut: $<HTMLAnchorElement>("dl-cut"),
};

type Media = { name: string; url: string; blob: Blob; samples: Float32Array };

let media: Media | null = null;
let busy = false;
let detection: Detection | null = null;
/** The user chose to transcribe although Ear heard a language Voz lacks. */
let forceLanguage = false;
let words: Word[] = [];
let cues: Cue[] = [];
let edited = false;
let realtimeFactor = 0;
let activeCue = -1;
/** What the cut edit keeps; null until there is a transcript. */
let segments: Segment[] | null = null;
let rendering = false;
let renderUrl: string | null = null;
let isVideo = true;

// --- Models, each loaded on first use and kept -------------------------------

let ear: Promise<Ear> | null = null;
let voz: Promise<Voz> | null = null;
let clear: Promise<Clear> | null = null;
const litertWasmDir = () => new URL("litert/", document.baseURI).href;

function remember<T>(promise: Promise<T>, reset: () => void): Promise<T> {
  promise.catch(reset);
  return promise;
}

function getEar() {
  ear ??= remember(
    import("@desert-ant-labs/ear").then(({ Ear }) =>
      Ear.load({
        litertWasmDir: litertWasmDir(),
        modelBaseUrl: import.meta.env.VITE_EAR_MODEL_BASE_URL || undefined,
        onProgress: (f) => progress(t("downloading")("Ear", Math.round(f * 100)), f),
      }),
    ),
    () => (ear = null),
  );
  return ear;
}

function getVoz() {
  voz ??= remember(
    import("@desert-ant-labs/voz").then(({ Voz }) =>
      Voz.load({
        modelBaseUrl: import.meta.env.VITE_VOZ_MODEL_BASE_URL || undefined,
        onProgress: (f) => progress(t("downloading")("Voz", Math.round(f * 100)), f),
      }),
    ),
    () => (voz = null),
  );
  return voz;
}

function getClear() {
  clear ??= remember(
    import("@desert-ant-labs/clear").then(({ Clear }) =>
      Clear.load({
        accelerator: "wasm",
        litertWasmDir: litertWasmDir(),
        modelBaseUrl: import.meta.env.VITE_CLEAR_MODEL_BASE_URL || undefined,
        onProgress: (f) => progress(t("downloading")("Clear", Math.round(f * 100)), f),
      }),
    ),
    () => (clear = null),
  );
  return clear;
}

// --- Loading a file ----------------------------------------------------------

async function load(blob: Blob, name: string) {
  if (busy) return;
  showError(null);
  resetTranscript();
  detection = null;
  forceLanguage = false;
  ui.langDetect.hidden = true;
  ui.transcribe.textContent = t("txButton");
  if (media) URL.revokeObjectURL(media.url);
  media = null;
  refresh();

  ui.drop.hidden = true;
  ui.stage.hidden = false;
  ui.sourceInfo.textContent = t("decoding");
  const url = URL.createObjectURL(blob);
  ui.video.src = url;
  ui.audioName.textContent = name;
  try {
    // Decoding at 16 kHz mono: what the models want, and small for long videos.
    const ctx = new OfflineAudioContext(1, 1, RATE);
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const samples = new Float32Array(buffer.length);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const channel = buffer.getChannelData(c);
      for (let i = 0; i < samples.length; i++) samples[i] += channel[i] / buffer.numberOfChannels;
    }
    media = { name, url, blob, samples };
    timeline.setAudio([samples]);
    ui.sourceInfo.textContent = `${name} · ${formatTime(samples.length / RATE)}`;
  } catch (err) {
    URL.revokeObjectURL(url);
    ui.video.removeAttribute("src");
    ui.stage.hidden = true;
    ui.drop.hidden = false;
    showError(new Error(t("decodeError"), { cause: err }));
  }
  refresh();
}

ui.video.addEventListener("loadedmetadata", () => {
  // A .webm or .mp4 can carry audio only: show the audiogram card for those.
  isVideo = ui.video.videoWidth > 0;
  ui.screen.classList.toggle("audio-only", !isVideo);
  ui.audiogram.hidden = isVideo;
  ui.render.textContent = isVideo ? t("renderVideo") : t("renderAudio");
});

ui.file.addEventListener("change", () => {
  const f = ui.file.files?.[0];
  if (f) load(f, f.name);
  ui.file.value = "";
});
ui.replace.addEventListener("click", () => ui.file.click());

for (const type of ["dragenter", "dragover"]) {
  document.addEventListener(type, (e) => {
    e.preventDefault();
    ui.drop.classList.add("over");
  });
}
for (const type of ["dragleave", "drop"]) document.addEventListener(type, () => ui.drop.classList.remove("over"));
document.addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files[0];
  if (f) load(f, f.name);
});

let recorder: MediaRecorder | null = null;
ui.record.addEventListener("click", async () => {
  if (recorder) return recorder.stop();
  showError(null);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    recorder = rec;
    const started = performance.now();
    const timer = setInterval(() => (ui.recordTime.textContent = formatTime((performance.now() - started) / 1000)), 250);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      recorder = null;
      ui.record.textContent = t("recordMic");
      ui.record.classList.remove("recording");
      ui.recordTime.textContent = "";
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      load(new Blob(chunks, { type: rec.mimeType }), `${t("recordPrefix")}-${stamp}`);
    };
    rec.start();
    ui.record.textContent = t("recordStop");
    ui.record.classList.add("recording");
  } catch (err) {
    showError(new Error(t("micError"), { cause: err }));
  }
});

// --- Transcribing --------------------------------------------------------------

ui.transcribe.addEventListener("click", async () => {
  if (!media || busy) return;
  busy = true;
  refresh();
  showError(null);
  ui.transcribe.textContent = t("txButtonBusy");
  const { samples } = media;
  try {
    if (!detection) {
      progress(t("stepEar"), null);
      detection = await (await getEar()).identify(samples, RATE);
      showDetection();
    }
    const heard = detection.language;
    if (detection.isReliable && heard && !VOZ_LANGUAGES.has(heard) && !forceLanguage) {
      // Stop here: Voz would return confident nonsense. A second click goes ahead.
      forceLanguage = true;
      return;
    }

    let input: { samples: Float32Array; sampleRate: number } = { samples, sampleRate: RATE };
    if (ui.clean.checked) {
      progress(t("stepClean"), null);
      const model = await getClear();
      progress(t("stepClean"), null);
      const cleaned = await model.enhance(samples, RATE, { targetLUFS: null, channelMode: "mono" });
      input = { samples: cleaned.channels[0], sampleRate: cleaned.sampleRate };
    }

    progress(t("stepVoz"), null);
    const model = await getVoz();
    progress(t("transcribing")(0), 0);
    const result = await model.transcribe(input, {
      onProgress: (f) => progress(t("transcribing")(Math.round(f * 100)), f),
    });
    words = result.words;
    realtimeFactor = result.realtimeFactor;
    cues = toCues(words, { lineChars: Number(ui.lineLength.value) });
    edited = false;
    renderCues();
    updateCuts();
  } catch (err) {
    const offline = /download failed|Failed to fetch|NetworkError/i.test(String(err));
    showError(offline ? new Error(t("errorOffline"), { cause: err }) : err);
  } finally {
    busy = false;
    ui.progress.hidden = true;
    ui.status.hidden = true;
    ui.transcribe.textContent = forceLanguage && !cues.length ? t("txAnyway") : t("txButton");
    refresh();
  }
});

function showDetection() {
  if (!detection?.language) {
    ui.langDetect.hidden = true;
    return;
  }
  const name = languageName(detection.language);
  ui.langChip.textContent = t("langDetected")(name, Math.round(detection.confidence * 100));
  const supported = VOZ_LANGUAGES.has(detection.language);
  ui.langChip.dataset.state = !supported ? "bad" : detection.isReliable ? "ok" : "warn";
  ui.langNote.textContent = !supported
    ? t("langUnsupported")(name)
    : detection.isReliable ? t("langSupported") : t("langUncertain");
  ui.langDetect.hidden = false;
}

ui.lineLength.addEventListener("change", () => {
  if (!words.length) return;
  if (edited && !confirm(t("confirmRegroup"))) return;
  cues = toCues(words, { lineChars: Number(ui.lineLength.value) });
  edited = false;
  renderCues();
});

// --- Subtitle editor -----------------------------------------------------------

function renderCues() {
  ui.cues.replaceChildren();
  activeCue = -1;
  if (!cues.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = t("txEmpty");
    ui.cues.append(empty);
  }
  cues.forEach((cue, i) => {
    const li = document.createElement("li");
    li.className = "cue";
    const time = document.createElement("button");
    time.type = "button";
    time.className = "cue-time";
    time.textContent = `${formatTime(cue.start, true)} → ${formatTime(cue.end, true)}`;
    time.addEventListener("click", () => {
      ui.video.currentTime = cue.start + 0.01;
      void ui.video.play();
    });
    const text = document.createElement("textarea");
    text.className = "cue-text";
    text.rows = 2;
    text.value = cue.lines.join("\n");
    text.spellcheck = true;
    text.lang = detection?.language ?? "";
    text.addEventListener("input", () => {
      fitHeight(text);
      cues[i] = { ...cues[i], lines: text.value.split("\n").map((l) => l.trim()).filter(Boolean) };
      edited = true;
      scheduleExports();
      updateCaption(true);
    });
    li.append(time, text);
    ui.cues.append(li);
    fitHeight(text);
  });
  ui.txStats.textContent = t("txStats")(cues.length, words.length, realtimeFactor.toFixed(0));
  ui.cuesPanel.hidden = false;
  updateExports();
  updateCaption(true);
}

/** Grow a cue's text box to its content, so wrapped lines stay visible. */
function fitHeight(text: HTMLTextAreaElement) {
  text.style.height = "auto";
  text.style.height = `${text.scrollHeight + 2}px`;
}

let exportUrls: string[] = [];
let exportTimer = 0;
function scheduleExports() {
  clearTimeout(exportTimer);
  exportTimer = window.setTimeout(updateExports, 250);
}

function updateExports() {
  exportUrls.forEach((url) => URL.revokeObjectURL(url));
  exportUrls = [];
  const base = (media?.name ?? "onda").replace(/\.[^.]+$/, "");
  const set = (link: HTMLAnchorElement, text: string, ext: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    exportUrls.push(url);
    link.href = url;
    link.download = `${base}.${ext}`;
  };
  // Timed for the cut edit when that's what the user will publish.
  const timed = segments && ui.cutSubs.checked && hasCuts() ? retimeCues(cues, segments) : cues;
  set(ui.dlSrt, toSrt(timed), "srt", "application/x-subrip");
  set(ui.dlVtt, toVtt(timed), "vtt", "text/vtt");
  set(ui.dlTxt, cuesToText(cues), "txt", "text/plain");
}

function resetTranscript() {
  words = [];
  cues = [];
  edited = false;
  activeCue = -1;
  ui.cues.replaceChildren();
  ui.cuesPanel.hidden = true;
  ui.caption.textContent = "";
  ui.caption.hidden = true;
  segments = null;
  ui.cutPanel.hidden = true;
  timeline.setCuts([]);
  ui.renderError.hidden = true;
  ui.renderStatus.hidden = true;
  ui.dlCut.hidden = true;
  if (renderUrl) URL.revokeObjectURL(renderUrl);
  renderUrl = null;
}

// --- Player --------------------------------------------------------------------

const timeline = new Waveform(
  ui.timeline,
  () => getComputedStyle(document.documentElement).getPropertyValue("--accent"),
  (fraction) => {
    if (ui.video.duration) ui.video.currentTime = fraction * ui.video.duration;
  },
);
initThemeToggle($<HTMLButtonElement>("theme-toggle"), () => timeline.draw());

ui.play.addEventListener("click", () => (ui.video.paused ? void ui.video.play() : ui.video.pause()));
ui.screen.addEventListener("click", (e) => {
  if (e.target === ui.video || e.target === ui.audiogram || ui.audiogram.contains(e.target as Node)) ui.play.click();
});
for (const type of ["play", "pause", "seeked", "timeupdate"]) ui.video.addEventListener(type, () => tickPlayer());

document.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  if (target.matches("input, select, textarea, button") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === "Space" && media) {
    e.preventDefault();
    ui.play.click();
  }
});

function tickPlayer() {
  skipCuts();
  const time = ui.video.currentTime;
  const duration = ui.video.duration || 0;
  ui.play.textContent = ui.video.paused ? t("playBtn") : t("pauseBtn");
  ui.clock.textContent = `${formatTime(time)} / ${formatTime(duration)}`;
  timeline.setProgress(duration ? time / duration : 0);
  updateCaption(false);
}

function frame() {
  if (!ui.video.paused) tickPlayer();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/** Show the cue under the playhead over the video, and mark it in the editor. */
function updateCaption(force: boolean) {
  const time = ui.video.currentTime;
  const index = cues.findIndex((c) => time >= c.start && time < c.end);
  if (index === activeCue && !force) return;
  const items = ui.cues.querySelectorAll<HTMLLIElement>(".cue");
  items[activeCue]?.classList.remove("now");
  activeCue = index;
  const cue = cues[index];
  ui.caption.textContent = cue ? cue.lines.join("\n") : "";
  ui.caption.hidden = !cue;
  const item = items[index];
  if (!item) return;
  item.classList.add("now");
  // Follow playback in the list, unless the user is typing in it.
  if (!ui.video.paused && !ui.cues.contains(document.activeElement)) {
    const top = item.offsetTop - ui.cues.offsetTop;
    if (top < ui.cues.scrollTop || top > ui.cues.scrollTop + ui.cues.clientHeight - item.clientHeight) {
      ui.cues.scrollTo({ top: top - ui.cues.clientHeight / 3, behavior: "smooth" });
    }
  }
}

// --- Cutting the pauses ----------------------------------------------------------

function hasCuts() {
  return !!segments && !!media && keptDuration(segments) < media.samples.length / RATE - 0.05;
}

function updateCuts() {
  if (!media || !words.length) return;
  const duration = media.samples.length / RATE;
  const minPause = Number(ui.minPause.value);
  ui.minPauseOut.textContent = `${minPause.toLocaleString(getCurrentLanguage(), { minimumFractionDigits: 1 })} s`;
  segments = keepSegments(words, duration, { minPause, fillers: ui.cutFillers.checked });

  // The complement, for the timeline and the count.
  const removed: [number, number][] = [];
  let at = 0;
  for (const s of segments) {
    if (s.start - at > 0.01) removed.push([at / duration, s.start / duration]);
    at = s.end;
  }
  if (duration - at > 0.01) removed.push([at / duration, 1]);
  timeline.setCuts(ui.cutPreview.checked ? removed : []);

  const kept = keptDuration(segments);
  ui.cutStats.textContent = removed.length
    ? t("cutStats")(removed.length, formatTime(duration), formatTime(kept), Math.round((1 - kept / duration) * 100))
    : t("cutNone");
  ui.cutPanel.hidden = false;
  refresh();
  updateExports();
}

/** In the preview, jump over what the cut edit leaves out. */
function skipCuts() {
  if (!segments || !ui.cutPreview.checked || ui.video.paused || !hasCuts()) return;
  const time = ui.video.currentTime;
  const next = segmentAt(time, segments);
  if (next === -1) {
    ui.video.pause();
  } else if (time < segments[next].start - 0.03) {
    ui.video.currentTime = segments[next].start;
  }
}

for (const input of [ui.minPause, ui.cutFillers, ui.cutPreview]) input.addEventListener("input", updateCuts);
ui.cutSubs.addEventListener("change", updateExports);

ui.render.addEventListener("click", async () => {
  if (!media || !segments || rendering) return;
  rendering = true;
  refresh();
  ui.renderError.hidden = true;
  ui.renderProgress.hidden = false;
  ui.renderStatus.hidden = false;
  const show = (f: number) => {
    ui.renderStatus.textContent = t("rendering")(Math.round(f * 100));
    ui.renderBar.style.width = `${Math.round(f * 100)}%`;
  };
  show(0);
  try {
    const { blob, extension } = await renderCut(media.blob, segments, show);
    if (renderUrl) URL.revokeObjectURL(renderUrl);
    renderUrl = URL.createObjectURL(blob);
    const name = `${media.name.replace(/\.[^.]+$/, "")}-${t("cutSuffix")}.${extension}`;
    ui.dlCut.href = renderUrl;
    ui.dlCut.download = name;
    ui.dlCut.hidden = false;
    ui.renderStatus.textContent = t("renderDone")(name);
    ui.dlCut.click();
  } catch (err) {
    console.error(err);
    ui.renderStatus.hidden = true;
    ui.renderError.textContent = `${t("renderError")} ${err instanceof Error ? err.message : String(err)}`;
    ui.renderError.hidden = false;
  } finally {
    rendering = false;
    ui.renderProgress.hidden = true;
    refresh();
  }
});

// --- Helpers -------------------------------------------------------------------

function refresh() {
  ui.transcribe.disabled = !media || busy;
  ui.record.disabled = busy;
  ui.replace.disabled = busy;
  ui.clean.disabled = busy;
  ui.recordRow.hidden = !!media;
  ui.render.disabled = !segments || !hasCuts() || rendering || busy;
  ui.replace.disabled = busy || rendering;
}

function progress(text: string, fraction: number | null) {
  ui.status.textContent = text;
  ui.status.hidden = false;
  ui.progress.hidden = false;
  ui.progress.classList.toggle("indeterminate", fraction === null);
  ui.progressBar.style.width = fraction === null ? "" : `${Math.round(fraction * 100)}%`;
}

function showError(err: unknown) {
  if (err == null) {
    ui.error.hidden = true;
    return;
  }
  console.error(err);
  const message = err instanceof Error ? err.message : String(err);
  ui.error.textContent = `${t("txError")} ${message.split("\n")[0]}`;
  ui.error.hidden = false;
}

function formatTime(seconds: number, tenths = false) {
  const s = Math.max(0, seconds);
  const whole = Math.floor(s);
  const base = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  return tenths ? `${base}.${Math.floor((s - whole) * 10)}` : base;
}

// --- Language switch -----------------------------------------------------------

document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang as "it" | "en"));
});
onLanguageChange(() => {
  ui.transcribe.textContent = busy ? t("txButtonBusy") : forceLanguage && !cues.length ? t("txAnyway") : t("txButton");
  ui.record.textContent = recorder ? t("recordStop") : t("recordMic");
  if (media) ui.sourceInfo.textContent = `${media.name} · ${formatTime(media.samples.length / RATE)}`;
  if (detection) showDetection();
  if (cues.length) ui.txStats.textContent = t("txStats")(cues.length, words.length, realtimeFactor.toFixed(0));
  ui.render.textContent = isVideo ? t("renderVideo") : t("renderAudio");
  if (segments) updateCuts();
  tickPlayer();
});

applyLanguage(getCurrentLanguage());
refresh();
