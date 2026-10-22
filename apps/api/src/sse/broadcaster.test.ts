import { describe, it, expect, vi } from 'vitest';
import { telemetryBroadcaster } from './broadcaster.js';

describe('TelemetryBroadcaster (SSE)', () => {
  it('should register client, send initial handshake and track clientCount', () => {
    const mockRes: any = {
      write: vi.fn(),
      on: vi.fn()
    };

    const initialCount = telemetryBroadcaster.clientCount;
    telemetryBroadcaster.addClient(mockRes);

    expect(telemetryBroadcaster.clientCount).toBe(initialCount + 1);
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('HANDSHAKE')
    );
  });

  it('should broadcast telemetry packets to active clients', () => {
    const mockRes: any = {
      write: vi.fn(),
      on: vi.fn()
    };

    telemetryBroadcaster.addClient(mockRes);

    const telemetry: any = {
      droneId: 'DRONE-SSE-01',
      status: 'IN_FLIGHT',
      location: { latitude: -23.5, longitude: -46.6, altitudeMeters: 100 }
    };

    telemetryBroadcaster.broadcastTelemetry(telemetry);

    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('TELEMETRY_UPDATE')
    );
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('DRONE-SSE-01')
    );
  });
});
