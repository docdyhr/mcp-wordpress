# .claude/skills/

## Purpose

Project agent skills, loaded by Claude Code and GitHub Copilot (cloud agent, CLI, VS Code agent mode). Each subfolder is
one skill: a `SKILL.md` plus optional `references/` and `scripts/`.

## Ownership

- Every skill here is vendored verbatim from [github/awesome-copilot](https://github.com/github/awesome-copilot); the
  source commit is recorded in `README.md`.
- `README.md` — inventory of installed skills and their source commit.
- `LICENSE` — the upstream MIT license, shipped verbatim with the vendored skills.

## Local Contracts

- Do not edit vendored skill files in place. To change one, update it from upstream (or replace it with a repo-owned
  skill) and bump the source commit in `README.md`.
- Skill folders are excluded from Prettier and markdownlint (`.prettierignore`, `.markdownlintignore`) so the
  lint-staged hook cannot rewrite the verbatim copy; `README.md` and this file stay linted.
- Not installed, on purpose: `github-release` and `conventional-commit` conflict with this repo's release and commit
  workflow; `security-review` shares its name with Claude Code's built-in `/security-review`.
- Vendored skills are advisory; the rules under Security Notes in the root `AGENTS.md` override them.
- Bundled `scripts/` are read-only Python audit helpers, not project code; re-review them on every upstream refresh.
- No skill may pre-approve `shell`/`bash` through `allowed-tools`.

## Work Guidance

## Verification

## Child DOX Index

None.
