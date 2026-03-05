"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ComuneProgetto {
  id: number;
  nome: string;
  provincia?: string;
  indirizzo_sede?: string;
  responsabile?: string;
  telefono_sede?: string;
  latitudine?: number;
  longitudine?: number;
  attivo?: boolean;
}

interface MappaComuniProgettoProps {
  comuni: ComuneProgetto[];
  height?: string;
}

export default function MappaComuniProgetto({ comuni, height = "500px" }: MappaComuniProgettoProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || comuni.length === 0) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current).setView([41.07, 14.34], 8);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Marker sedi operative
    const comuniNomi = comuni.filter(c => c.attivo).map(c => c.nome.toLowerCase());
    const bounds = L.latLngBounds([]);
    let hasMarkers = false;

    comuni.forEach(c => {
      if (c.latitudine && c.longitudine) {
        hasMarkers = true;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#16a34a" stroke="#fff" stroke-width="1.5"/>
          <circle cx="12" cy="12" r="5" fill="#fff"/>
        </svg>`;
        const icon = L.divIcon({ html: svg, className: "", iconSize: [32, 48], iconAnchor: [16, 48], popupAnchor: [0, -48] });

        const marker = L.marker([c.latitudine, c.longitudine], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="min-width:200px">
            <strong style="font-size:14px">${c.nome}</strong><br/>
            ${c.indirizzo_sede ? `<small>${c.indirizzo_sede}</small><br/>` : ""}
            ${c.responsabile ? `<small>Resp: ${c.responsabile}</small><br/>` : ""}
            ${c.telefono_sede ? `<small>Tel: ${c.telefono_sede}</small><br/>` : ""}
            <em style="color:#16a34a;font-size:11px">Sede operativa</em>
          </div>
        `);
        bounds.extend([c.latitudine, c.longitudine]);
      }
    });

    if (hasMarkers) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }

    // Carica GeoJSON confini — solo i comuni del progetto
    fetch("/geo/comuni_campania_puglia.geojson")
      .then(r => r.json())
      .then(geojson => {
        const filtered = {
          ...geojson,
          features: geojson.features.filter((f: any) =>
            comuniNomi.includes((f.properties?.name || "").toLowerCase())
          )
        };

        const geoLayer = L.geoJSON(filtered, {
          style: () => ({
            fillColor: "#16a34a",
            fillOpacity: 0.2,
            color: "#16a34a",
            weight: 2.5,
            dashArray: "5 3",
          }),
          onEachFeature: (feature, layer) => {
            const name = feature?.properties?.name || "";
            const prov = feature?.properties?.prov_name || "";
            const comuneData = comuni.find(c => c.nome.toLowerCase() === name.toLowerCase());
            layer.bindPopup(`<div>
              <strong>${name}</strong> <small>(${prov})</small><br/>
              ${comuneData?.indirizzo_sede ? `Sede: ${comuneData.indirizzo_sede}<br/>` : ""}
              ${comuneData?.responsabile ? `Resp: ${comuneData.responsabile}<br/>` : ""}
            </div>`);
          }
        }).addTo(map);

        if (!hasMarkers && filtered.features.length > 0) {
          map.fitBounds(geoLayer.getBounds(), { padding: [50, 50], maxZoom: 12 });
        }
      })
      .catch(() => console.error("Errore caricamento GeoJSON confini"));

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [comuni]);

  return <div ref={mapRef} style={{ height, width: "100%" }} className="rounded-lg border border-gray-200 z-0" />;
}
