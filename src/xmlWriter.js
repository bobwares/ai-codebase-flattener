/**
 * App: ai-codebase-flattener
 * Package: src
 * File: xmlWriter.js
 * Version: 0.1.1
 * Turns: 1
 * Author: gpt-5-codex
 * Date: 2025-10-04T00:00:00Z
 * Exports: XmlWriter
 * Description: Streams XML artifacts for flattened codebases. XmlWriter.startCodebase() opens the
 *              document and emits metadata, writeFileHeader() outputs per-file attributes,
 *              writeTextContent() handles CDATA with splitting safeguards, writeChunks() enumerates
 *              chunk nodes, writeBinaryBase64() stores base64 payloads, writeError() logs failures,
 *              endFile() closes file elements, endCodebase() adds final digest, and close() releases
 *              the file handle.
 */
import { open } from "node:fs/promises";

export class XmlWriter {
  constructor(outPath) {
    this.outPath = outPath;
    this.handle = null;
  }

  async _w(s) {
    await this.handle.write(s);
  }

  async startCodebase({ root, includes, excludes, maxFileBytes, chunkBytes, branch, commit }) {
    this.handle = await open(this.outPath, "w");
    await this._w('<?xml version="1.0" encoding="UTF-8"?>\n');
    const attrs = [
      ["version", "1.0"],
      ["root", root],
      ["generated_at", new Date().toISOString()],
      ...(branch ? [["branch", branch]] : []),
      ...(commit ? [["commit", commit]] : [])
    ].map(([k, v]) => `${k}="${xmlAttr(v)}"`).join(" ");
    await this._w(`<codebase ${attrs}>\n`);
    await this._w("  <config>\n");
    await this._w(`    <includes>${xmlTxt(includes.join(","))}</includes>\n`);
    await this._w(`    <excludes>${xmlTxt(excludes.join(","))}</excludes>\n`);
    await this._w(`    <max_file_bytes>${maxFileBytes}</max_file_bytes>\n`);
    await this._w(`    <chunk_bytes>${chunkBytes}</chunk_bytes>\n`);
    await this._w("  </config>\n");
  }

  async writeFileHeader({ path, lang, sizeBytes, sha256, isBinary, encoding }) {
    const attrs = [
      ["path", path],
      ["lang", lang],
      ["size_bytes", String(sizeBytes)],
      ["sha256", sha256],
      ["is_binary", isBinary ? "true" : "false"],
      ["encoding", encoding]
    ].map(([k, v]) => `${k}="${xmlAttr(v)}"`).join(" ");
    await this._w(`  <file ${attrs}>\n`);
  }

  async writeTextContent(text) {
    const parts = String(text).split("]]>");
    if (parts.length === 1) {
      await this._w("    <content><![CDATA[");
      await this._w(parts[0]);
      await this._w("]]></content>\n");
      return;
    }
    await this._w("    <content>");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) await this._w("]]]]><![CDATA[>");
      await this._w("<![CDATA[");
      await this._w(parts[i]);
      await this._w("]]>");
    }
    await this._w("</content>\n");
  }

  async writeChunks(chunks) {
    await this._w("    <chunks>\n");
    for (const c of chunks) {
      await this._w(`      <chunk index="${c.index}" offset="${c.offset}"><![CDATA[`);
      await this._w(c.text);
      await this._w("]]></chunk>\n");
    }
    await this._w("    </chunks>\n");
  }

  async writeBinaryBase64(buf) {
    await this._w("    <content_base64>");
    await this._w(buf.toString("base64"));
    await this._w("</content_base64>\n");
  }

  async writeError(e) {
    const msg = `${e?.name || "Error"}: ${e?.message || String(e)}`;
    await this._w(`    <error>${xmlTxt(msg)}</error>\n`);
  }

  async endFile() {
    await this._w("  </file>\n");
  }

  async endCodebase(overall) {
    await this._w(`  <digest algo="sha256">${overall}</digest>\n`);
    await this._w("</codebase>\n");
  }

  async close() {
    if (this.handle) await this.handle.close();
  }
}

function xmlTxt(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function xmlAttr(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
