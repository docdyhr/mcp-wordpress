# .claude/skills/

## Purpose

Project agent skills, loaded by Claude Code and GitHub Copilot (cloud agent, CLI, VS Code agent mode). Each subfolder is
one skill: a `SKILL.md` plus optional `references/` and `scripts/`.

## Ownership

- Every skill here is vendored verbatim from [github/awesome-copilot](https://github.com/github/awesome-copilot); the
  source commit is recorded in `README.md`.
- `README.md` — inventory of installed skills and their source commit.

## Local Contracts

- Do not edit vendored skill files in place. To change one, update it from upstream (or replace it with a repo-owned
  skill) and bump the source commit in `README.md`.
- `github-release` and `conventional-commit` are deliberately not installed: they conflict with this repo's own release
  and commit workflow.
- Bundled `scripts/` are read-only Python audit helpers, not project code.
- No skill may pre-approve `shell`/`bash` through `allowed-tools`.

## Work Guidance

## Verification

## Child DOX Index

None.
