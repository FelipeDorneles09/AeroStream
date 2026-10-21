import dotenv from 'dotenv';
import path from 'path';
import { DroneAgent } from './domain/drone-agent.js';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const INGESTION_URL = process.env.API_INGESTION_URL || 'http://localhost:3000/api/v1/telemetry';
const DRONE_COUNT = parseInt(process.env.SIMULATOR_DRONE_COUNT || '5', 10);
const TICK_INTERVAL_MS = parseInt(process.env.SIMULATOR_INTERVAL_MS || '1000', 10);
const ANOMALY_PROBABILITY = parseFloat(process.env.SIMULATOR_ANOMALY_PROBABILITY || '0.05');

// Base coordinates around São Paulo / Flight Zone
const BASE_LAT = -23.55052;
const BASE_LON = -46.633308;

function initializeFleet(count: number): DroneAgent[] {
  const fleet: DroneAgent[] = [];
  for (let i = 1; i <= count; i++) {
    const id = i <= 2 ? `DRONE-ALPHA-0${i}` : (i <= 4 ? `DRONE-BETA-0${i - 2}` : `DRONE-GAMMA-0${i - 4}`);
    fleet.push(
      new DroneAgent({
        droneId: id,
        initialLat: BASE_LAT + (Math.random() - 0.5) * 0.05,
        initialLon: BASE_LON + (Math.random() - 0.5) * 0.05,
        baseAltitude: 80 + Math.random() * 50
      })
    );
  }
  return fleet;
}

async function sendTelemetry(payload: unknown): Promise<boolean> {
  try {
    const response = await fetch(INGESTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (err: any) {
    return false;
  }
}

async function runSimulator() {
  console.log(`=======================================================`);
  console.log(`🛰️  AeroStream Fleet Simulator Initialized`);
  console.log(`📡 Ingestion Target : ${INGESTION_URL}`);
  console.log(`🚁 Active Drones    : ${DRONE_COUNT}`);
  console.log(`⏱️  Telemetry Rate  : Every ${TICK_INTERVAL_MS}ms`);
  console.log(`=======================================================\n`);

  const fleet = initializeFleet(DRONE_COUNT);
  let totalPacketsSent = 0;
  let failedPackets = 0;

  setInterval(async () => {
    for (const drone of fleet) {
      const triggerAnomaly = Math.random() < ANOMALY_PROBABILITY;
      const telemetry = drone.tick(TICK_INTERVAL_MS / 1000, triggerAnomaly);

      const ok = await sendTelemetry(telemetry);
      if (ok) {
        totalPacketsSent++;
      } else {
        failedPackets++;
      }

      if (triggerAnomaly) {
        console.log(`⚠️  [Simulated Anomaly] Injected low satellite count on ${drone.droneId} (Sats: ${telemetry.sensors.satelliteCount})`);
      }
    }

    process.stdout.write(
      `\r📊 Telemetry Stream: ${totalPacketsSent} sent | ${failedPackets} failed | Fleet Size: ${fleet.length}`
    );
  }, TICK_INTERVAL_MS);
}

runSimulator();
