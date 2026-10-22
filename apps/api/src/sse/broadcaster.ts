import { ServerResponse } from 'http';
import { DroneTelemetry } from '@aerostream/shared-types';

class TelemetryBroadcaster {
  private clients: Set<ServerResponse> = new Set();

  /**
   * Registers a new SSE client connection
   */
  addClient(res: ServerResponse): void {
    this.clients.add(res);

    // Send immediate initial handshake
    res.write(`data: ${JSON.stringify({ type: 'HANDSHAKE', message: 'Connected to AeroStream Live Telemetry Feed' })}\n\n`);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  /**
   * Broadcasts a telemetry packet to all connected web clients in real time
   */
  broadcastTelemetry(telemetry: DroneTelemetry): void {
    if (this.clients.size === 0) return;

    const payload = `data: ${JSON.stringify({ type: 'TELEMETRY_UPDATE', payload: telemetry })}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Broadcasts urgent system alerts to all connected clients
   */
  broadcastAlert(droneId: string, alert: string, severity: 'WARNING' | 'CRITICAL'): void {
    if (this.clients.size === 0) return;

    const payload = `event: alert\ndata: ${JSON.stringify({ droneId, alert, severity, timestamp: new Date().toISOString() })}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Number of currently connected real-time clients
   */
  get clientCount(): number {
    return this.clients.size;
  }
}

export const telemetryBroadcaster = new TelemetryBroadcaster();
