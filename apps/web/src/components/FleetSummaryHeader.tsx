'use client';

import React from 'react';
import type { ConnectionState } from '../hooks/useLiveTelemetry';

interface FleetSummaryHeaderProps {
  connectionStatus: ConnectionState;
  eventsPerSec: number;
  activeCount: number;
  avgBattery: number;
  alertCount: number;
}

export function FleetSummaryHeader({
  connectionStatus,
  eventsPerSec,
  activeCount,
  avgBattery,
  alertCount,
}: FleetSummaryHeaderProps) {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'var(--accent-green)';
      case 'connecting':
        return 'var(--accent-amber)';
      case 'disconnected':
        return 'var(--accent-red)';
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'SSE Stream Active (Zero-Polling)';
      case 'connecting':
        return 'Connecting to EventSource...';
      case 'disconnected':
        return 'Stream Offline (Reconnecting)';
    }
  };

  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Autonomous Fleet Command Center
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Mission Control & Geospatial Telemetry Ingestion Node
          </p>
        </div>

        {/* Live SSE status pill */}
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            borderRadius: '20px',
            borderColor: getStatusColor(),
          }}
        >
          <span
            className="pulse-indicator"
            style={{
              backgroundColor: getStatusColor(),
              boxShadow: connectionStatus === 'connected' ? '0 0 10px var(--accent-green)' : 'none',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: getStatusColor() }}>
            {getStatusLabel()}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
            ({eventsPerSec} pkt/s)
          </span>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="glass-panel" style={{ padding: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fleet In Flight
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)' }}>{activeCount}</span>
            <span style={{ fontSize: '12px', color: 'var(--accent-green)' }}>● Active Nodes</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ingestion Influx
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-cyan)' }}>{eventsPerSec}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>events / sec</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Average Fleet Battery
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: avgBattery > 50 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {Math.round(avgBattery) || 0}%
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Autonomous State</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            System Alerts
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: alertCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {alertCount}
            </span>
            <span style={{ fontSize: '12px', color: alertCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {alertCount > 0 ? '⚠️ Active Anomalies' : '✓ Nominal'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
