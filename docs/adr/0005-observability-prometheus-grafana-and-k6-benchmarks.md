# ADR 0005: Observability Pipeline (Prometheus & Grafana) and Load Testing (k6)

## Status

Accepted

## Date

2026-11-05

## Context

AeroStream is designed as a high-throughput, mission-critical event ingestion platform for autonomous drone fleets. Operating at scale demands real-time visibility into:

1. **Ingestion Latency Percentiles (p95 / p99)**: In aviation telemetry, average latency masks dangerous tail latency spikes. We need strict SLA monitoring ensuring packets are ingested and acknowledged within < 150ms.
2. **Pipeline Subsystem Breakdown**: Isolating bottlenecks across the ingestion stages—deserialization/validation, Redis Streams buffer publication, and TimescaleDB hypertable persistence.
3. **Domain Health & Safety Alerts**: Instant visual tracking of safety rule triggers (such as `CRITICAL_BATTERY_LEVEL`, `LOW_SATELLITE_COUNT`, and `BATTERY_OVERHEATING`).
4. **Active Subscriber Load**: Monitoring concurrent Server-Sent Events (SSE) connections to prevent connection starvation or memory leakage in the API Node.js process.
5. **Empirical Benchmarking**: Providing verifiable proof of system capacity through reproducible load and stress testing scripts rather than theoretical claims.

## Decision

We implemented a comprehensive, containerized observability and load testing stack consisting of **`prom-client`**, **Prometheus**, **Grafana**, and **k6**:

### 1. Application Instrumentation (`prom-client`)

- We embedded `prom-client` directly within `@aerostream/api`, registering default Node.js process metrics (CPU usage, heap memory allocations, GC activity, event loop lag) and domain-specific Prometheus primitives:
  - `aerostream_telemetry_ingested_total` (Counter with `[type, status]` labels).
  - `aerostream_telemetry_batch_size` (Histogram with exponential buckets: 1 to 500).
  - `aerostream_telemetry_ingestion_duration_seconds` (Histogram with sub-millisecond to multi-second buckets for accurate p95/p99 quantile calculation).
  - `aerostream_redis_stream_publish_duration_seconds` (Histogram measuring Redis Stream write latency).
  - `aerostream_db_insert_duration_seconds` (Histogram measuring TimescaleDB write latency).
  - `aerostream_active_sse_connections` (Gauge collecting `telemetryBroadcaster.clientCount`).
  - `aerostream_telemetry_alerts_total` (Counter tracking domain safety violations).
  - `aerostream_http_requests_total` and `aerostream_http_request_duration_seconds` (HTTP middleware instrumentation).
- Expiration and scrape endpoint exposed at `GET /metrics` in standard text exposition format (version 0.0.4).

### 2. Infrastructure Observability Stack (Docker Compose)

- **Prometheus (`prom/prometheus:v2.54.1`)**:
  - Configured with a 5-second scrape interval against `host.docker.internal:3001/metrics` and `api:3001/metrics`.
- **Grafana (`grafana/grafana:11.2.0`)**:
  - Pre-provisioned data sources (`infra/docker/grafana/provisioning/datasources/prometheus.yml`) pointing directly to Prometheus.
  - Zero-touch dashboard provisioning (`infra/docker/grafana/provisioning/dashboards/dashboards.yml` and `infra/docker/grafana/dashboards/aerostream-mission-control.json`), immediately displaying:
    - Current Ingestion Rate (points/sec)
    - Active Live Web Dashboards (SSE)
    - p95 and p99 Ingestion Latency curves with visual SLA threshold bands
    - Redis Streams vs. TimescaleDB latency breakdown
    - Domain Safety Alerts bar gauge
    - Node.js Heap Memory and CPU utilization
    - HTTP throughput by status code

### 3. Load & Saturation Benchmarks (`k6`)

- Automated k6 benchmark scripts located in `tests/load/`:
  - `k6-telemetry-burst.js`: Simulates 50 to 200 concurrent drones with realistic GPS coordinates around São Paulo / Congonhas airspace, emitting single and batch packets.
  - `k6-stress-test.js`: Ramps up to 500 Virtual Users emitting at 20 Hz to test backpressure limits and verify queue buffering dynamics.
- Thresholds defined as code:
  - `p(95) < 150ms`
  - `p(99) < 300ms`
  - `http_req_failed < 1%`

## Consequences

### Positive

- **Instant Root Cause Analysis**: If ingestion latency degrades, operators can immediately see in Grafana whether the bottleneck is in Redis, TimescaleDB, or Node.js CPU/memory.
- **Turnkey Setup**: Running `docker compose up -d` boots the entire stack—TimescaleDB, Redis, Prometheus, and Grafana—with pre-loaded dashboards, requiring zero manual configuration.
- **Production-Grade Metric Standard**: Prometheus pull model avoids overhead and failure coupling associated with synchronous push metrics.
- **Empirical Validation**: k6 scripts provide concrete quantitative proof of platform capacity for prospective employers and code reviewers.

### Trade-offs & Mitigations

- **Scrape Overhead**: Frequent scraping (every 5s) could trigger rate-limiting or consume CPU cycles. _Mitigation:_ The `/metrics` and `/health` routes are explicitly exempted from Fastify rate limiting, and metrics collection uses lightweight in-memory counters and histograms.
