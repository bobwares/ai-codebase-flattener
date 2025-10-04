/**
 * App: ai-codebase-flattener
 * Package: src
 * File: git.js
 * Version: 0.1.1
 * Turns: 1
 * Author: gpt-5-codex
 * Date: 2025-10-04T00:00:00Z
 * Exports: isGitRepo, gitBranchCommit, gitLsFiles
 * Description: Provides minimal Git helpers for repository discovery. isGitRepo() checks for a .git
 *              folder, gitBranchCommit() returns current branch and commit hashes, and gitLsFiles()
 *              lists tracked files using git ls-files. run() wraps spawnSync for command execution.
 */
import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export async function isGitRepo(root) {
  try {
    await access(resolve(root, ".git"));
    return true;
  } catch {
    return false;
  }
}

export async function gitBranchCommit(root) {
  if (!(await isGitRepo(root))) return [null, null];
  const branch = run(["rev-parse", "--abbrev-ref", "HEAD"], root);
  const commit = run(["rev-parse", "HEAD"], root);
  return [branch || null, commit || null];
}

export async function gitLsFiles(root) {
  const out = run(["ls-files", "-z"], root);
  if (!out) return [];
  return out.split("\x00").filter(Boolean);
}

function run(args, cwd) {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (res.status !== 0) return null;
  return res.stdout.trim();
}
