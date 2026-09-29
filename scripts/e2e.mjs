// End-to-end check against the real models: serve the production build, load
// a video with speech, clean it with Clear, identify the language with Ear,
// transcribe it with Voz, edit a subtitle and check the exports follow, then
// cut the pauses and check the rendered video is shorter and carries the
// subtitles in the picture.
// Usage: node scripts/e2e.mjs <video-with-speech> [expected-language]   (after `npm run build`)
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const [input, expectedLanguage = "en"] = process.argv.slice(2);
if (!input) throw new Error("usage: node scripts/e2e.mjs <video-with-speech> [expected-language]");

const server = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: "inherit" });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ locale: "en-US" });
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  for (let i = 0; ; i++) {
    try {
      await page.goto("http://localhost:4173/");
      break;
    } catch (e) {
      if (i > 30) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  await page.setInputFiles("#file", input);
  await page.waitForFunction(() => !document.getElementById("transcribe").disabled, null, { timeout: 60_000 });
  const isVideo = await page.evaluate(() => document.getElementById("video").videoWidth > 0);
  console.log(`loaded: ${await page.textContent("#source-info")} (video: ${isVideo})`);

  await page.check("#clean");
  await page.click("#transcribe");
  // First run downloads Ear, Clear and Voz (~400 MB); Voz runs on the CPU here.
  await page.waitForFunction(
    () => !document.getElementById("cues-panel").hidden || !document.getElementById("error").hidden,
    null,
    { timeout: 900_000 },
  );
  if (await page.isVisible("#error")) throw new Error(await page.textContent("#error"));

  const chip = await page.textContent("#lang-chip");
  const state = await page.getAttribute("#lang-chip", "data-state");
  console.log(`language: ${chip} (${state})`);
  const expectedName = new Intl.DisplayNames(["en"], { type: "language" }).of(expectedLanguage);
  if (!chip.includes(expectedName)) throw new Error(`Ear heard ${chip}, expected ${expectedName}`);

  const texts = await page.$$eval(".cue-text", (areas) => areas.map((a) => a.value));
  console.log(`subtitles:\n${texts.join("\n---\n")}`);
  if (!/hello|world|test|transcri/i.test(texts.join(" "))) throw new Error("the transcript does not match the speech");

  // Edit the first subtitle: the SRT and the caption follow.
  await page.locator(".cue-text").first().fill("Edited by the test");
  await page.waitForTimeout(500);
  const srt = await page.evaluate(async () => (await fetch(document.getElementById("dl-srt").href)).text());
  if (!/^1\n\d\d:\d\d:\d\d,\d{3} --> \d\d:\d\d:\d\d,\d{3}\nEdited by the test\n/.test(srt)) {
    throw new Error(`the SRT does not carry the edit: ${srt.slice(0, 120)}`);
  }
  await page.locator(".cue-time").first().click();
  await page.waitForFunction(() => !document.getElementById("caption").hidden, null, { timeout: 10_000 });
  console.log(`caption: ${await page.textContent("#caption")}`);
  console.log(`SRT:\n${srt.split("\n\n")[0]}`);

  // Cut the pauses: the input has two seconds of silence between sentences.
  await page.waitForSelector("#cut-panel:not([hidden])");
  console.log(`cuts: ${await page.textContent("#cut-stats")}`);
  if (await page.isDisabled("#render")) throw new Error("no pause was found to cut");
  const before = await page.evaluate(() => document.getElementById("video").duration);
  await page.click("#render");
  await page.waitForFunction(
    () => !document.getElementById("dl-cut").hidden || !document.getElementById("render-error").hidden,
    null,
    { timeout: 300_000 },
  );
  if (await page.isVisible("#render-error")) throw new Error(await page.textContent("#render-error"));
  const [after, width] = await page.evaluate(async () => {
    const v = document.createElement("video");
    v.src = document.getElementById("dl-cut").href;
    await new Promise((resolve, reject) => {
      v.onloadedmetadata = resolve;
      v.onerror = () => reject(new Error("the cut video does not load"));
    });
    return [v.duration, v.videoWidth];
  });
  console.log(`${await page.textContent("#render-status")}: ${before.toFixed(2)} s -> ${after.toFixed(2)} s, ${width} px wide`);
  if (!(after < before - 1) || !(after > 1)) throw new Error(`the cut video lasts ${after} s (from ${before} s)`);
  if (!width) throw new Error("the cut video has no picture");

  // Burned-in subtitles: render again without them and compare the bottom of
  // the picture halfway through the first (edited) subtitle of the cut video.
  const firstCue = await page.evaluate(async () => {
    const srt = await (await fetch(document.getElementById("dl-srt").href)).text();
    const [a, b] = srt.split("\n")[1].split(" --> ").map((t) => {
      const [h, m, rest] = t.split(":");
      return Number(h) * 3600 + Number(m) * 60 + Number(rest.replace(",", "."));
    });
    return (a + b) / 2;
  });
  await page.evaluate(async () => {
    window.__burned = await (await fetch(document.getElementById("dl-cut").href)).blob();
  });
  await page.uncheck("#burn-subs");
  await page.click("#render");
  await page.waitForFunction(() => document.getElementById("render-status").textContent.startsWith("Ready"), null, {
    timeout: 300_000,
  });
  if (await page.isVisible("#render-error")) throw new Error(await page.textContent("#render-error"));
  const diff = await page.evaluate(async (time) => {
    const plain = await (await fetch(document.getElementById("dl-cut").href)).blob();
    const frame = async (blob) => {
      const v = document.createElement("video");
      v.muted = true;
      v.src = URL.createObjectURL(blob);
      await new Promise((resolve) => (v.onloadeddata = resolve));
      v.currentTime = time;
      await new Promise((resolve) => (v.onseeked = resolve));
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(v, 0, 0);
      return ctx.getImageData(0, 0, c.width, c.height);
    };
    const [a, b] = [await frame(window.__burned), await frame(plain)];
    const mean = (y0, y1) => {
      let sum = 0;
      let n = 0;
      for (let y = Math.floor(a.height * y0); y < a.height * y1; y++) {
        for (let x = Math.floor(a.width * 0.15); x < a.width * 0.85; x++) {
          const i = (y * a.width + x) * 4;
          sum += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
          n += 3;
        }
      }
      return sum / n;
    };
    return { caption: mean(0.75, 0.93), top: mean(0.05, 0.4) };
  }, firstCue);
  console.log(`burned subtitles at ${firstCue.toFixed(2)} s: caption area differs by ${diff.caption.toFixed(1)}, top by ${diff.top.toFixed(1)}`);
  if (!(diff.caption > 15 && diff.caption > diff.top * 3)) throw new Error("the subtitles are not in the picture");
} finally {
  await browser.close();
  server.kill();
}
