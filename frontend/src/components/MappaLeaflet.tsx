"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MarkerData {
  id: number;
  lat: number;
  lng: number;
  label: string;
  popup: string;
  color?: "green" | "blue" | "red" | "orange" | "purple";
}

interface ReverseGeoResult {
  lat: number;
  lng: number;
  indirizzo: string;
  comune: string;
  cap: string;
}

interface MappaLeafletProps {
  markers: MarkerData[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onMapClick?: (result: ReverseGeoResult) => void;
}

const MARKER_COLORS: Record<string, string> = {
  green: "#16a34a",
  blue: "#2563eb",
  red: "#dc2626",
  orange: "#ea580c",
  purple: "#7c3aed",
};

function createIcon(color: string) {
  const hex = MARKER_COLORS[color] || MARKER_COLORS.blue;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${hex}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -42],
  });
}

export default function MappaLeaflet({ markers, center, zoom = 10, height = "500px", onMapClick }: MappaLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    // Se la mappa esiste già, rimuovila
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Centro di default: Caserta
    const defaultCenter: [number, number] = center || [41.0726, 14.3371];

    const map = L.map(mapRef.current).setView(defaultCenter, zoom);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (markers.length > 0) {
      const bounds = L.latLngBounds([]);

      markers.forEach((m) => {
        const icon = createIcon(m.color || "blue");
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
        marker.bindPopup(`<div style="min-width:180px"><strong>${m.label}</strong><br/>${m.popup}</div>`);
        bounds.extend([m.lat, m.lng]);
      });

      if (markers.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40] });
      } else {
        map.setView([markers[0].lat, markers[0].lng], 14);
      }
    }

    // Reverse geocoding al click sulla mappa
    if (onMapClick) {
      const clickMarkerRef: { current: L.Marker | null } = { current: null };
      map.getContainer().style.cursor = 'crosshair';

      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;

        // Mostra marker temporaneo
        if (clickMarkerRef.current) map.removeLayer(clickMarkerRef.current);
        clickMarkerRef.current = L.marker([lat, lng], {
          icon: createIcon('purple'),
          opacity: 0.7
        }).addTo(map);
        clickMarkerRef.current.bindPopup('<div class="text-sm text-gray-500">Ricerca indirizzo...</div>').openPopup();

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'FAMI-INTEGRA/1.0 (fami-integra@aswell.eu)' } }
          );
          const data = await res.json();
          const addr = data.address || {};

          const strada = addr.road || addr.pedestrian || addr.footway || '';
          const civico = addr.house_number || '';
          const comune = addr.city || addr.town || addr.village || addr.municipality || '';
          const cap = addr.postcode || '';
          const indirizzo = civico ? `${strada} ${civico}`.trim() : strada;

          if (clickMarkerRef.current) {
            clickMarkerRef.current.setPopupContent(
              `<div style="min-width:200px">
                <strong>${indirizzo || 'Indirizzo non trovato'}</strong><br/>
                ${comune} ${cap}<br/>
                <small style="color:#666">${lat.toFixed(6)}, ${lng.toFixed(6)}</small><br/>
                <em style="color:#16a34a;font-size:12px">Clicca "Usa questo indirizzo" nel form</em>
              </div>`
            ).openPopup();
          }

          onMapClick({ lat, lng, indirizzo, comune, cap });
        } catch {
          if (clickMarkerRef.current) {
            clickMarkerRef.current.setPopupContent('<div class="text-sm text-red-500">Errore nella ricerca</div>').openPopup();
          }
        }
      });
    }

    // Fix per il resize
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [ready, markers, center, zoom]);

  if (!ready) {
    return <div style={{ height }} className="bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Caricamento mappa...</div>;
  }

  return <div ref={mapRef} style={{ height, width: "100%" }} className="rounded-lg border border-gray-200 z-0" />;
}
