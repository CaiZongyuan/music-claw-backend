---
name: tdd
description: Execute a strict test-driven development workflow for a specific acceptance criterion. Use when the user wants Codex to implement a feature or fix via full red/green/refactor cycles, requires phase-by-phase test execution, or explicitly asks for TDD against acceptance criteria and a test command.
---

# TDD

## Overview

Drive implementation through a strict red/green/refactor loop.
Accept an acceptance criterion and a test command, enforce file-boundary rules per phase, stop immediately on environment failures, and finish with a `TDD:` checkpoint commit.

## Required Inputs

Collect or confirm these inputs before changing files:

- `acceptance_criteria` (required): a short paragraph describing the expected behavior
- `test_command` (required): exact command used to verify the behavior
- `test_directory` (optional): directory where test files may be edited during Red; default to `tests/`

If a required input is missing, ask only for the missing field.

## Hard Rules

Never violate these constraints:

1. In Red, edit only files inside `test_directory`
2. In Green, edit only implementation files; do not modify test files
3. At the end of every phase, run `test_command`
4. If failure is caused by environment issues, stop immediately and report
5. Keep the Green diff minimal and focused on the failing behavior
6. Do not change the meaning of test assertions in Refactor
7. Finish with a commit message starting with `TDD: `

Treat these as environment failures and stop instead of continuing:

- missing dependencies or executables
- test runner misconfiguration
- required services, databases, or containers not running
- unrelated syntax/runtime failures that prevent reaching the target assertion

Treat these as valid Red failures:

- assertion mismatches caused by missing behavior
- expected exceptions or status codes not produced
- missing return values, fields, branches, or state transitions required by the acceptance criterion

## Preflight

Before starting the loop:

1. Inspect the repo state with `git status --short`
2. If unrelated staged changes already exist, stop and report that the final checkpoint commit cannot be isolated safely
3. Identify the smallest implementation area likely related to the acceptance criterion
4. Identify the relevant test file under `test_directory`, or create a new focused test file there

## Workflow

### 1. Red

Create or update tests only under `test_directory`.

Aim for a failure that is specific, intentional, and traceable to the acceptance criterion.

Process:

1. Add or update the smallest test that captures the missing behavior
2. Do not touch implementation files
3. Run `test_command`
4. Confirm the failure is caused by the requirement gap, not the environment
5. Record the failing reason in the response

If the test unexpectedly passes, strengthen or correct the test until it fails for the right reason.

### 2. Green

Modify implementation only.

Process:

1. Leave test files unchanged
2. Implement the minimum code needed to satisfy the failing test
3. Prefer the smallest safe diff over broad refactors
4. Run `test_command`
5. Confirm the full command passes

If tests still fail, continue only by changing implementation files.

### 3. Refactor

Run this step only if cleanup improves clarity without changing behavior.

Allowed refactors:

- rename confusing identifiers
- remove duplication introduced in Green
- extract tiny helpers
- simplify control flow

Forbidden refactors:

- changing test assertion meaning
- broad rewrites unrelated to the acceptance criterion
- mixing new behavior into cleanup changes

After refactoring, run `test_command` again and confirm it still passes.

### 4. Checkpoint

Create an isolated commit for the TDD cycle.

Process:

1. Stage only files changed for this loop
2. Summarize the acceptance criterion in one short phrase
3. Commit with message `TDD: <summary>`
4. Verify the latest commit subject starts with `TDD:`

## Required Validation

Before finishing, verify all of the following:

1. `test_command` passes
2. `git log -1 --pretty=%s` starts with `TDD:`
3. `git diff HEAD~1 --name-only` includes at least one test file under `test_directory`
4. `git diff HEAD~1 --name-only` includes at least one non-test implementation file

If any validation fails, report the exact failing check and do not claim completion.

## Output Format

Report the loop in this order:

1. Inputs used: acceptance criterion, test command, test directory
2. Red summary: test files changed, failing command result, why the failure is correct
3. Green summary: implementation files changed, passing command result
4. Refactor summary: what was cleaned up, or explicitly state it was skipped
5. Checkpoint summary: commit hash and commit subject
6. Validation summary: results for test pass, commit prefix, and changed test/implementation files

Keep the report concise, but always include the specific failing reason from Red.

## Example Triggers

Use this skill for prompts like:

- “Use TDD to implement this acceptance criterion with `bun test ./...`”
- “Run a red/green/refactor cycle for this bug fix”
- “根据这段验收标准做完整 TDD，并提交 checkpoint”
