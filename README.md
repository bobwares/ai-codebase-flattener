# ai-codebase-flattener

Flatten a repository (or folder) into a single Markdown or XML artifact for AI analysis and cross-file edits.

## Install

npm install

## CLI

ai-codebase-flattener \
  --root . \
  --out turns/0042/artifacts/codebase.md \
  --format md \
  --include "src/**,package.json" \
  --exclude ".git/**,node_modules/**"

Or with config:

ai-codebase-flattener --config config/flattener.config.json

### Behavior
- If in a Git repo and honor_gitignore=true, candidates come from git ls-files.
- Otherwise, recursively walk and filter with globs.
- Text files in Markdown are fenced; in XML they are CDATA.
- Binaries are base64-encoded if size ≤ max_file_bytes.
- Oversized text is chunked to chunk_bytes.

### Output
- Markdown: combined file with per-file sections and a digest footer.
- XML: <codebase> root, per-file <file>, and final <digest>.
