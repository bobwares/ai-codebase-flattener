/**
 * App: ai-codebase-flattener
 * Package: src
 * File: mdWriter.js
 * Version: 0.1.1
 * Turns: 1
 * Author: gpt-5-codex
 * Date: 2025-10-04T00:00:00Z
 * Exports: MdWriter
 * Description: Streams Markdown output for the flattened artifact. MdWriter.startCodebase() writes
 *              metadata headers, writeFileHeader() logs per-file stats, writeTextContent() and
 *              writeChunks() emit fenced blocks, writeBinaryBase64() stores encoded binaries,
 *              writeError() documents read issues, endFile() separates entries, endCodebase()
 *              finalizes digest/index, and close() releases the file handle.
 */
import { open } from "node:fs/promises";
import { createHash } from "node:crypto";

export class MdWriter {
  constructor(outPath) {
    this.outPath = outPath;
    this.handle = null;
    this.files = [];
    this._overall = createHash("sha256");
  }

  async _w(s) {
    await this.handle.write(s);
  }

  async startCodebase({ root, includes, excludes, maxFileBytes, chunkBytes, branch, commit }) {
    this.handle = await open(this.outPath, "w");
    const now = new Date().toISOString();
    await this._w(`# Codebase Snapshot (Markdown)\n\n`);
    await this._w(`- root: ${esc(root)}\n`);
    await this._w(`- generated_at: ${esc(now)}\n`);
    if (branch) await this._w(`- branch: ${esc(branch)}\n`);
    if (commit) await this._w(`- commit: ${esc(commit)}\n`);
    await this._w(`- version: 1.0\n\n`);
    await this._w(`## Config\n\n`);
    await this._w(`- includes: ${esc(includes.join(", "))}\n`);
    await this._w(`- excludes: ${esc(excludes.join(", "))}\n`);
    await this._w(`- max_file_bytes: ${maxFileBytes}\n`);
    await this._w(`- chunk_bytes: ${chunkBytes}\n\n`);
    await this._w(`---\n\n## Files\n\n`);
  }

  async writeFileHeader({ path, lang, sizeBytes, sha256, isBinary, encoding }) {
    this.files.push(path);
    this._overall.update(Buffer.from(sha256 || "", "hex"));
    await this._w(`### ${esc(path)}\n\n`);
    await this._w(`- lang: ${esc(lang)}\n- size_bytes: ${sizeBytes}\n- sha256: ${esc(sha256)}\n- binary: ${isBinary ? "true" : "false"}\n- encoding: ${esc(encoding)}\n\n`);
  }

  async writeTextContent(text) {
    await this._w("```\n");
    await this._w(text);
    await this._w("\n```\n\n");
  }

  async writeChunks(chunks) {
    await this._w(`> This file is chunked for size. Combine chunks in order.\n\n`);
    for (const c of chunks) {
      await this._w(`#### chunk ${c.index} (offset ${c.offset})\n\n`);
      await this._w("```\n");
      await this._w(c.text);
      await this._w("\n```\n\n");
    }
  }

  async writeBinaryBase64(buf) {
    await this._w(`<details>\n<summary>binary content (base64, ${buf.length} bytes)</summary>\n\n`);
    await this._w("```base64\n");
    await this._w(buf.toString("base64"));
    await this._w("\n```\n\n</details>\n\n");
  }

  async writeError(e) {
    const msg = `${e?.name || "Error"}: ${e?.message || String(e)}`;
    await this._w(`> Error while reading file: ${esc(msg)}\n\n`);
  }

  async endFile() {
    await this._w(`---\n\n`);
  }

  async endCodebase(overallSha) {
    await this._w(`## Digest\n\n- algo: sha256\n- value: ${esc(overallSha)}\n\n`);
    await this._w(`## Index\n\n`);
    for (const p of this.files) {
      await this._w(`- ${linkTo("#" + anchor(p), p)}\n`);
    }
    await this._w(`\n`);
  }

  async close() {
    if (this.handle) await this.handle.close();
  }
}

function esc(s) {
  return String(s ?? "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function anchor(path) {
  return String(path).toLowerCase().replaceAll(/[^a-z0-9\s/_-]/g, "").replaceAll(/[\/\s]+/g, "-");
}

function linkTo(href, label) {
  return `[${label}](${href})`;
}
