/**
 * App: ai-codebase-flattener
 * Package: src
 * File: glob.js
 * Version: 0.1.1
 * Turns: 1
 * Author: gpt-5-codex
 * Date: 2025-10-04T00:00:00Z
 * Exports: walkAllFiles, compileMatchers
 * Description: Supplies file discovery and glob filtering. walkAllFiles() recursively walks the
 *              filesystem honoring optional symlink traversal. compileMatchers() builds matcher
 *              predicates (using picomatch when available or a fallback globToRegExp implementation)
 *              to evaluate include/exclude globs via want().
*/
import { readdir, stat } from "node:fs/promises";
import { join, sep } from "node:path";

let picomatchFactory;
try {
  const mod = await import("picomatch");
  picomatchFactory = mod.default ?? mod;
} catch {
  picomatchFactory = (pattern) => {
    const regex = globToRegExp(pattern);
    return (value) => regex.test(value);
  };
}

export async function walkAllFiles(root, { followSymlinks = false } = {}) {
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git") continue;
        await walk(p);
      } else if (entry.isFile()) {
        out.push(p);
      } else if (entry.isSymbolicLink() && followSymlinks) {
        const st = await stat(p).catch(() => null);
        if (st?.isFile()) out.push(p);
        if (st?.isDirectory()) await walk(p);
      }
    }
  }
  await walk(root);
  return out;
}

export function compileMatchers(includes = [], excludes = []) {
  const includeMatchers = includes.length
    ? includes.map((g) => picomatchFactory(g, { posixSlashes: true }))
    : [() => true];
  const excludeMatchers = excludes.length
    ? excludes.map((g) => picomatchFactory(g, { posixSlashes: true }))
    : [];
  function want(relPath) {
    const p = relPath.split(sep).join("/");
    const inc = includeMatchers.some((m) => m(p));
    const exc = excludeMatchers.some((m) => m(p));
    return inc && !exc;
  }
  return { want };
}

function globToRegExp(pattern) {
  let regex = "";
  const specials = new Set([".", "+", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]);
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        regex += ".*";
        if (pattern[i + 2] === "/") {
          regex += "(?:/)?";
          i += 2;
        } else {
          i += 1;
        }
      } else {
        regex += "[^/]*";
      }
    } else if (ch === "?") {
      regex += "[^/]";
    } else {
      regex += specials.has(ch) ? `\\${ch}` : ch;
    }
  }
  return new RegExp(`^${regex}$`);
}
