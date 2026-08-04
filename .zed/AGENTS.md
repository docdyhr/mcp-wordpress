# .zed

## Purpose

Project-scoped Zed settings that keep configuration templates and generated output from producing irrelevant
editor diagnostics.

## Ownership

- `settings.json` maps `.env*` configuration files and generated `dist/**/*.js` output to Plain Text and suppresses
  ESLint warnings for ignored files.

## Local Contracts

- Do not disable language-server diagnostics for source directories.
- Keep environment files as plain text: they are loaded as data, not executed as shell scripts.
- Keep generated `dist/` output as plain text because it is ignored and rebuilt from `src/`.

## Work Guidance

- Add language associations only when they avoid an editor false positive without hiding diagnostics from
  maintained source files.

## Verification

- Refresh Zed Project Diagnostics after changing `settings.json`.

## Child DOX Index

- No child DOX documents.
