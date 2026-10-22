'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLiveTelemetry } from '../hooks/useLiveTelemetry';
import { FleetSummaryHeader } from '../components/FleetSummaryHeader';
import { AlertBanner } from '../components/AlertBanner';
import { DroneCard } from '../components/DroneCard';
import { DroneDetailPanel } from '../components/DroneDetailPanel';

// Dynamic import with SSR disabled to prevent Leaflet window reference errors
const FleetMap = dynamic(
  () => import('../components/FleetMap').then((mod) => mod.FleetMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="glass-panel"
        style={{
          height: '520px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <span className="pulse-indicator" style={{ width: '14px', height: '14px' }} />
        <span style={{ fontSize: '13px', fontWeight: 500 }}>
          Initializing Geospatial Radar Engine & CartoDB Layers...
        </span>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const {
    droneList,
    flightPaths,
    connectionStatus,
    eventsPerSec,
    alerts,
    dismissAlert,
  } = useLiveTelemetry();

  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const selectedDrone = droneList.find((d) => d.droneId === selectedDroneId) || null;

  const filteredDrones = droneList.filter((d) =>
    d.droneId.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const avgBattery =
    droneList.length > 0
      ? droneList.reduce((acc, curr) => acc + curr.battery.percentage, 0) / droneList.length
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Metrics Bar */}
      <FleetSummaryHeader
        connectionStatus={connectionStatus}
        eventsPerSec={eventsPerSec}
        activeCount={droneList.length}
        avgBattery={avgBattery}
        alertCount={alerts.length}
      />

      {/* Critical Anomaly Alerts */}
      <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

      {/* Main Operations Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Interactive Geospatial Fleet Map */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '4px', overflow: 'hidden' }}>
            <FleetMap
              drones={droneList}
              flightPaths={flightPaths}
              selectedDroneId={selectedDroneId}
              onSelectDrone={(id) => setSelectedDroneId(id)}
            />
          </div>

          {/* Quick Stats Footnote */}
          <div
            className="glass-panel"
            style={{
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <div>
              <span>Storage Node: </span>
              <strong style={{ color: 'var(--text-main)' }}>TimescaleDB Hypertables</strong>
            </div>
            <div>
              <span>Ingestion Buffer: </span>
              <strong style={{ color: 'var(--accent-cyan)' }}>Redis Streams (Consumer Groups)</strong>
            </div>
            <div>
              <span>Push Protocol: </span>
              <strong style={{ color: 'var(--accent-green)' }}>Server-Sent Events (SSE)</strong>
            </div>
          </div>
        </section>

        {/* Right Column: Detailed Inspector & Fleet Roster */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Detailed Selected Drone Horizon */}
          <DroneDetailPanel
            drone={selectedDrone}
            onClose={() => setSelectedDroneId(null)}
          />

          {/* Active Fleet Roster Panel */}
          <div
            className="glass-panel"
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '480px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                Active Drones ({filteredDrones.length})
              </h3>
              <input
                type="text"
                placeholder="Filter drone ID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  background: 'rgba(5, 7, 10, 0.6)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                  width: '130px',
                  outline: 'none',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {filteredDrones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No active drones matching criteria.
                </div>
              ) : (
                filteredDrones.map((drone) => (
                  <DroneCard
                    key={drone.droneId}
                    drone={drone}
                    isSelected={selectedDroneId === drone.droneId}
                    onSelect={() => setSelectedDroneId(drone.droneId)}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
