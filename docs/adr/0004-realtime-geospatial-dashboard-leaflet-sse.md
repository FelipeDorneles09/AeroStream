# ADR 0004: Real-Time Geospatial Dashboard Architecture (Leaflet & Server-Sent Events)

## Status
Accepted

## Date
2026-10-22

## Context
The mission control operators require a low-latency, high-performance visual interface to track autonomous drone swarms across geographic airspace. 

Key technical requirements:
1. **Sub-second position updates**: Rendering multiple drones with real-time heading angles and trajectory breadcrumbs without UI frame drops.
2. **Minimal client overhead**: Avoid high CPU/GPU energy draw typical of heavyweight 3D engines when running on laptop hardware.
3. **Bandwidth & Connection Efficiency**: Eliminate HTTP polling overhead; receive immediate server-pushed telemetry frames.
4. **Resilience & Offline Handling**: Instant initial state population upon load and graceful reconnection during signal interruptions.

## Decision
We implemented the telemetry visualization layer utilizing **Leaflet.js** with high-contrast CartoDB Dark Matter tiles paired with an unidirectional **Server-Sent Events (SSE)** streaming consumer in Next.js 15:

1. **Lightweight 2D Geospatial Engine (Leaflet vs. Cesium / Mapbox GL)**:
   - Leaflet adds only ~42KB gzipped footprint to the initial bundle, vs. ~500KB+ for Mapbox GL or multi-megabyte WebGL runtimes.
   - High rendering throughput via custom CSS/SVG DivIcons with hardware-accelerated CSS `transform: rotate(deg)` for instantaneous heading updates.
   - Zero vendor API key dependencies or usage limits.

2. **Dual-Phase Telemetry Hydration (Snapshot + SSE Stream)**:
   - **Phase 1 (Instant Hydration)**: On component mount, the client performs a fast `GET /api/v1/fleet/live` against the Redis in-memory cache to render existing drones and their current coordinates in < 15ms.
   - **Phase 2 (Continuous Push)**: An `EventSource` connection is established to `/api/v1/telemetry/live/stream`. As incoming telemetry packets are ingested into the backend, they are broadcasted directly to the browser.

3. **Performance Optimization via Trajectory Ring Buffers**:
   - Trajectory breadcrumbs are constrained to a sliding window of the last 40 positions per drone, preventing memory leaks during long-running operational shifts.
   - Map markers are updated in-place via leaflet internal coordinate mutations rather than unmounting and recreating DOM nodes.

## Consequences

### Positive
- **Smooth 60 FPS rendering**: Low DOM overhead and minimal memory consumption.
- **Zero-Polling Network Efficiency**: HTTP connection stays open; server pushes data only when new packets arrive.
- **Strict Contract Safety**: All UI components are strictly bound to `@aerostream/shared-types` (`DroneTelemetry`), preventing runtime data drift.

### Trade-offs & Mitigations
- **2D vs 3D Horizon**: While Leaflet does not offer 3D terrain mesh altitude visualization (unlike CesiumJS), the altitude MSL is cleanly surfaced via synthetic horizon cards and altitude tags on markers, matching aviation radar standards.
