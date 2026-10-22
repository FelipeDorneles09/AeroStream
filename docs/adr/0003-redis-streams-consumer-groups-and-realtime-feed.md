# ADR 0003: Redis Streams Consumer Groups & Real-Time SSE Feed

- **Status:** Accepted
- **Date:** 2026-10-22
- **Deciders:** @FelipeDorneles09

---

## Context

In high-throughput drone fleet management, thousands of telemetry packets arrive concurrently every minute. Processing every packet synchronously within the HTTP request cycle causes several critical architectural bottlenecks:
1. **Tight Coupling:** If the database experiences write locks or high I/O latency, the Ingestion API slows down, risking client timeouts or dropped packets.
2. **Backpressure Vulnerability:** Sudden bursts of telemetry (e.g., multiple drones reconnecting after a signal blackout) can exhaust HTTP server memory and worker pools.
3. **Real-Time Client Updates:** Modern web dashboards require sub-second UI updates without hammering the backend with repetitive polling (`setInterval` HTTP requests).

We need an asynchronous buffer between ingestion and processing, a resilient worker model supporting horizontal scaling, and an efficient real-time push mechanism to connected web clients.

---

## Decision

### 1. Ingestion Decoupling via Redis Streams & Consumer Groups
- **Chosen:** Redis Streams using Consumer Groups (`XREADGROUP` + `XACK`).
- **Alternatives Considered:** RabbitMQ (AMQP), Apache Kafka, AWS SQS.
- **Rationale:**
  - **Performance:** Redis Streams operates entirely in-memory with sub-millisecond append latency (`XADD`), allowing the Ingestion API to acknowledge requests in <5ms.
  - **Consumer Group Semantics:** Enables multiple worker instances to share a single stream (`telemetry-processors`), distributing message load evenly without duplicate processing.
  - **At-Least-Once Delivery:** Messages remain in the Pending Entries List (PEL) until explicitly acknowledged with `XACK`. If a worker crashes mid-processing, unprocessed messages can be claimed by another worker.
  - **Memory Bounded (FinOps):** Using approximate trimming (`MAXLEN ~ 100000`) prevents unbounded Redis memory consumption during worker downtimes.

### 2. Dual-Layer Hot State Cache with Geospatial Indexing
- **Chosen:** Redis Hashes (`drone:<id>:state`) combined with `GEOADD fleet:geopos`.
- **Rationale:**
  - Relational queries to TimescaleDB for "current position of 100 drones" introduce disk I/O contention.
  - Hashes provide $\mathcal{O}(1)$ reads and writes for drone attributes.
  - Redis native `GEOSEARCH` allows sub-2ms proximity searches (e.g., "find all drones within 10 km of coordinate X, Y").

### 3. Web Dashboard Push: Server-Sent Events (SSE) over WebSockets
- **Chosen:** Server-Sent Events (`text/event-stream`).
- **Alternatives Considered:** WebSockets, Polling (`GET /fleet/live` every 1s).
- **Rationale:**
  - **Unidirectional Efficiency:** The fleet telemetry dashboard is primarily a read-only stream from server to client. WebSockets bidirectional framing adds unnecessary handshake overhead, ping-pong heartbeat maintenance, and stateful socket complexity.
  - **Native Browser Resilience:** SSE is built directly into standard browser APIs (`EventSource`) with automated reconnection, backoff, and event IDs.
  - **HTTP/2 Compatibility:** Works seamlessly over standard HTTP ports, avoiding firewall blocks and proxy issues commonly encountered with WebSocket upgrades.

---

## Consequences

- **Positive:**
  - Ingestion latency reduced to sub-5ms.
  - Workers can be horizontally scaled by adding more worker processes to the same consumer group.
  - Frontend receives continuous 1Hz updates without polling overhead.
  - Geospatial queries executed in sub-2ms directly from Redis memory.
- **Negative:**
  - Requires maintaining an active Redis instance.
  - Workers must handle transient Redis reconnection events gracefully.
