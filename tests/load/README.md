# AeroStream Load & Performance Benchmarks (k6)

This directory contains automated load and stress testing suites implemented with [k6](https://k6.io/) to evaluate the throughput, latency percentiles (p95, p99), and breaking points of the AeroStream Telemetry Ingestion Pipeline.

---

## Benchmark Scenarios

### 1. `k6-telemetry-burst.js` (Realistic Flight Fleet Burst)

- **Goal:** Simulates a burst of up to 200 concurrent autonomous drones streaming real-time telemetry into the Fastify ingestion API.
- **Mix:** 80% single telemetry updates (`POST /api/v1/telemetry`) and 20% batched telemetry packets (`POST /api/v1/telemetry/batch`).
- **SLA Thresholds:**
  - `p(95) < 150 ms`
  - `p(99) < 300 ms`
  - `http_req_failed < 1%`

### 2. `k6-stress-test.js` (System Saturation & Limit Finding)

- **Goal:** Stresses the API up to 500 Virtual Users emitting at 20 Hz (~5,000 to 10,000 req/s) to observe Redis Streams buffering dynamics and identify memory/CPU bottlenecks.
- **Thresholds:**
  - `p(95) < 300 ms`
  - `http_req_failed < 5%`

---

## How to Run

### Option A: Using Local k6 Binary

If k6 is installed on your machine:

```bash
# Run realistic fleet burst test
npm run test:load

# Run extreme stress test
npm run test:stress

# Override target API URL (e.g., against staging or remote cluster)
k6 run -e API_URL=http://your-server:3001 tests/load/k6-telemetry-burst.js
```

### Option B: Using Docker (No local k6 install needed)

```bash
# Run against local API (port 3001) using host network
docker run --rm -i --network=host grafana/k6 run - <tests/load/k6-telemetry-burst.js
```

---

## Real-Time Observability during Load Tests

While running k6 benchmarks, open Grafana at `http://localhost:3000` (credentials: `admin` / `admin`).
The **AeroStream: Mission Control & Fleet Observability** dashboard will display live telemetry ingestion rates, p95/p99 latency curves, and Redis/TimescaleDB write metrics side-by-side with k6 output.
