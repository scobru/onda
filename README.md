<p align="center"><img src="assets/onda-logo.svg" width="128" alt="Onda logo"></p>

<h1 align="center">Onda</h1>

<p align="center"><b>Voice, text and subtitles</b>: clean up, transcribe and subtitle recordings in the browser, entirely on your device.</p>

<p align="center"><img src="assets/screenshot-web.png" width="640" alt="Onda in the browser"></p>

Onda is a suite of voice tools built on the small on-device models from
[Desert Ant Labs](https://desertant.com). Nothing is uploaded: the models run in
your browser and are downloaded once from Hugging Face.

| Tool | Model | What it does |
|---|---|---|
| <img src="assets/soap-logo.svg" width="20" alt=""> **Soap** | [Clear](https://desertant.com/models/clear/) | Denoise, dereverb and loudness normalization |
| <img src="assets/onda-logo.svg" width="20" alt=""> **Transcript & subtitles** | [Voz](https://desertant.com/models/voz/) | Transcript with word timestamps in 25 languages, SRT/VTT/TXT export |

Soap is also a VST3/AU/CLAP plugin and a desktop app for Windows, macOS and
Linux: see [scobru/soap](https://github.com/scobru/soap).

## Use it

One page runs the whole flow:

1. **Source**: load any file the browser can decode, or record from the mic with the browser's DSP turned off.
2. **Clean up with Soap**: strength, LUFS target (Podcast −19, Streaming −14, EBU R128 −23, custom, off), true-peak ceiling, max gain, mono or stereo, 48/44.1 kHz, CPU or WebGPU.
3. **Compare**: waveforms, click-to-seek, A/B switching (`A`/`B` keys) that keeps the position; export WAV as 16-bit PCM or 32-bit float.
4. **Transcript and subtitles**: transcribe the clean (or original) version with Voz.
   - Every word is clickable and moves the player there, and the word being spoken is highlighted during playback.
   - Export SRT and WebVTT cues of at most two 42-character lines and 6 seconds, split at pauses and sentence ends ([`src/subtitles.ts`](src/subtitles.ts)), plus plain text in paragraphs.

The interface is in Italian and English; it follows the browser language and has a switch.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # subtitle cues and SRT/VTT/TXT
npm run build    # static site in dist/
```

- **Clear** runs on LiteRT.js (WebAssembly, or WebGPU on request). The runtime is served from your own origin (`scripts/copy-litert.mjs`). For its multi-threaded build the host must send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` (the Vite servers and `vercel.json` do).
- **Voz** runs on ONNX Runtime Web: WebGPU for the encoder, WebNN for the decode step where the browser has it, and the CPU on a machine without a usable GPU. ONNX Runtime is bundled by Vite and loaded only when you transcribe.
- **Model downloads**: Clear's weights and Voz's bundle (about 390 MB) come from Hugging Face on first use and stay in the browser's cache. `VITE_CLEAR_MODEL_BASE_URL` and `VITE_VOZ_MODEL_BASE_URL` serve them from elsewhere.
- **Voz's limits**: it doesn't detect the language it hears, and its accuracy varies by language. Italian is about 3% word error rate; see the [model card](https://huggingface.co/desert-ant-labs/voz).

## CI

`.github/workflows/ci.yml` runs the unit tests and the build, then drives the
production build in headless Chromium with the real models:

- a noisy file is cleaned by Clear;
- a spoken sentence synthesized with espeak-ng is cleaned, then transcribed by Voz;
- the test checks the recognized words and the SRT.

## Licenses

- **Clear** and **Voz** (models and SDKs) are under the [Desert Ant Labs Source-Available License](https://license.desertant.com/1.0). It's not an OSI open-source license:
  - Free up to 100,000 monthly active devices per platform, per model.
  - Desert Ant Labs must be credited (the page does).
  - You may not use the models or their outputs to train competing models.
  - The SDKs send Desert Ant Labs an active-device count, never the audio.
- The **Nunito** font is under the SIL Open Font License 1.1.
- The Onda and Soap logos and icons are part of this project.
