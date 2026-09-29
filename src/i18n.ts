export type Language = "it" | "en";

const it = {
  pageTitle: "Onda: sottotitoli per video e audio",
  pageDescription: "Onda: sottotitoli, trascrizioni e tagli delle pause per video e audio, nel browser e senza cloud.",
  brandSubtitle: "Sottotitoli, trascrizioni e tagli delle pause per video e audio. Niente cloud: tutto resta sul tuo dispositivo.",
  dropTitle: "Trascina qui un video o un audio",
  dropSubtitle: "oppure clicca per sceglierlo (MP4, MOV, WebM, MKV, MP3, WAV, M4A…)",
  featSubs: "💬 Sottotitoli SRT/VTT modificabili",
  featCut: "✂️ Taglia le pause e gli ehm dal video",
  featLang: "🌍 Riconosce la lingua parlata",
  featClean: "🧼 Pulizia della voce con Soap",
  themeToggle: "Tema chiaro o scuro",
  recordMic: "● Registra dal microfono",
  recordStop: "■ Ferma registrazione",
  recordPrefix: "registrazione",
  micError: "Microfono non disponibile o permesso negato.",
  decoding: "Leggo l'audio…",
  decodeError: "Il browser non riesce a leggere l'audio di questo file.",
  playBtn: "▶ Play",
  pauseBtn: "❚❚ Pausa",
  replaceBtn: "Cambia file",
  sectionTranscribe: "Trascrivi",
  cleanLabel: "Pulisci la voce con Soap prima",
  cleanHelp: "Toglie rumore e riverbero: aiuta con registrazioni sporche.",
  labelLineLength: "Righe dei sottotitoli",
  lineTv: "Standard · 42 caratteri",
  lineSocial: "Social verticali · 32 caratteri",
  txButton: "Crea i sottotitoli",
  txButtonBusy: "Ci lavoro…",
  txAnyway: "Trascrivi comunque",
  txHelp: "Ear riconosce la lingua parlata, Voz trascrive 25 lingue europee (italiano e inglese compresi). Al primo uso scarica i modelli (circa 400 MB), poi restano in cache. Dopo la trascrizione compare il pannello per tagliare le pause.",
  stepEar: "Riconosco la lingua…",
  stepClean: "Pulisco la voce…",
  stepVoz: "Carico Voz…",
  downloading: (model: string, pct: number) => `Scarico ${model}… ${pct}%`,
  transcribing: (pct: number) => `Trascrivo… ${pct}%`,
  langDetected: (name: string, pct: number) => `${name} · ${pct}%`,
  langUncertain: "Lingua incerta: controlla la trascrizione.",
  langUnsupported: (name: string) => `Voz non trascrive ${name}: il risultato non avrebbe senso.`,
  langSupported: "Supportata da Voz.",
  txError: "Qualcosa è andato storto:",
  errorOffline: "Download dei modelli non riuscito: controlla la connessione (servono huggingface.co).",
  sectionCues: "Sottotitoli",
  cuesHint: "Clicca un tempo per saltare lì. Correggi il testo direttamente: sottotitoli ed export si aggiornano subito.",
  txStats: (cues: number, words: number, rtf: string) => `${cues} sottotitoli · ${words} parole · ${rtf}× tempo reale`,
  txEmpty: "Nessuna parola riconosciuta.",
  confirmRegroup: "Rigenerare i sottotitoli con la nuova lunghezza? Le correzioni fatte a mano andranno perse.",
  sectionCut: "Taglia le pause",
  labelMinPause: "Taglia le pause più lunghe di",
  cutFillers: "Togli anche ehm, uhm, hmm…",
  cutFillersHelp: "Quando Voz li ha trascritti.",
  cutPreview: "Anteprima senza pause",
  cutPreviewHelp: "Il player salta le parti tagliate, segnate sulla timeline.",
  cutSubs: "Sottotitoli per la versione senza pause",
  cutSubsHelp: "Gli export SRT/VTT seguono i tempi del video tagliato.",
  cutNone: "Nessuna pausa da tagliare con questa soglia.",
  cutStats: (cuts: number, before: string, after: string, pct: number) => `${cuts} ${cuts === 1 ? "taglio" : "tagli"} · ${before} → ${after} (−${pct}%)`,
  renderVideo: "Scarica il video senza pause",
  renderAudio: "Scarica l'audio senza pause",
  rendering: (pct: number) => `Monto la versione senza pause… ${pct}%`,
  renderDone: (name: string) => `Pronto: ${name}`,
  renderError: "Il montaggio non è riuscito:",
  downloadAgain: "Scarica di nuovo",
  cutSuffix: "senza-pause",
  dlSrt: "Scarica SRT",
  dlVtt: "WebVTT",
  dlTxt: "Testo",
  footDev: '<strong>Onda</strong> · Sviluppato da <a href="https://scobrudot.dev" target="_blank" rel="noopener"><strong>scobru</strong> (Francesco Bruno)</a>',
  footRepo: "Repository GitHub",
  footSoap: "Soap: pulizia della voce",
  footCredits:
    'Riconoscimento della lingua con <a href="https://desertant.com/models/ear/" target="_blank" rel="noopener">Ear</a>, trascrizione con <a href="https://desertant.com/models/voz/" target="_blank" rel="noopener">Voz</a> e pulizia della voce con <a href="https://desertant.com/models/clear/" target="_blank" rel="noopener">Clear</a> di Desert Ant Labs, sotto la <a href="https://license.desertant.com/1.0" target="_blank" rel="noopener">Desert Ant Labs Source-Available License</a>. I modelli vengono scaricati da Hugging Face al primo uso e poi restano in cache; video e audio non lasciano mai il tuo dispositivo.',
};

