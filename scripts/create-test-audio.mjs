// Original synthetic test tones, not commercial music. No external assets needed.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const folder = resolve(".local/test-audio");
await mkdir(folder, { recursive: true });
for (const [index, name] of [
  "01 - Morning Steps",
  "02 - Amber Room",
  "03 - Last Light",
].entries()) {
  const sampleRate = 22050,
    seconds = 12,
    length = sampleRate * seconds;
  const data = Buffer.alloc(44 + length * 2);
  data.write("RIFF");
  data.writeUInt32LE(36 + length * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(length * 2, 40);
  const notes = [
    [261.63, 329.63, 392, 523.25, 392, 329.63],
    [293.66, 349.23, 440, 587.33, 440, 349.23],
    [220, 261.63, 329.63, 440, 329.63, 261.63],
  ][index];
  for (let sample = 0; sample < length; sample++) {
    const t = sample / sampleRate,
      beat = t % 0.5;
    const envelope =
      Math.min(1, beat / 0.015) *
      Math.exp(-beat * 7) *
      Math.min(1, (seconds - t) / 0.2);
    const frequency = notes[Math.floor(t * 2) % notes.length];
    const value =
      (Math.sin(2 * Math.PI * frequency * t) +
        0.22 * Math.sin(4 * Math.PI * frequency * t)) *
      envelope *
      0.13;
    data.writeInt16LE(Math.round(value * 32767), 44 + sample * 2);
  }
  await writeFile(resolve(folder, `${name}.wav`), data);
}
await writeFile(
  resolve(folder, "04 - Broken audio.mp3"),
  "This is deliberately invalid audio for decode-error testing.",
);
console.log(
  `Created three original 12-second PCM WAV clips and one deliberately invalid MP3 in:\n${folder}\nImport through the file picker. These are test sounds, not a music library.`,
);
