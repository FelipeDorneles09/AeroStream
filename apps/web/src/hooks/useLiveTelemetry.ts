'use client';

import { useState, useEffect, useRef } from 'react';
import type { DroneTelemetry } from '@aerostream/shared-types';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export interface AlertNotification {
  id: string;
  droneId: string;
  type: 'BATTERY_LOW' | 'CRITICAL_ALTITUDE' | 'DEGRADED_SATELLITES' | 'SIGNAL_WARNING';
  message: string;
  timestamp: string;
}

export function useLiveTelemetry() {
  const [drones, setDrones] = useState<Record<string, DroneTelemetry>>({});
  const [flightPaths, setFlightPaths] = useState<Record<string, [number, number][]>>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('connecting');
  const [eventsPerSec, setEventsPerSec] = useState<number>(0);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  
  const eventCounterRef = useRef<number>(0);

  // Measure events per second
  useEffect(() => {
    const interval = setInterval(() => {
      setEventsPerSec(eventCounterRef.current);
      eventCounterRef.current = 0;
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check anomalies and trigger alert notifications
  const processAlerts = (data: DroneTelemetry) => {
    const newAlerts: AlertNotification[] = [];

    if (data.battery.percentage < 20) {
      newAlerts.push({
        id: `${data.droneId}-bat-${Date.now()}`,
        droneId: data.droneId,
        type: 'BATTERY_LOW',
        message: `Low Battery Warning: ${data.battery.percentage}% remaining (${data.battery.voltage.toFixed(1)}V)`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }

    if (data.location.altitudeMeters < 10 && data.status === 'IN_FLIGHT') {
      newAlerts.push({
        id: `${data.droneId}-alt-${Date.now()}`,
        droneId: data.droneId,
        type: 'CRITICAL_ALTITUDE',
        message: `Critical Altitude: Flying at ${data.location.altitudeMeters.toFixed(1)}m`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }

    if (data.sensors.satelliteCount < 6) {
      newAlerts.push({
        id: `${data.droneId}-sat-${Date.now()}`,
        droneId: data.droneId,
        type: 'DEGRADED_SATELLITES',
        message: `Degraded GPS Satellite Lock: Only ${data.sensors.satelliteCount} satellites visible`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 10));
    }
  };

  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;

    // Initial snapshot fetch from Redis hot cache
    const fetchSnapshot = async () => {
      try {
        const res = await fetch('/api/v1/fleet/live');
        if (res.ok) {
          const body = await res.json();
          if (isMounted && Array.isArray(body.drones)) {
            const initialMap: Record<string, DroneTelemetry> = {};
            const initialPaths: Record<string, [number, number][]> = {};
            for (const drone of body.drones) {
              if (drone && drone.droneId && drone.location && typeof drone.location.latitude === 'number') {
                initialMap[drone.droneId] = drone;
                initialPaths[drone.droneId] = [[drone.location.latitude, drone.location.longitude]];
              }
            }
            setDrones(initialMap);
            setFlightPaths(initialPaths);
          }
        }
      } catch (err) {
        console.warn('Initial fleet snapshot fetch failed, awaiting SSE stream...', err);
      }
    };

    fetchSnapshot();

    // Connect to Server-Sent Events stream
    const connectSSE = () => {
      setConnectionStatus('connecting');
      eventSource = new EventSource('/api/v1/telemetry/live/stream');

      eventSource.onopen = () => {
        if (isMounted) setConnectionStatus('connected');
      };

      const handleTelemetryMessage = (raw: string) => {
        try {
          const parsed = JSON.parse(raw);

          // Support both enveloped SSE { type: 'TELEMETRY_UPDATE', payload: ... } and raw DroneTelemetry
          const telemetry: DroneTelemetry | null =
            parsed?.type === 'TELEMETRY_UPDATE' && parsed?.payload
              ? parsed.payload
              : parsed?.droneId && parsed?.location
              ? parsed
              : null;

          // Ignore non-telemetry events (e.g. HANDSHAKE, heartbeat pings)
          if (!telemetry || !telemetry.droneId || !telemetry.location || typeof telemetry.location.latitude !== 'number') {
            return;
          }

          eventCounterRef.current += 1;

          setDrones((prev) => ({
            ...prev,
            [telemetry.droneId]: telemetry,
          }));

          setFlightPaths((prev) => {
            const existing = prev[telemetry.droneId] || [];
            const updated = [
              ...existing,
              [telemetry.location.latitude, telemetry.location.longitude] as [number, number],
            ];
            // Keep last 40 breadcrumbs
            return {
              ...prev,
              [telemetry.droneId]: updated.slice(-40),
            };
          });

          processAlerts(telemetry);
        } catch {
          // ignore non-json messages like heartbeats
        }
      };

      eventSource.addEventListener('telemetry', (e: MessageEvent) => {
        handleTelemetryMessage(e.data);
      });

      eventSource.onmessage = (e: MessageEvent) => {
        handleTelemetryMessage(e.data);
      };

      eventSource.onerror = () => {
        if (isMounted) {
          setConnectionStatus('disconnected');
          eventSource?.close();
          // Retry reconnection in 3 seconds
          setTimeout(() => {
            if (isMounted) connectSSE();
          }, 3000);
        }
      };
    };

    connectSSE();

    return () => {
      isMounted = false;
      eventSource?.close();
    };
  }, []);

  return {
    drones,
    droneList: Object.values(drones),
    flightPaths,
    connectionStatus,
    eventsPerSec,
    alerts,
    dismissAlert: (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id)),
  };
}
