"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { comuniApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface ComuneAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectFull?: (nome: string, provincia: string, sigla: string) => void;
  placeholder?: string;
  className?: string;
}

interface Comune {
  nome: string;
  provincia: string;
  sigla: string;
  regione: string;
  cap: string;
}

export default function ComuneAutocomplete({ value, onChange, onSelectFull, placeholder = "Cerca comune...", className }: ComuneAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<Comune[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await comuniApi.search(q);
      setResults(res.data);
      setOpen(res.data.length > 0);
      setHighlighted(-1);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 250);
  };

  const handleSelect = (comune: Comune) => {
    const val = comune.nome;
    setQuery(val);
    onChange(val);
    if (onSelectFull) onSelectFull(comune.nome, comune.provincia, comune.sigla);
    setOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); handleSelect(results[highlighted]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      <Input
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((c, i) => (
            <button
              key={`${c.nome}-${c.sigla}`}
              type="button"
              onClick={() => handleSelect(c)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-green-50 transition-colors ${
                i === highlighted ? "bg-green-50" : ""
              }`}
            >
              <MapPin size={12} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900">{c.nome}</span>
                <span className="text-gray-400 ml-1.5 text-xs">({c.sigla})</span>
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{c.regione}</span>
            </button>
          ))}
          {loading && <div className="px-3 py-2 text-xs text-gray-400 text-center">Ricerca...</div>}
        </div>
      )}
    </div>
  );
}
