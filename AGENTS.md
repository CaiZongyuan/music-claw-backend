# Project Guide

## Read First
- `docs/prd.md` is the source of product requirements for the QQ playlist import MVP.
- `src/` contains backend implementation; keep HTTP handlers thin and move parsing, matching, and third-party integration into focused modules.
- `docs/` stores product and integration references, including `docs/NeteaseCloudMusicApi.html`.
- `scripts/` stores repo automation, including `scripts/pre_commit_check.py.py`.

## Global Rules
- Validation is mandatory: every code change must end with a concrete verification command such as `bun test`, `bun run dev`, or `python3 scripts/pre_commit_check.py.py`.
- Keep the diff minimal: do not mix bug fixes or feature work with unrelated refactors, renames, or formatting churn.
- Ask before dangerous actions: do not force push, rewrite shared history, delete branches, or change production-facing configuration without explicit confirmation.
- Protect secrets: never commit or print cookies, tokens, session data, or other sensitive values in code, logs, examples, or summaries.
- Keep rollback in mind: when behavior changes, document the rollback path in the PR or handoff summary.

## Working Style
- Use TypeScript with `strict` mode preserved and follow the existing style: 2-space indentation, single quotes, and no unnecessary semicolons.
- Expose new tooling through `package.json` scripts instead of ad-hoc shell commands where practical.
- Prefer adding local `AGENTS.md` files near the code being changed instead of growing this root file.

## Local Guides
- `src/AGENTS.md` defines backend structure, boundaries, and implementation conventions for source files.
- `tests/AGENTS.md` defines testing and TDD-specific conventions for automated tests.
