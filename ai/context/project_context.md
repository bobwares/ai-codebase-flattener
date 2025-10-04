# Project Context

## Identity
- project_name: ai-codebase-flattener
- description: Flatten a repository into a single Markdown (or XML) artifact for AI analysis and cross-file fixes.
- owner: bobwares

## Tech
- language: Node.js (JavaScript, ESM)
- node_version: 20
- package_manager: npm

## Codex Settings
- application_implementation_pattern: ai-codebase-flattener
- artifact_root: turns
- default_turn_artifacts_dir: turns/${TURN_ID}/artifacts
- preferred_format: md   # md | xml

## Conventions
- line_endings: LF
- include_globs:
    - src/**
    - public/**
    - package.json
    - pnpm-lock.yaml
    - yarn.lock
    - pom.xml
    - build.gradle
    - settings.gradle
    - Dockerfile
    - compose.yml
    - application.yml
    - application.properties
- exclude_globs:
    - .git/**
    - node_modules/**
    - dist/**
    - build/**
    - target/**
    - .idea/**
    - .vscode/**
    - .venv/**
    - coverage/**
    - **/*.min.js
