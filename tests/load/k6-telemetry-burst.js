import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// Custom metrics to measure granular SLA compliance
const telemetryIngestDuration = new Trend("telemetry_ingest_duration_ms", true);
const batchIngestDuration = new Trend("batch_ingest_duration_ms", true);
const errorRate = new Rate("telemetry_error_rate");
const ingestedPoints = new Counter("telemetry_points_total");

export const options = {
  scenarios: {
    // Scenario 1: Sustained burst of realistic telemetry ingestion
    sustained_burst: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "15s", target: 50 }, // Ramp-up to 50 active drones
        { duration: "30s", target: 150 }, // Sustained burst at 150 concurrent emitters
        { duration: "15s", target: 200 }, // Peak pressure test
        { duration: "10s", target: 0 }, // Cool-down
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    // 95% of ingestion requests must complete within 150ms
    http_req_duration: ["p(95)<150", "p(99)<300"],
    // Less than 1% error rate allowed under sustained load
    http_req_failed: ["rate<0.01"],
    telemetry_error_rate: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:3001";

// Base coordinates centered on São Paulo Congonhas terminal area
const BASE_LAT = -23.6261;
const BASE_LON = -46.6564;

function generateTelemetryPoint(droneIndex) {
  const droneId = `DRONE-BURST-${String(droneIndex).padStart(3, "0")}`;
  const jitterLat = (Math.random() - 0.5) * 0.05;
  const jitterLon = (Math.random() - 0.5) * 0.05;

  return {
    droneId,
    timestamp: new Date().toISOString(),
    status: "IN_FLIGHT",
    location: {
      latitude: parseFloat((BASE_LAT + jitterLat).toFixed(6)),
      longitude: parseFloat((BASE_LON + jitterLon).toFixed(6)),
      altitudeMeters: Math.floor(120 + Math.random() * 80),
    },
    velocity: {
      speedKmh: Math.floor(35 + Math.random() * 45),
      headingDegrees: Math.floor(Math.random() * 360),
    },
    battery: {
      percentage: Math.floor(40 + Math.random() * 60),
      voltage: parseFloat((22.0 + Math.random() * 2.5).toFixed(1)),
      temperatureCelsius: Math.floor(32 + Math.random() * 15),
    },
    sensors: {
      satelliteCount: Math.floor(18 + Math.random() * 10),
      gpsFix: "3D",
      imuHealth: true,
      signalQualityPercentage: Math.floor(80 + Math.random() * 20),
    },
    activeAlerts: [],
  };
}

export default function () {
  const droneIndex = __VU;
  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  // 80% single telemetry updates, 20% high-throughput batches
  const isBatch = Math.random() > 0.8;

  if (!isBatch) {
    const payload = JSON.stringify(generateTelemetryPoint(droneIndex));
    const res = http.post(`${BASE_URL}/api/v1/telemetry`, payload, params);

    const success = check(res, {
      "status is 201": (r) => r.status === 201,
      "has streamId": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true;
        } catch {
          return false;
        }
      },
    });

    telemetryIngestDuration.add(res.timings.duration);
    errorRate.add(!success);
    ingestedPoints.add(1);
  } else {
    // Generate a batch of 10 points
    const batchSize = 10;
    const records = Array.from({ length: batchSize }, () =>
      generateTelemetryPoint(droneIndex),
    );
    const payload = JSON.stringify({ records });

    const res = http.post(
      `${BASE_URL}/api/v1/telemetry/batch`,
      payload,
      params,
    );

    const success = check(res, {
      "status is 202": (r) => r.status === 202,
      "batch ingested count matches": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.ingestedCount === batchSize;
        } catch {
          return false;
        }
      },
    });

    batchIngestDuration.add(res.timings.duration);
    errorRate.add(!success);
    ingestedPoints.add(batchSize);
  }

  // Real-world drone telemetry ping interval (approx 100ms - 250ms)
  sleep(0.1 + Math.random() * 0.15);
}
