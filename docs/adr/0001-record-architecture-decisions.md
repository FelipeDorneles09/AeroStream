# ADR 0001: Record Architecture Decisions

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** @FelipeDorneles09

---

## Context

We need a systematic way to document significant architectural decisions made during the design and implementation of **AeroStream**, including context, options considered, trade-offs, and final rationale. This ensures that current and future engineers understand why decisions were made, rather than guessing historical context.

## Decision

We will use **Architecture Decision Records (ADR)** based on Michael Nygard's format. Each ADR will be stored in `docs/adr/` as a version-controlled Markdown file numbered sequentially:

`docs/adr/NNNN-[short-title].md`

Each record will contain:
1. **Title and Number**
2. **Status:** Proposed, Accepted, Deprecated, or Superseded
3. **Context:** What is the problem being solved?
4. **Decision:** What is the chosen solution?
5. **Consequences:** What are the positive, negative, and neutral trade-offs?

## Consequences

- **Positive:** Architectural decisions are transparent, searchable, and reviewed via Pull Requests.
- **Positive:** Clear rationale is available to hiring managers and technical interviewers inspecting the repository.
- **Negative:** Requires continuous discipline to document decisions as the system evolves.
