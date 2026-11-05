import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const stressLatency = new Trend("stress_req_duration_ms", true);
const errorRate = new Rate("stress_error_rate");
const totalPackets = new Counter("stress_total_packets");

export const options = {
  scenarios: {
    stress_ramp: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "20s", target: 100 }, // Warm-up to 100 VUs
        { duration: "30s", target: 300 }, // High pressure: 300 VUs
        { duration: "30s", target: 500 }, // Extreme saturation: 500 VUs
        { duration: "15s", target: 0 }, // Ramp-down
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    // Under extreme stress, allow p(95) < 300ms
    http_req_duration: ["p(95)<300", "p(99)<600"],
    http_req_failed: ["rate<0.05"], // Max 5% drop rate under overload
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:3001";

export default function () {
  const droneId = `DRONE-STRESS-${String(__VU).padStart(4, "0")}`;
  const payload = JSON.stringify({
    droneId,
    timestamp: new Date().toISOString(),
    status: "IN_FLIGHT",
    location: {
      latitude: -23.5505 + (Math.random() - 0.5) * 0.1,
      longitude: -46.6333 + (Math.random() - 0.5) * 0.1,
      altitudeMeters: 150,
    },
    velocity: {
      speedKmh: 50,
      headingDegrees: 180,
    },
    battery: {
      percentage: 85,
      voltage: 23.5,
      temperatureCelsius: 38,
    },
    sensors: {
      satelliteCount: 22,
      gpsFix: "3D",
      imuHealth: true,
      signalQualityPercentage: 95,
    },
    activeAlerts: [],
  });

  const res = http.post(`${BASE_URL}/api/v1/telemetry`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  const success = check(res, {
    "status is 201": (r) => r.status === 201,
  });

  stressLatency.add(res.timings.duration);
  errorRate.add(!success);
  totalPackets.add(1);

  sleep(0.05); // High-frequency stream: ~20 requests per VU per second
}
