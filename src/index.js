/**
 * App: ai-codebase-flattener
 * Package: src
 * File: index.js
 * Version: 0.1.1
 * Turns: 1
 * Author: gpt-5-codex
 * Date: 2025-10-04T00:00:00Z
 * Exports: flatten
 * Description: Coordinates repository flattening by selecting files, hashing content, and delegating
 *              rendering to Markdown or XML writers. flatten() orchestrates git-aware discovery,
 *              filtering, streaming, and digest calculation. classifyLang() maps file extensions to
 *              language identifiers. chunkUtf8() slices large text content into deterministic chunks.
 */
import { mkdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";
import { XmlWriter } from "./xmlWriter.js";
import { MdWriter } from "./mdWriter.js";
import { isGitRepo, gitBranchCommit, gitLsFiles } from "./git.js";
import { walkAllFiles, compileMatchers } from "./glob.js";
import { detectBinarySample, fileSha256, sampleBytes, toPosix } from "./utils.js";

export async function flatten(options) {
  const {
    root, out, includes = [], excludes = [],
    maxFileBytes = 200000, chunkBytes = 50000,
    followSymlinks = false, honorGitignore = true,
    format = "xml"
  } = options;

  const rootAbs = resolve(root);
  await mkdir(resolve(out, ".."), { recursive: true });

  const writer = format === "md" ? new MdWriter(out) : new XmlWriter(out);
  const [branch, commit] = await gitBranchCommit(rootAbs);

  await writer.startCodebase({ root: rootAbs, includes, excludes, maxFileBytes, chunkBytes, branch, commit });

  let candidates = [];
  if (honorGitignore && (await isGitRepo(rootAbs))) {
    candidates = (await gitLsFiles(rootAbs)).map((p) => resolve(rootAbs, p));
  } else {
    candidates = await walkAllFiles(rootAbs, { followSymlinks });
  }

  const { want } = compileMatchers(includes, excludes);
  const selected = candidates.filter((p) => want(relative(rootAbs, p)));
  selected.sort((a, b) => toPosix(relative(rootAbs, a)).localeCompare(toPosix(relative(rootAbs, b))));

  const overall = createHash("sha256");

  for (const absPath of selected) {
    const rel = toPosix(relative(rootAbs, absPath));
    try {
      const st = await stat(absPath);
      const size = st.size;
      const sample = await sampleBytes(absPath, 4096);
      const isBinary = detectBinarySample(sample);
      const fileHash = await fileSha256(absPath);
      overall.update(Buffer.from(fileHash, "hex"));

      const lang = classifyLang(rel);
      const encoding = isBinary ? "binary" : "utf-8";

      await writer.writeFileHeader({ path: rel, lang, sizeBytes: size, sha256: fileHash, isBinary, encoding });

      if (isBinary) {
        if (size <= maxFileBytes) {
          const data = await readFile(absPath);
          await writer.writeBinaryBase64(data);
        }
        await writer.endFile();
        continue;
      }

      if (size <= maxFileBytes) {
        const text = await readFile(absPath, "utf8");
        if (size <= chunkBytes || chunkBytes <= 0) {
          await writer.writeTextContent(text);
        } else {
          const chunks = chunkUtf8(text, chunkBytes);
          await writer.writeChunks(chunks);
        }
      } else {
        const text = await readFile(absPath, "utf8").catch(async () => (await readFile(absPath)).toString("utf8"));
        const chunks = chunkUtf8(text, Math.max(1, chunkBytes));
        await writer.writeChunks(chunks);
      }

      await writer.endFile();
    } catch (e) {
      await writer.writeFileHeader({ path: rel, lang: "unknown", sizeBytes: 0, sha256: "", isBinary: false, encoding: "utf-8" });
      await writer.writeError(e);
      await writer.endFile();
    }
  }

  await writer.endCodebase(overall.digest("hex"));
  await writer.close();
}

function classifyLang(path) {
  const lower = path.toLowerCase();
  const map = new Map([
    [".java", "java"], [".kt", "kotlin"], [".py", "python"], [".ts", "typescript"], [".tsx", "tsx"],
    [".js", "javascript"], [".jsx", "jsx"], [".json", "json"], [".yml", "yaml"], [".yaml", "yaml"],
    [".xml", "xml"], [".md", "markdown"], [".rb", "ruby"], [".go", "go"], [".c", "c"], [".h", "c-header"],
    [".cpp", "cpp"], [".hpp", "cpp-header"], [".cs", "csharp"], [".php", "php"], [".html", "html"],
    [".css", "css"], [".sql", "sql"], [".properties", "properties"], [".gradle", "gradle"]
  ]);
  for (const [ext, lang] of map) if (lower.endsWith(ext)) return lang;
  return "unknown";
}

function chunkUtf8(text, size) {
  const chunks = [];
  let i = 0;
  let offset = 0;
  while (offset < text.length) {
    const slice = text.slice(offset, offset + size);
    chunks.push({ index: i++, offset, text: slice });
    offset += size;
  }
  return chunks;
}
