# Test Guide

## Scope
- This file applies to everything under `tests/`.

## Test Rules
- Prefer Bun-native tests so the suite can run with `bun test`.
- Name tests after observable behavior and map them back to `docs/prd.md` stories or acceptance criteria.
- Cover happy path, edge cases, and failure paths for parsing, matching, pagination, and import batching logic.

## TDD Boundaries
- In Red, only change files under `tests/`.
- In Green, satisfy the failing test with the smallest implementation diff possible.
- In Refactor, do not change assertion meaning or expand scope beyond the target behavior.

## Test Quality
- Prefer deterministic fixtures and small stubs over live network calls.
- Add regression coverage for bugs before or alongside implementation fixes.