export type Translations = typeof it;

const en: Translations = {
  pageTitle: "Onda: subtitles for video and audio",
  pageDescription: "Onda: subtitles, transcripts and pause cutting for video and audio, in the browser and without the cloud.",
  brandSubtitle: "Subtitles, transcripts and pause cutting for video and audio. No cloud: everything stays on your device.",
  dropTitle: "Drop a video or an audio file here",
  dropSubtitle: "or click to pick one (MP4, MOV, WebM, MKV, MP3, WAV, M4A…)",
  featSubs: "💬 Editable SRT/VTT subtitles",
  featCut: "✂️ Cut the pauses and the ums out of the video",
  featLang: "🌍 Recognizes the spoken language",
  featClean: "🧼 Voice cleanup with Soap",
  themeToggle: "Light or dark theme",
  recordMic: "● Record from the microphone",
  recordStop: "■ Stop recording",
  recordPrefix: "recording",
  micError: "Microphone unavailable or permission denied.",
  decoding: "Reading the audio…",
  decodeError: "The browser can't read the audio of this file.",
  playBtn: "▶ Play",
  pauseBtn: "❚❚ Pause",
  replaceBtn: "Change file",
  sectionTranscribe: "Transcribe",
  cleanLabel: "Clean up the voice with Soap first",
  cleanHelp: "Removes noise and reverb: helps with rough recordings.",
  labelLineLength: "Subtitle lines",
  lineTv: "Standard · 42 characters",
  lineSocial: "Vertical social · 32 characters",
  txButton: "Create subtitles",
  txButtonBusy: "Working…",
  txAnyway: "Transcribe anyway",
  txHelp: "Ear recognizes the spoken language, Voz transcribes 25 European languages (English and Italian among them). The first time it downloads the models (about 400 MB), then keeps them cached. Once transcribed, a panel to cut the pauses appears.",
  stepEar: "Recognizing the language…",
  stepClean: "Cleaning up the voice…",
  stepVoz: "Loading Voz…",
  downloading: (model: string, pct: number) => `Downloading ${model}… ${pct}%`,
  transcribing: (pct: number) => `Transcribing… ${pct}%`,
  langDetected: (name: string, pct: number) => `${name} · ${pct}%`,
  langUncertain: "Uncertain language: check the transcript.",
  langUnsupported: (name: string) => `Voz doesn't transcribe ${name}: the result would be nonsense.`,
  langSupported: "Supported by Voz.",
  txError: "Something went wrong:",
  errorOffline: "Couldn't download the models: check your connection (huggingface.co is needed).",
  sectionCues: "Subtitles",
  cuesHint: "Click a time to jump there. Fix the text right here: the captions and the exports update as you type.",
  txStats: (cues: number, words: number, rtf: string) => `${cues} subtitles · ${words} words · ${rtf}× realtime`,
  txEmpty: "No words recognized.",
  confirmRegroup: "Regenerate the subtitles with the new length? Your manual edits will be lost.",
  sectionCut: "Cut the pauses",
  labelMinPause: "Cut pauses longer than",
  cutFillers: "Also remove uh, um, hmm…",
  cutFillersHelp: "When Voz has transcribed them.",
  cutPreview: "Preview without pauses",
  cutPreviewHelp: "The player skips the cut parts, marked on the timeline.",
  cutSubs: "Subtitles for the cut version",
  cutSubsHelp: "SRT/VTT exports follow the timing of the cut video.",
  cutNone: "No pauses to cut at this threshold.",
  cutStats: (cuts: number, before: string, after: string, pct: number) => `${cuts} ${cuts === 1 ? "cut" : "cuts"} · ${before} → ${after} (−${pct}%)`,
  renderVideo: "Download the video without pauses",
  renderAudio: "Download the audio without pauses",
  rendering: (pct: number) => `Editing the version without pauses… ${pct}%`,
  renderDone: (name: string) => `Ready: ${name}`,
  renderError: "Editing failed:",
  downloadAgain: "Download again",
  cutSuffix: "no-pauses",
  dlSrt: "Download SRT",
  dlVtt: "WebVTT",
  dlTxt: "Text",
  footDev: '<strong>Onda</strong> · Developed by <a href="https://scobrudot.dev" target="_blank" rel="noopener"><strong>scobru</strong> (Francesco Bruno)</a>',
  footRepo: "GitHub Repository",
  footSoap: "Soap: voice cleanup",
  footCredits:
    'Language identification by <a href="https://desertant.com/models/ear/" target="_blank" rel="noopener">Ear</a>, speech recognition by <a href="https://desertant.com/models/voz/" target="_blank" rel="noopener">Voz</a> and voice cleanup by <a href="https://desertant.com/models/clear/" target="_blank" rel="noopener">Clear</a> from Desert Ant Labs, under the <a href="https://license.desertant.com/1.0" target="_blank" rel="noopener">Desert Ant Labs Source-Available License</a>. Models are downloaded from Hugging Face on first use and cached; video and audio never leave your device.',
};

