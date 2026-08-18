# Coditto repository guidance

## Start here

Before editing, read `README.md`, [the contribution workflow](CONTRIBUTING.md), [the architecture](docs/ARCHITECTURE.md), and the contract or ADR relevant to the task. Inspect the working tree and filesystem; planned modules and examples are not proof of implementation.

When guidance conflicts, follow the user's current instruction, this file, the relevant contract or accepted ADR, then the architecture. Report a material conflict rather than silently choosing one.

## Invariants

- Treat submitted code, patches, archives, repositories, and build scripts as untrusted input.
- Never execute submitted code inside the API process; use the isolated Runner boundary defined in the [Judge input/output specification](docs/contracts/judge.md).
- Never expose secrets, production private problem packs, or another user's files to a workspace, public API result, log, or public Git repository.
- LLM output may propose code or explanations; deterministic execution alone decides a Judge verdict.
- Do not claim a command, test, implementation, security boundary, or deployment exists unless it was actually observed.
- Preserve unrelated changes, keep changes scoped, and do not weaken meaningful tests or assertions to obtain a pass.

## Repository and documentation

`frontend/`, `backend/`, `judge-runner/`, and `problems/` are created only with meaningful implementation or configuration; do not add placeholder files. The public demo fixture may contain public `judge-only/` files, which are a runtime workspace/output boundary rather than GitHub secrets. Production-only problem assets are not committed here.

Keep durable component boundaries in [the architecture](docs/ARCHITECTURE.md), Runner behavior in [the Judge input/output specification](docs/contracts/judge.md), and durable technical decisions in `docs/adr/`. Mark unresolved choices as `TODO` rather than fact.

## GitHub workflow

Follow [CONTRIBUTING.md](CONTRIBUTING.md) for Issue boundaries, branch names, work-unit commits, PR structure, link semantics, checklist evidence, review, and merge ownership. Keep one primary Issue per PR and do not mix unrelated cleanup. Use `Refs #N` while work or end-to-end verification remains; use `Closes #N` only when merging the PR satisfies every completion condition.

## Verification and handoff

Run the narrowest relevant checks, then the full available suite, and always run `git diff --check` before handoff. Report changed behavior, commands actually run and their results, assumptions, remaining risks, and the smallest next implementation task.
