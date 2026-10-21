# Contributing to AeroStream

Thank you for your interest in contributing to **AeroStream**! To maintain a production-grade codebase that adheres to strict software engineering standards, please follow these guidelines.

---

## 🧭 Branch Strategy

We follow a trunk-based branch model with short-lived feature branches:

- `main`: Production-ready, deployable code.
- `feat/<description>`: New features or components (e.g., `feat/ingestion-api-validation`).
- `fix/<description>`: Bug fixes (e.g., `fix/timescaledb-hypertable-chunk-size`).
- `docs/<description>`: Documentation updates and ADR additions.
- `perf/<description>`: Performance improvements and benchmarks.

---

## 💬 Commit Message Convention

We strictly follow the **[Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/)**. This ensures a clean, searchable git history and automated changelog generation.

### Format
```text
<type>(<optional scope>): <description in imperative mood>

[optional body explaining motivation and trade-offs]

[optional footer(s)]
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting, white-space)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Build process, auxiliary tools, or library updates

### Examples
- `feat(ingestion): implement rate limiting middleware with sliding window`
- `fix(worker): prevent race condition when updating redis hot state cache`
- `docs(adr): record architectural decision on timescaledb vs influxdb`

---

## 🏛️ Architecture Decision Records (ADRs)

If your pull request introduces a significant architectural decision (such as adopting a new database, queue system, or auth protocol), you must add an ADR under `docs/adr/`. Refer to [ADR-0001](docs/adr/0001-record-architecture-decisions.md) for the template.

---

## 🧪 Testing Standards

- **Unit tests:** Every service or domain logic component must be covered with tests.
- **Integration tests:** Use realistic dependencies (e.g., Testcontainers or Docker Compose instances) rather than excessive mocking of database layers.
- **Linters:** Run `npm run lint` before opening a pull request.
