import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AeroStream | Live Drone Fleet Telemetry & Diagnostics',
  description: 'Real-time telemetry streaming, geospatial monitoring, and anomaly diagnostics for autonomous drone fleets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Top Aerospace Navbar */}
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 28px',
              borderBottom: '1px solid var(--border-card)',
              background: 'rgba(7, 9, 14, 0.9)',
              backdropFilter: 'blur(10px)',
              position: 'sticky',
              top: 0,
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '18px',
                  boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
                }}
              >
                🛰️
              </div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  AeroStream
                </h1>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Fleet Telemetry Platform
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#34d399',
                }}
              >
                <span className="pulse-indicator" />
                <span>SYSTEM ONLINE</span>
              </div>
            </div>
          </header>

          <main style={{ flex: 1, padding: '24px 28px' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
