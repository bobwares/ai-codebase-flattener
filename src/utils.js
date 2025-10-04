/**
 * App: ai-codebase-flattener
 * Package: src
 * File: utils.js
 * Version: 0.1.1
 * Turns: 1
 * Author: gpt-5-codex
 * Date: 2025-10-04T00:00:00Z
 * Exports: toPosix, fileSha256, sampleBytes, detectBinarySample
 * Description: Utility helpers for file handling. toPosix() normalizes path separators, fileSha256()
 *              streams a file to compute SHA-256 digests, sampleBytes() reads leading bytes for
 *              binary detection, and detectBinarySample() heuristically flags non-text buffers.
 */
import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import { sep } from "node:path";

export function toPosix(p) {
  return p.split(sep).join("/");
}

export async function fileSha256(path) {
  const hash = createHash("sha256");
  const fh = await open(path, "r");
  try {
    const buf = Buffer.alloc(1024 * 1024);
    let position = 0;
    while (true) {
      const { bytesRead } = await fh.read({ buffer: buf, position });
      if (!bytesRead) break;
      hash.update(buf.subarray(0, bytesRead));
      position += bytesRead;
    }
  } finally {
    await fh.close();
  }
  return hash.digest("hex");
}

export async function sampleBytes(path, size) {
  const fh = await open(path, "r");
  try {
    const st = await fh.stat();
    const length = Math.min(size, st.size);
    const buf = Buffer.alloc(length);
    await fh.read({ buffer: buf, position: 0, length });
    return buf;
  } finally {
    await fh.close();
  }
}

export function detectBinarySample(sample) {
  if (!sample || sample.length === 0) return false;
  if (sample.includes(0)) return true;
  const printable = new Set([7, 8, 9, 10, 12, 13, 27, ...Array.from({ length: 95 }, (_, i) => 32 + i)]);
  let nontext = 0;
  for (const b of sample) {
    if (!printable.has(b)) nontext++;
  }
  return nontext / sample.length > 0.3;
}
