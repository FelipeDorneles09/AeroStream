'use client';

import React from 'react';
import type { DroneTelemetry } from '@aerostream/shared-types';

interface DroneCardProps {
  drone: DroneTelemetry;
  isSelected: boolean;
  onSelect: () => void;
}

export function DroneCard({ drone, isSelected, onSelect }: DroneCardProps) {
  const { droneId, location, battery, status, sensors } = drone;

  const getStatusColor = () => {
    switch (status) {
      case 'IN_FLIGHT':
        return 'var(--accent-green)';
      case 'RETURNING_TO_BASE':
        return 'var(--accent-amber)';
      case 'EMERGENCY_LANDING':
        return 'var(--accent-red)';
      default:
        return 'var(--accent-cyan)';
    }
  };

  const getBatteryColor = () => {
    if (battery.percentage > 50) return 'var(--accent-green)';
    if (battery.percentage > 20) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  return (
    <div
      onClick={onSelect}
      className="glass-panel"
      style={{
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-card)',
        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Top Header: ID & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>
            {droneId}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.05)',
              color: getStatusColor(),
              border: `1px solid ${getStatusColor()}`,
            }}
          >
            {status}
          </span>
        </div>

        {/* Battery Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: getBatteryColor() }}>
            {battery.percentage}%
          </span>
          <div
            style={{
              width: '24px',
              height: '10px',
              border: `1px solid ${getBatteryColor()}`,
              borderRadius: '2px',
              padding: '1px',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, battery.percentage))}%`,
                height: '100%',
                background: getBatteryColor(),
                borderRadius: '1px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Key Telemetry Indicators */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          background: 'rgba(5, 7, 10, 0.4)',
          padding: '10px',
          borderRadius: '8px',
        }}
      >
        <div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>ALTITUDE</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
            {location.altitudeMeters.toFixed(0)}m
          </span>
        </div>

        <div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>SPEED</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
            {drone.velocity.speedKmh.toFixed(0)} km/h
          </span>
        </div>

        <div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>HEADING</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
            {drone.velocity.headingDegrees.toFixed(0)}°
          </span>
        </div>
      </div>

      {/* Footer Info: Satellites & Signal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>🛰️ {sensors.satelliteCount} Sats Lock ({sensors.gpsFix})</span>
        <span>Temp: {battery.temperatureCelsius.toFixed(1)}°C</span>
      </div>
    </div>
  );
}
