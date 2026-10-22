'use client';

import React from 'react';
import type { AlertNotification } from '../hooks/useLiveTelemetry';

interface AlertBannerProps {
  alerts: AlertNotification[];
  onDismiss: (id: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {alerts.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className="glass-panel"
          style={{
            padding: '12px 16px',
            borderColor: 'var(--accent-red)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-red)', marginRight: '8px' }}>
                [{alert.droneId}]
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                {alert.message}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {alert.timestamp}
            </span>
            <button
              onClick={() => onDismiss(alert.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '2px 6px',
              }}
              title="Dismiss Alert"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
