# ADR 0002: Real-Time Telemetry Pipeline & Storage Strategy

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** @FelipeDorneles09

---

## Context

AeroStream requires an event-driven architecture capable of processing continuous, high-frequency telemetry streams from dozens to hundreds of concurrent drones. 

Key technical requirements:
1. **Low-latency ingestion:** Sub-100ms response time for telemetry ingestion endpoints.
2. **Backpressure handling:** Ability to buffer surges in telemetry without dropping packets or exhausting API memory.
3. **Hot State Querying:** Sub-millisecond lookup for live fleet location, active battery status, and sensor alerts on the frontend.
4. **Time-Series Persistence:** Efficient historical persistence supporting aggregation, downsampling, and spatial queries for mission replay and diagnostics.
5. **Operational Simplicity:** Avoid overly heavy distributed infrastructure (e.g., full Apache Kafka clusters) for local and early-stage deployments while maintaining a clear upgrade path.

---

## Decision

We adopt a **Dual-Storage & Streaming Buffer Architecture**:

### 1. Ingestion Buffer: Redis Streams
- **Chosen:** Redis Streams.
- **Alternatives Considered:** Apache Kafka, AWS SQS, RabbitMQ.
- **Rationale:** Redis Streams provides append-only log semantics, consumer groups, and persistence with sub-millisecond latency and tiny memory footprint. It runs seamlessly in local Docker Compose environments without requiring ZooKeeper/KRaft overhead, while supporting thousands of operations per second on modest resources.

### 2. Hot State Cache: Redis Key-Value & Hashes
- **Chosen:** Redis Hashes keyed by `drone:{droneId}:state` with geospatial indices (`GEOADD`).
- **Rationale:** The web dashboard and real-time alerts need instant access to the latest known state of the fleet. Hitting a relational database for frequent live queries would create unnecessary I/O contention.

### 3. Time-Series Historical Persistence: PostgreSQL with TimescaleDB
- **Chosen:** PostgreSQL + TimescaleDB extension.
- **Alternatives Considered:** MongoDB, InfluxDB, DynamoDB.
- **Rationale:** 
  - TimescaleDB automatically partitions telemetry tables into time-based chunks ("hypertables"), optimizing disk I/O and query pruning for time-range lookups.
  - Retains full SQL compatibility, relational joins with drone metadata (operators, models, maintenance history), and ACID guarantees.
  - Native chunk compression yields up to 90% disk savings on time-series telemetry.

---

## Consequences

- **Positive:**
  - Clear separation of concerns between hot state (Redis) and historical analysis (TimescaleDB).
  - Ingestion API is decoupled from processing workers via Redis Streams buffer.
  - High observability and predictable horizontal scaling.
- **Negative:**
  - Dual-write consistency must be managed (workers ensure state cache and hypertable writes).
  - TimescaleDB extension requires specific PostgreSQL container image (`timescale/timescaledb-ha`).
