# Source Guide

## Scope
- This file applies to everything under `src/`.

## Structure
- Keep routes and handlers thin; put parsing, matching, import orchestration, and third-party API calls into dedicated modules.
- Prefer small focused files such as `routes/`, `services/`, `parsers/`, `clients/`, `types/`, and `utils/` when the code grows beyond a single entry file.
- Favor pure functions for normalization, matching, and pagination logic so they stay easy to test.

## Implementation Rules
- Reuse shared types for playlist, track, candidate, and import result data instead of passing loose objects around.
- Return explicit errors for parse failures, remote API failures, invalid input, and partial import results; avoid silent fallbacks.
- Keep network integrations replaceable behind small service or client boundaries.
- Do not log raw cookies, tokens, or external session payloads.

## Validation
- For non-trivial logic changes under `src/`, add or update automated tests and report the exact validation command run.
