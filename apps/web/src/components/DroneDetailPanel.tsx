'use client';

import React from 'react';
import type { DroneTelemetry } from '@aerostream/shared-types';

interface DroneDetailPanelProps {
  drone: DroneTelemetry | null;
  onClose: () => void;
}

export function DroneDetailPanel({ drone, onClose }: DroneDetailPanelProps) {
  if (!drone) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '260px',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ fontSize: '32px', marginBottom: '8px' }}>📡</span>
        <p style={{ fontSize: '14px', fontWeight: 500 }}>Select a drone from the fleet or map</p>
        <p style={{ fontSize: '12px', marginTop: '4px' }}>Click any drone marker or list item to view real-time avionics telemetry.</p>
      </div>
    );
  }

  const { droneId, location, battery, sensors, status, timestamp } = drone;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: '1px solid var(--accent-cyan)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
              {droneId}
            </h3>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.1)',
                color: 'var(--accent-cyan)',
                border: '1px solid var(--border-active)',
              }}
            >
              {status}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Last Ping: {new Date(timestamp).toLocaleTimeString()}
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-card)',
            color: 'var(--text-muted)',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Close ✕
        </button>
      </div>

      {/* Primary Avionics Horizon Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div style={{ background: 'rgba(5, 7, 10, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>SPEED</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
            {drone.velocity.speedKmh.toFixed(0)} km/h
          </span>
        </div>

        <div style={{ background: 'rgba(5, 7, 10, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>HEADING</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {drone.velocity.headingDegrees.toFixed(0)}°
          </span>
        </div>

        <div style={{ background: 'rgba(5, 7, 10, 0.5)', padding: '10px', borderRadius: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>GPS FIX</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: sensors.imuHealth ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
            {sensors.gpsFix}
          </span>
        </div>
      </div>

      {/* Geospatial Coordinates */}
      <div style={{ background: 'rgba(5, 7, 10, 0.5)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Latitude</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{location.latitude.toFixed(6)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Longitude</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{location.longitude.toFixed(6)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Altitude (MSL)</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{location.altitudeMeters.toFixed(1)} m</span>
        </div>
      </div>

      {/* Power & Electrical Subsystem */}
      <div style={{ background: 'rgba(5, 7, 10, 0.5)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Power & Thermal Subsystem
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Battery Level</span>
          <span style={{ fontWeight: 600, color: battery.percentage > 30 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {battery.percentage}%
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Pack Voltage</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{battery.voltage.toFixed(2)} V</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Cell Temperature</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>{battery.temperatureCelsius.toFixed(1)} °C</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>RF Signal Quality</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--accent-green)' }}>{sensors.signalQualityPercentage}%</span>
        </div>
      </div>
    </div>
  );
}
