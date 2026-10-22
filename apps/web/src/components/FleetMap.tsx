'use client';

import React, { useEffect, useRef } from 'react';
import type { DroneTelemetry } from '@aerostream/shared-types';
import L from 'leaflet';

interface FleetMapProps {
  drones: DroneTelemetry[];
  flightPaths: Record<string, [number, number][]>;
  selectedDroneId: string | null;
  onSelectDrone: (id: string) => void;
}

export function FleetMap({
  drones,
  flightPaths,
  selectedDroneId,
  onSelectDrone,
}: FleetMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const polylineRef = useRef<L.Polyline | null>(null);
  const [mapMode, setMapMode] = React.useState<'radar' | 'satellite'>('radar');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center (e.g., São Paulo airspace test zone)
    const map = L.map(mapContainerRef.current, {
      center: [-23.5505, -46.6333],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial base tile layer (OpenStreetMap Radar)
    const baseLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      className: 'radar-tiles',
    }).addTo(map);

    tileLayerRef.current = baseLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Map Mode Toggle (Radar vs Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (mapMode === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri &copy; OpenStreetMap contributors',
          maxZoom: 19,
        }
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
          className: 'radar-tiles',
        }
      ).addTo(map);
    }
  }, [mapMode]);

  // Update Markers when drones change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = markersRef.current;

    drones.forEach((drone) => {
      const { droneId, location, status, battery } = drone;
      const isSelected = selectedDroneId === droneId;

      let haloClass = '';
      let markerColor = 'var(--accent-cyan)';
      if (battery.percentage < 20 || status === 'EMERGENCY_LANDING') {
        haloClass = 'critical';
        markerColor = 'var(--accent-red)';
      } else if (battery.percentage < 40 || status === 'RETURNING_TO_BASE') {
        haloClass = 'warning';
        markerColor = 'var(--accent-amber)';
      }

      // Aerospace Quadcopter / Jet Icon SVG
      const customHtml = `
        <div class="drone-marker-container" style="cursor: pointer;">
          <div class="drone-marker-halo ${haloClass}" style="${isSelected ? 'border-color: #38bdf8; width: 46px; height: 46px;' : ''}"></div>
          <div style="
            transform: rotate(${drone.velocity.headingDegrees}deg);
            transition: transform 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: rgba(13, 18, 31, 0.9);
            border: 2px solid ${isSelected ? '#38bdf8' : markerColor};
            border-radius: 50%;
            box-shadow: 0 0 12px ${isSelected ? '#38bdf8' : markerColor};
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSelected ? '#38bdf8' : markerColor}">
              <path d="M12 2L19 21L12 17L5 21L12 2Z" />
            </svg>
          </div>
          <div style="
            position: absolute;
            top: 36px;
            background: rgba(5, 7, 10, 0.85);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-family: monospace;
            white-space: nowrap;
            color: #f1f5f9;
            border: 1px solid rgba(255,255,255,0.1);
          ">
            ${droneId} · ${Math.round(location.altitudeMeters)}m
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-drone-div-icon',
        html: customHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (currentMarkers[droneId]) {
        currentMarkers[droneId].setLatLng([location.latitude, location.longitude]);
        currentMarkers[droneId].setIcon(icon);
      } else {
        const marker = L.marker([location.latitude, location.longitude], { icon })
          .addTo(map)
          .on('click', () => onSelectDrone(droneId));

        currentMarkers[droneId] = marker;
      }
    });

    // Remove stale drone markers
    const activeIds = new Set(drones.map((d) => d.droneId));
    Object.keys(currentMarkers).forEach((id) => {
      if (!activeIds.has(id)) {
        currentMarkers[id].remove();
        delete currentMarkers[id];
      }
    });
  }, [drones, selectedDroneId, onSelectDrone]);

  // Update Breadcrumbs Polyline for Selected Drone
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (selectedDroneId && flightPaths[selectedDroneId]) {
      const path = flightPaths[selectedDroneId];
      if (path.length > 1) {
        polylineRef.current = L.polyline(path, {
          color: '#38bdf8',
          weight: 3,
          opacity: 0.8,
          dashArray: '4, 8',
        }).addTo(map);

        // Pan to selected drone smoothly
        const lastPoint = path[path.length - 1];
        map.panTo(lastPoint, { animate: true, duration: 0.8 });
      }
    }
  }, [selectedDroneId, flightPaths]);

  const fitFleetBounds = () => {
    const map = mapInstanceRef.current;
    if (!map || drones.length === 0) return;

    const bounds = L.latLngBounds(
      drones.map((d) => [d.location.latitude, d.location.longitude])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '520px', borderRadius: '12px', overflow: 'hidden' }}>
      <div
        ref={mapContainerRef}
        className={mapMode === 'radar' ? 'radar-mode' : ''}
        style={{ width: '100%', height: '100%', minHeight: '520px' }}
      />

      {/* Map Overlay Controls */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={() => setMapMode(mapMode === 'radar' ? 'satellite' : 'radar')}
          style={{
            background: 'rgba(13, 18, 31, 0.85)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-card)',
            backdropFilter: 'blur(8px)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-cyan)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-card)')}
        >
          {mapMode === 'radar' ? '🛰️ Satellite View' : '📡 Tactical Radar'}
        </button>

        <button
          onClick={fitFleetBounds}
          style={{
            background: 'rgba(13, 18, 31, 0.85)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-card)',
            backdropFilter: 'blur(8px)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-cyan)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-card)')}
        >
          🎯 Center Fleet
        </button>
      </div>

      {/* Map Airspace Indicator Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 1000,
          background: 'rgba(13, 18, 31, 0.85)',
          border: '1px solid var(--border-card)',
          backdropFilter: 'blur(8px)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span className="pulse-indicator" />
        <span>LIVE AIRSPACE TELEMETRY LAYER</span>
      </div>
    </div>
  );
}