const dict: Record<Language, Translations> = { it, en };

const STORAGE_KEY = "onda-lang";

export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "it" || saved === "en") return saved;
  } catch {}
  return (navigator.language || "").toLowerCase().startsWith("it") ? "it" : "en";
}

let currentLanguage: Language = getInitialLanguage();
const listeners: Array<(lang: Language) => void> = [];

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function t<K extends keyof Translations>(key: K): Translations[K] {
  return dict[currentLanguage][key];
}

/** A language code (ISO 639) as a name in the interface language. */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames([currentLanguage], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function onLanguageChange(fn: (lang: Language) => void) {
  listeners.push(fn);
}

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
  applyLanguage(lang);
  for (const fn of listeners) fn(lang);
}

export function applyLanguage(lang: Language) {
  document.documentElement.setAttribute("lang", lang);
  document.title = dict[lang].pageTitle;
  document.querySelector('meta[name="description"]')?.setAttribute("content", dict[lang].pageDescription);
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const val = dict[lang][el.dataset.i18n as keyof Translations];
    if (typeof val === "string") el.textContent = val;
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const val = dict[lang][el.dataset.i18nTitle as keyof Translations];
    if (typeof val === "string") {
      el.title = val;
      el.setAttribute("aria-label", val);
    }
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    const val = dict[lang][el.dataset.i18nHtml as keyof Translations];
    if (typeof val === "string") el.innerHTML = val;
  });
  document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  });
}
