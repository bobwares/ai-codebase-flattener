#!/usr/bin/env node
/**
 * App: ai-codebase-flattener
 * Package: bin
 * File: cli.js
 * Version: 0.1.1
 * Turns: 1
 * Author: gpt-5-codex
 * Date: 2025-10-04T00:00:00Z
 * Exports: none
 * Description: CLI entrypoint that parses command-line arguments, loads optional JSON config,
 *              normalizes include/exclude globs, and invokes flatten(). parseArgs() handles
 *              flag parsing, printHelp() renders usage details, parseCSV() splits comma lists,
 *              and main() orchestrates configuration resolution plus execution.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { flatten } from "../src/index.js";

function parseArgs(argv) {
  const args = { include: "", exclude: "", followSymlinks: false, honorGitignore: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    switch (a) {
      case "--root": args.root = next; i++; break;
      case "--out": args.out = next; i++; break;
      case "--include": args.include = next; i++; break;
      case "--exclude": args.exclude = next; i++; break;
      case "--max-file-bytes": args.maxFileBytes = Number(next); i++; break;
      case "--chunk-bytes": args.chunkBytes = Number(next); i++; break;
      case "--follow-symlinks": args.followSymlinks = true; break;
      case "--no-honor-gitignore": args.honorGitignore = false; break;
      case "--format": args.format = next; i++; break;
      case "--config": args.config = next; i++; break;
      case "-h":
      case "--help":
        printHelp(); process.exit(0);
      default:
        if (a.startsWith("-")) { console.error(`Unknown flag: ${a}`); process.exit(2); }
    }
  }
  return args;
}

function printHelp() {
  console.log(`
ai-codebase-flattener

Usage:
  ai-codebase-flattener --root <dir> --out <file> [options]

Options:
  --include "<glob1,glob2,...>"   POSIX globs to include (relative to root)
  --exclude "<glob1,glob2,...>"   POSIX globs to exclude
  --max-file-bytes <n>            Max size to inline before chunking (default 200000)
  --chunk-bytes <n>               Chunk size when chunking (default 50000)
  --follow-symlinks               Follow symlinks on fallback walk
  --no-honor-gitignore            Do not use 'git ls-files' even in a repo
  --format md|xml                 Output format (default: xml if unspecified in config)
  --config <path>                 Optional JSON config file
  --help                          Show this help
`);
}

function parseCSV(s) {
  return (s || "").split(",").map((x) => x.trim()).filter(Boolean);
}

async function main() {
  const argv = parseArgs(process.argv);
  let cfg = {};
  if (argv.config) {
    const p = resolve(argv.config);
    try { cfg = JSON.parse(await readFile(p, "utf8")); }
    catch (e) { console.error(`Warning: failed to parse config ${p}: ${e.message}`); }
  }

  const root = resolve(argv.root || cfg.root || ".");
  const out = resolve(argv.out || cfg.out || "turns/0001/artifacts/codebase.xml");
  const includes = argv.include ? parseCSV(argv.include) : (cfg.includes || []);
  const excludes = argv.exclude ? parseCSV(argv.exclude) : (cfg.excludes || []);
  const maxFileBytes = Number.isFinite(argv.maxFileBytes) ? argv.maxFileBytes : (cfg.max_file_bytes ?? 200000);
  const chunkBytes = Number.isFinite(argv.chunkBytes) ? argv.chunkBytes : (cfg.chunk_bytes ?? 50000);
  const followSymlinks = argv.followSymlinks || cfg.follow_symlinks || false;
  const honorGitignore = argv.honorGitignore ?? (cfg.honor_gitignore ?? true);
  const format = (argv.format || cfg.format || "xml").toLowerCase();

  await flatten({
    root,
    out,
    includes,
    excludes,
    maxFileBytes,
    chunkBytes,
    followSymlinks,
    honorGitignore,
    format
  });

  console.log(out);
}

main().catch((e) => { console.error(e?.stack || e?.message || String(e)); process.exit(1); });
