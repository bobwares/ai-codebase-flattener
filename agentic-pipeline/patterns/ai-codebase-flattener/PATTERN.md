# Application Implementation Pattern: ai-codebase-flattener

## Purpose
Provide a minimal Node.js CLI that parses a codebase and produces a single artifact for LLM consumption:
- Markdown (default) with fenced source blocks and a digest footer
- XML alternative using CDATA and chunking

## Runtime
- Node.js 20 (ESM)
- npm

## Outputs
- ${artifact_root}/${TURN_ID}/artifacts/codebase.md (default)
- ${artifact_root}/${TURN_ID}/artifacts/codebase.xml (optional)

## Tasks
- TASK 01 - Scaffold Project
- TASK 02 - Write Sources
- TASK 03 - Build & Smoke
- TASK 04 - Flatten Current Repo (Markdown)
- TASK 05 - Flatten Current Repo (XML)
