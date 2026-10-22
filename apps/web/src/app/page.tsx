import React from 'react';

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Status & Metrics Grid */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="glass-panel" style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Drones
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)' }}>5</span>
            <span style={{ fontSize: '13px', color: 'var(--accent-green)' }}>● In Flight</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Stream Ingestion Latency
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-cyan)' }}>&lt; 5 ms</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>via Redis Streams</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Database Storage
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)' }}>TimescaleDB</span>
            <span style={{ fontSize: '13px', color: 'var(--accent-green)' }}>Hypertables Active</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Feed Protocol
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)' }}>SSE (Push)</span>
            <span style={{ fontSize: '13px', color: 'var(--accent-cyan)' }}>Zero-Polling</span>
          </div>
        </div>
      </section>

      {/* Main Monitoring Deck Shell */}
      <section
        className="glass-panel"
        style={{
          padding: '28px',
          minHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          border: '1px dashed var(--border-active)',
          background: 'rgba(13, 18, 31, 0.4)',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛰️</div>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
          AeroStream Live Fleet Command Deck
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '520px', lineHeight: 1.6, fontSize: '14px' }}>
          Next.js App Router workspace successfully scaffolded. The upcoming step connects the interactive geospatial Leaflet/Radar map and real-time Server-Sent Events (SSE) telemetry subscribers.
        </p>
      </section>
    </div>
  );
}
