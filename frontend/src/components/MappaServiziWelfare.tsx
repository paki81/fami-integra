"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface EnteWelfare {
  id: number;
  nome_ente: string;
  comune_erogatore: string;
  indirizzo_sede?: string;
  contatto?: string;
  latitudine?: number;
  longitudine?: number;
  categorie?: string[];
  servizi?: { categoria: string }[];
}

interface MappaServiziWelfareProps {
  enti: EnteWelfare[];
  height?: string;
}

const categoriaColore: Record<string, string> = {
  "Sanitario": "#dc2626",
  "Psicologico": "#9333ea",
  "Socio-assist.": "#ea580c",
  "Antiviolenza": "#ec4899",
  "Istruzione / Lingua": "#2563eb",
  "Supporto Legale": "#4f46e5",
  "Mediazione": "#0d9488",
  "Supporto Amm.vo": "#0891b2",
  "Associazioni Religiose": "#d97706",
  "Associazioni Culturali": "#059669",
  "Associazioni Sportive": "#65a30d",
  "Altro": "#6b7280",
};

export default function MappaServiziWelfare({ enti, height = "450px" }: MappaServiziWelfareProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

    const map = L.map(mapRef.current).setView([41.46, 15.54], 10);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const geoEnti = enti.filter(e => e.latitudine && e.longitudine);
    if (geoEnti.length === 0) {
      setTimeout(() => map.invalidateSize(), 100);
      return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
    }

    const bounds = L.latLngBounds([]);

    geoEnti.forEach(e => {
      const cats = e.categorie || e.servizi?.map(s => s.categoria) || [];
      const colore = cats.length > 0 ? (categoriaColore[cats[0]] || "#16a34a") : "#16a34a";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${colore}" stroke="#fff" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="5" fill="#fff"/>
      </svg>`;
      const icon = L.divIcon({ html: svg, className: "", iconSize: [28, 42], iconAnchor: [14, 42], popupAnchor: [0, -42] });

      const catBadges = cats.map(c => {
        const col = categoriaColore[c] || "#6b7280";
        return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;background:${col}22;color:${col};font-size:10px;font-weight:600;margin:1px 2px">${c}</span>`;
      }).join("");

      const marker = L.marker([e.latitudine!, e.longitudine!], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="min-width:200px">
          <strong style="font-size:13px">${e.nome_ente}</strong><br/>
          <small style="color:#666">${e.comune_erogatore}</small><br/>
          ${e.indirizzo_sede ? `<small>${e.indirizzo_sede}</small><br/>` : ""}
          ${e.contatto ? `<small>Contatto: ${e.contatto}</small><br/>` : ""}
          <div style="margin-top:4px">${catBadges}</div>
        </div>
      `);
      bounds.extend([e.latitudine!, e.longitudine!]);
    });

    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    setTimeout(() => map.invalidateSize(), 100);

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [enti]);

  return <div ref={mapRef} style={{ height, width: "100%" }} className="rounded-lg border border-gray-200 z-0" />;
}
