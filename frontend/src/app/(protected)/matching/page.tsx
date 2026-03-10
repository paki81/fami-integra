"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { beneficiariApi, matchingApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, getScoreColor, getStatoColor } from "@/lib/utils";
import { GitMerge, Home, Building2, Search, Check, ChevronLeft, ChevronRight, XCircle, Trash2, Pencil, Save, X, MapPin, Phone, Mail, Euro, Layers, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const MappaLeaflet = dynamic(() => import("@/components/MappaLeaflet"), { ssr: false });

export default function MatchingPage() {
  const { user } = useAuth();
  const [beneficiari, setBeneficiari] = useState<any[]>([]);
  const [selectedBen, setSelectedBen] = useState<any>(null);
  const [sugAlloggi, setSugAlloggi] = useState<any[]>([]);
  const [sugAziende, setSugAziende] = useState<any[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [matchAlloggi, setMatchAlloggi] = useState<any[]>([]);
  const [matchLavoro, setMatchLavoro] = useState<any[]>([]);
  const [tab, setTab] = useState<"cerca" | "alloggi" | "lavoro">("cerca");
  const [search, setSearch] = useState("");
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingMatch, setSavingMatch] = useState(false);
  const [detailAlloggio, setDetailAlloggio] = useState<any>(null);
  const [detailAzienda, setDetailAzienda] = useState<any>(null);
  const [sugTab, setSugTab] = useState<"alloggi"|"aziende">("alloggi");
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const heroBottom = heroRef.current.getBoundingClientRect().bottom;
        setIsScrolled(heroBottom < 10);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    beneficiariApi.list({ limit: 200, stato: "In Corso,Abbinato Alloggio,Abbinato Lavoro" }).then(r => setBeneficiari(r.data.data)).catch(console.error);
    matchingApi.listaMatchAlloggi({ limit: 50 }).then(r => setMatchAlloggi(r.data.data)).catch(console.error);
    matchingApi.listaMatchLavoro({ limit: 50 }).then(r => setMatchLavoro(r.data.data)).catch(console.error);
  }, []);

  const handleSelectBen = async (ben: any) => {
    setSelectedBen(ben);
    setLoadingSug(true);
    try {
      const [resA, resAz] = await Promise.all([
        matchingApi.suggerisciAlloggi(ben.id),
        matchingApi.suggerisciAziende(ben.id)
      ]);
      setSugAlloggi(resA.data.suggerimenti || []);
      setSugAziende(resAz.data.suggerimenti || []);
    } catch (err) { console.error(err); }
    setLoadingSug(false);
  };

  const creaMatchAlloggio = async (alloggioId: number) => {
    if (!selectedBen) return;
    try {
      await matchingApi.creaMatchAlloggio({
        id_beneficiario: selectedBen.id,
        id_alloggio: alloggioId,
        composizione_nucleo: `${selectedBen.nucleo_singolo} (${selectedBen.n_componenti_nucleo})`,
        comune_preferenza: selectedBen.comune
      });
      toast.success("Abbinamento alloggio creato con successo");
      matchingApi.listaMatchAlloggi({ limit: 50 }).then(r => setMatchAlloggi(r.data.data));
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg?.includes("già") || msg?.includes("DUP")) toast.error("Questo abbinamento esiste già");
      else toast.error(msg || "Si è verificato un errore durante l'abbinamento");
    }
  };

  const creaMatchLavoro = async (aziendaId: number) => {
    if (!selectedBen) return;
    try {
      await matchingApi.creaMatchLavoro({
        id_beneficiario: selectedBen.id,
        id_azienda: aziendaId
      });
      toast.success("Abbinamento lavoro creato con successo");
      matchingApi.listaMatchLavoro({ limit: 50 }).then(r => setMatchLavoro(r.data.data));
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg?.includes("già") || msg?.includes("DUP")) toast.error("Questo abbinamento esiste già");
      else toast.error(msg || "Si è verificato un errore durante l'abbinamento");
    }
  };

  const canEdit = ["superadmin", "admin"].includes(user?.ruolo || "");
  const canDelete = user?.ruolo === "superadmin";

  const refreshLists = () => {
    matchingApi.listaMatchAlloggi({ limit: 50 }).then(r => setMatchAlloggi(r.data.data)).catch(console.error);
    matchingApi.listaMatchLavoro({ limit: 50 }).then(r => setMatchLavoro(r.data.data)).catch(console.error);
    beneficiariApi.list({ limit: 200, stato: "In Corso,Abbinato Alloggio,Abbinato Lavoro" }).then(r => setBeneficiari(r.data.data)).catch(console.error);
  };

  const annullaMatchAlloggio = (id: number) => {
    toast("Vuoi annullare questo abbinamento alloggio?", {
      action: { label: "Annulla abbinamento", onClick: async () => {
        try {
          await matchingApi.annullaMatchAlloggio(id);
          toast.success("Abbinamento annullato");
          refreshLists();
        } catch { toast.error("Errore nell'annullamento"); }
      }},
      cancel: { label: "No", onClick: () => {} },
      duration: 8000,
    });
  };

  const annullaMatchLavoro = (id: number) => {
    toast("Vuoi annullare questo abbinamento lavoro?", {
      action: { label: "Annulla abbinamento", onClick: async () => {
        try {
          await matchingApi.annullaMatchLavoro(id);
          toast.success("Abbinamento annullato");
          refreshLists();
        } catch { toast.error("Errore nell'annullamento"); }
      }},
      cancel: { label: "No", onClick: () => {} },
      duration: 8000,
    });
  };

  const eliminaMatchAlloggio = (id: number) => {
    toast("Vuoi eliminare definitivamente questo abbinamento?", {
      action: { label: "Elimina", onClick: async () => {
        try {
          await matchingApi.deleteMatchAlloggio(id);
          toast.success("Abbinamento eliminato");
          refreshLists();
        } catch { toast.error("Errore nell'eliminazione"); }
      }},
      cancel: { label: "No", onClick: () => {} },
      duration: 8000,
    });
  };

  const eliminaMatchLavoro = (id: number) => {
    toast("Vuoi eliminare definitivamente questo abbinamento?", {
      action: { label: "Elimina", onClick: async () => {
        try {
          await matchingApi.deleteMatchLavoro(id);
          toast.success("Abbinamento eliminato");
          refreshLists();
        } catch { toast.error("Errore nell'eliminazione"); }
      }},
      cancel: { label: "No", onClick: () => {} },
      duration: 8000,
    });
  };

  const startEditAlloggio = (m: any) => {
    setEditingMatch({ type: 'alloggio', id: m.id });
    setEditForm({
      data_sopralluogo: m.data_sopralluogo ? m.data_sopralluogo.split("T")[0] : "",
      esito_sopralluogo: m.esito_sopralluogo || "",
      contratto_firmato: m.contratto_firmato || "N",
      data_inizio_contratto: m.data_inizio_contratto ? m.data_inizio_contratto.split("T")[0] : "",
      contributo_progetto: m.contributo_progetto || "N",
      note: m.note || "",
    });
  };

  const startEditLavoro = (m: any) => {
    setEditingMatch({ type: 'lavoro', id: m.id });
    setEditForm({
      mansione_proposta: m.mansione_proposta || "",
      esito: m.esito || "",
      data_avvio: m.data_avvio ? m.data_avvio.split("T")[0] : "",
      note: m.note || "",
    });
  };

  const saveMatch = async () => {
    setSavingMatch(true);
    try {
      if (editingMatch.type === 'alloggio') {
        await matchingApi.updateMatchAlloggio(editingMatch.id, editForm);
      } else {
        await matchingApi.updateMatchLavoro(editingMatch.id, editForm);
      }
      toast.success("Abbinamento aggiornato");
      setEditingMatch(null);
      refreshLists();
    } catch { toast.error("Errore nel salvataggio"); }
    setSavingMatch(false);
  };

  const filteredBen = beneficiari.filter(b =>
    !search || `${b.cognome} ${b.nome} ${b.comune}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sticky Compact Bar - appare su scroll */}
      <div className={`fixed top-0 left-0 lg:left-64 right-0 z-30 transition-all duration-300 ease-in-out ${isScrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 shadow-lg border-b border-green-500/30">
          <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <GitMerge size={16} className="text-white" />
              </div>
              <h1 className="text-base font-bold text-white">Abbinamento</h1>
            </div>
            <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-lg p-0.5">
              <button onClick={() => setTab("cerca")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === "cerca" ? "bg-white/25 text-white" : "text-white/70 hover:text-white"}`}>
                <Search size={12} />Cerca</button>
              <button onClick={() => setTab("alloggi")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === "alloggi" ? "bg-white/25 text-white" : "text-white/70 hover:text-white"}`}>
                <Home size={12} />Alloggi <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{matchAlloggi.length}</span></button>
              <button onClick={() => setTab("lavoro")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === "lavoro" ? "bg-white/25 text-white" : "text-white/70 hover:text-white"}`}>
                <Building2 size={12} />Lavoro <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{matchLavoro.length}</span></button>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-white text-xs font-medium">
              <span className="bg-white/15 px-2.5 py-1 rounded-lg">{matchAlloggi.length} <span className="text-white/70">alloggi</span></span>
              <span className="bg-white/15 px-2.5 py-1 rounded-lg">{matchLavoro.length} <span className="text-white/70">lavoro</span></span>
              <span className="bg-white/15 px-2.5 py-1 rounded-lg">{beneficiari.length} <span className="text-white/70">in uscita</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Header - versione grande */}
      <div ref={heroRef} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <GitMerge size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Abbinamento</h1>
                <p className="text-green-100 text-sm mt-0.5">Trova alloggi e lavoro per i beneficiari</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center min-w-[90px]">
              <p className="text-2xl font-bold text-white">{matchAlloggi.length}</p>
              <p className="text-[11px] text-green-100 font-medium">Alloggi</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center min-w-[90px]">
              <p className="text-2xl font-bold text-white">{matchLavoro.length}</p>
              <p className="text-[11px] text-green-100 font-medium">Lavoro</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center min-w-[90px]">
              <p className="text-2xl font-bold text-white">{beneficiari.length}</p>
              <p className="text-[11px] text-green-100 font-medium">In uscita</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - pill style */}
      <div className="flex gap-1.5 bg-gray-100/80 rounded-xl p-1.5 w-fit">
        <button onClick={() => setTab("cerca")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${tab === "cerca" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <Search size={15} />Cerca Abbinamento</button>
        <button onClick={() => setTab("alloggi")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${tab === "alloggi" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <Home size={15} />Alloggi<span className={`ml-1 px-1.5 py-0.5 rounded-md text-xs ${tab === "alloggi" ? "bg-orange-100 text-orange-700" : "bg-gray-200 text-gray-500"}`}>{matchAlloggi.length}</span></button>
        <button onClick={() => setTab("lavoro")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${tab === "lavoro" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <Building2 size={15} />Lavoro<span className={`ml-1 px-1.5 py-0.5 rounded-md text-xs ${tab === "lavoro" ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500"}`}>{matchLavoro.length}</span></button>
      </div>

      {tab === "cerca" && (
        <div className="grid lg:grid-cols-12 gap-5">
          {/* Step indicator */}
          <div className="lg:col-span-12">
            <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
              <div className={`flex items-center gap-1.5 ${!selectedBen ? "text-green-700" : "text-green-600"}`}>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${!selectedBen ? "bg-green-600 text-white" : "bg-green-100 text-green-700"}`}>1</span>
                Seleziona beneficiario
              </div>
              <ChevronRight size={14} className="text-gray-300" />
              <div className={`flex items-center gap-1.5 ${selectedBen && !loadingSug ? "text-green-700" : ""}`}>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${selectedBen && !loadingSug ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>2</span>
                Confronta suggerimenti
              </div>
              <ChevronRight size={14} className="text-gray-300" />
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-500">3</span>
                Crea abbinamento
              </div>
            </div>
          </div>

          {/* Lista beneficiari - pannello sinistro */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-green-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Beneficiari</h3>
                  </div>
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{filteredBen.length}</span>
                </div>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
                  <Input placeholder="Nome, cognome o comune..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white border-gray-200 rounded-xl h-9 text-sm focus:ring-green-500 focus:border-green-500" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {filteredBen.map(b => {
                  const isSelected = selectedBen?.id === b.id;
                  return (
                    <div key={b.id}
                      onClick={() => handleSelectBen(b)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-150 ${isSelected ? "bg-green-50 border-l-[3px] border-l-green-500" : "hover:bg-gray-50/80 border-l-[3px] border-l-transparent"}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${isSelected ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                        {b.cognome?.[0]}{b.nome?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-semibold text-sm truncate ${isSelected ? "text-green-900" : "text-gray-900"}`}>{b.cognome} {b.nome}</p>
                          {b.stato !== "In Corso" && (
                            <span className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${b.stato === "Abbinato Alloggio" ? "bg-orange-100 text-orange-700" : "bg-indigo-100 text-indigo-700"}`}>
                              {b.stato === "Abbinato Alloggio" ? <Home size={9} /> : <Building2 size={9} />}
                              {b.stato === "Abbinato Alloggio" ? "Alloggio" : "Lavoro"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{b.comune} · {b.n_componenti_nucleo} comp. · {b.area_intervento}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Uscita {formatDate(b.data_uscita_sai)}</p>
                      </div>
                    </div>
                  );
                })}
                {filteredBen.length === 0 && <div className="px-4 py-10 text-center"><Search size={24} className="mx-auto text-gray-300 mb-2" /><p className="text-sm text-gray-400">Nessun risultato</p></div>}
              </div>
            </div>
          </div>

          {/* Pannello suggerimenti - destra */}
          <div className="lg:col-span-8 flex flex-col">
            {!selectedBen ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                    <GitMerge size={40} className="text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Inizia la ricerca</h3>
                  <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                    Seleziona un beneficiario dalla lista per analizzare automaticamente le compatibilità con alloggi e aziende disponibili
                  </p>
                  <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5"><Home size={14} className="text-orange-400" />Alloggi per comune e budget</div>
                    <div className="flex items-center gap-1.5"><Building2 size={14} className="text-indigo-400" />Aziende per competenze</div>
                  </div>
                </div>
              </div>
            ) : loadingSug ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-full border-[3px] border-green-100" />
                    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-green-600 animate-spin" />
                    <div className="absolute inset-3 rounded-full bg-green-50 flex items-center justify-center">
                      <Search size={18} className="text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-gray-700 mb-1">Analisi in corso</h3>
                  <p className="text-sm text-gray-400">Calcolo compatibilità per {selectedBen.cognome} {selectedBen.nome}...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col flex-1">
                {/* Card profilo beneficiario */}
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                      {selectedBen.cognome?.[0]}{selectedBen.nome?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-bold text-gray-900">{selectedBen.cognome} {selectedBen.nome}</h3>
                        <button onClick={() => { setSelectedBen(null); setSugAlloggi([]); setSugAziende([]); }} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-gray-400" />{selectedBen.comune}</span>
                        <span className="inline-flex items-center gap-1"><Users size={12} className="text-gray-400" />{selectedBen.n_componenti_nucleo} componenti</span>
                        <span className="inline-flex items-center gap-1"><Clock size={12} className="text-gray-400" />Uscita {formatDate(selectedBen.data_uscita_sai)}</span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-semibold border border-green-200/60">{selectedBen.area_intervento}</span>
                        {selectedBen.budget_max_affitto && <span className="px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200/60">Budget: {formatCurrency(selectedBen.budget_max_affitto)}</span>}
                        {selectedBen.nucleo_singolo && <span className="px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200/60">{selectedBen.nucleo_singolo}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-tab Alloggi / Aziende */}
                {(() => {
                  const hasAlloggi = selectedBen.area_intervento?.includes("ALLOGGIO") || selectedBen.area_intervento?.includes("LAVORATIVO-ALLOGGIO");
                  const hasAziende = selectedBen.area_intervento?.includes("LAVORATIVO");
                  const showBoth = hasAlloggi && hasAziende;
                  const activeSubTab = showBoth ? sugTab : (hasAlloggi ? "alloggi" : "aziende");
                  return (
                    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col flex-1">
                      {/* Sub-tab header */}
                      {showBoth && (
                        <div className="flex border-b border-gray-100">
                          <button onClick={() => setSugTab("alloggi")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all relative ${activeSubTab === "alloggi" ? "text-orange-700 bg-orange-50/50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/50"}`}>
                            <Home size={15} />Alloggi
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeSubTab === "alloggi" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>{sugAlloggi.length}</span>
                            {activeSubTab === "alloggi" && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-orange-500 rounded-full" />}
                          </button>
                          <button onClick={() => setSugTab("aziende")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all relative ${activeSubTab === "aziende" ? "text-indigo-700 bg-indigo-50/50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/50"}`}>
                            <Building2 size={15} />Aziende
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeSubTab === "aziende" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>{sugAziende.length}</span>
                            {activeSubTab === "aziende" && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 rounded-full" />}
                          </button>
                        </div>
                      )}
                      {!showBoth && (
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasAlloggi ? "bg-orange-100" : "bg-indigo-100"}`}>
                            {hasAlloggi ? <Home size={16} className="text-orange-600" /> : <Building2 size={16} className="text-indigo-600" />}
                          </div>
                          <h3 className="font-semibold text-[15px] text-gray-900">{hasAlloggi ? "Alloggi suggeriti" : "Aziende suggerite"}</h3>
                          <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{hasAlloggi ? sugAlloggi.length : sugAziende.length}</span>
                        </div>
                      )}

                      {/* Contenuto suggerimenti alloggi */}
                      {activeSubTab === "alloggi" && (
                        <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                          {sugAlloggi.length === 0 ? (
                            <div className="py-10 text-center"><Home size={28} className="mx-auto text-gray-300 mb-2" /><p className="text-sm text-gray-400">Nessun alloggio compatibile trovato</p></div>
                          ) : sugAlloggi.map((s: any) => (
                            <div key={s.alloggio.id} className="group rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-md cursor-pointer transition-all duration-200 overflow-hidden" onClick={() => setDetailAlloggio(s)}>
                              <div className="flex items-stretch">
                                {/* Score visuale */}
                                <div className={`w-16 shrink-0 flex flex-col items-center justify-center p-2 ${s.score >= 80 ? "bg-green-50" : s.score >= 60 ? "bg-yellow-50" : "bg-red-50"}`}>
                                  <svg viewBox="0 0 36 36" className="w-10 h-10">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={s.score >= 80 ? "#16a34a" : s.score >= 60 ? "#ca8a04" : "#dc2626"} strokeWidth="3" strokeDasharray={`${s.score}, 100`} strokeLinecap="round" />
                                    <text x="18" y="21" textAnchor="middle" className="text-[10px] font-bold" fill={s.score >= 80 ? "#16a34a" : s.score >= 60 ? "#ca8a04" : "#dc2626"}>{s.score}%</text>
                                  </svg>
                                </div>
                                {/* Info */}
                                <div className="flex-1 p-3 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-gray-900">{s.alloggio.id_alloggio}</span>
                                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-medium">{s.alloggio.tipologia}</span>
                                    </div>
                                    <Button size="sm" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-green-600 hover:bg-green-700" onClick={(e) => { e.stopPropagation(); creaMatchAlloggio(s.alloggio.id); }}>
                                      <Check size={12} className="mr-1" />Abbina
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-[11px]">
                                    <span className="inline-flex items-center gap-1 text-gray-600"><MapPin size={10} className="text-gray-400 shrink-0" />{s.alloggio.comune}</span>
                                    <span className="inline-flex items-center gap-1 text-gray-600"><Layers size={10} className="text-gray-400 shrink-0" />{s.alloggio.n_vani} vani</span>
                                    <span className="inline-flex items-center gap-1 text-gray-600"><Euro size={10} className="text-gray-400 shrink-0" />{formatCurrency(s.alloggio.canone_mensile)}</span>
                                    {s.distanzaKm != null && <span className="inline-flex items-center gap-1 text-purple-600 font-medium"><MapPin size={10} className="shrink-0" />{s.distanzaKm} km</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {s.stessoComune && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-semibold border border-green-200/60">Stesso comune</span>}
                                    {s.canoneOk === true && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-semibold border border-green-200/60">Nel budget</span>}
                                    {s.canoneOk === "parziale" && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200/60">Sopra budget</span>}
                                    {s.canoneOk === false && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-semibold border border-red-200/60">Fuori budget</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Contenuto suggerimenti aziende */}
                      {activeSubTab === "aziende" && (
                        <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                          {sugAziende.length === 0 ? (
                            <div className="py-10 text-center"><Building2 size={28} className="mx-auto text-gray-300 mb-2" /><p className="text-sm text-gray-400">Nessuna azienda compatibile trovata</p></div>
                          ) : sugAziende.map((s: any) => (
                            <div key={s.azienda.id} className="group rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md cursor-pointer transition-all duration-200 overflow-hidden" onClick={() => setDetailAzienda(s)}>
                              <div className="flex items-stretch">
                                {/* Score visuale */}
                                <div className={`w-16 shrink-0 flex flex-col items-center justify-center p-2 ${s.score >= 80 ? "bg-green-50" : s.score >= 60 ? "bg-yellow-50" : "bg-red-50"}`}>
                                  <svg viewBox="0 0 36 36" className="w-10 h-10">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={s.score >= 80 ? "#16a34a" : s.score >= 60 ? "#ca8a04" : "#dc2626"} strokeWidth="3" strokeDasharray={`${s.score}, 100`} strokeLinecap="round" />
                                    <text x="18" y="21" textAnchor="middle" className="text-[10px] font-bold" fill={s.score >= 80 ? "#16a34a" : s.score >= 60 ? "#ca8a04" : "#dc2626"}>{s.score}%</text>
                                  </svg>
                                </div>
                                {/* Info */}
                                <div className="flex-1 p-3 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-gray-900">{s.azienda.nome_azienda}</span>
                                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-medium">{s.azienda.settore}</span>
                                    </div>
                                    <Button size="sm" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-indigo-600 hover:bg-indigo-700" onClick={(e) => { e.stopPropagation(); creaMatchLavoro(s.azienda.id); }}>
                                      <Check size={12} className="mr-1" />Abbina
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[11px]">
                                    <span className="inline-flex items-center gap-1 text-gray-600"><MapPin size={10} className="text-gray-400 shrink-0" />{s.azienda.comune}</span>
                                    <span className="inline-flex items-center gap-1 text-gray-600"><Layers size={10} className="text-gray-400 shrink-0" />{s.azienda.mansione_profilo}</span>
                                    <span className="inline-flex items-center gap-1 text-gray-600"><Clock size={10} className="text-gray-400 shrink-0" />{s.azienda.tipo_contratto}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {s.stessoComune && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-semibold border border-green-200/60">Stesso comune</span>}
                                    {s.distanzaKm != null && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-200/60">{s.distanzaKm} km</span>}
                                    {s.azienda.tirocinio === "S" && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/60">Tirocinio</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "alloggi" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Beneficiario</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Comp. Nucleo</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Comune Pref.</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Budget</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">ID Alloggio</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Indirizzo</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Data Sopral.</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Esito Sopral.</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Contratto</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Data Contratto</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Contributo</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Stato</th>
                    {canEdit && <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs">Azioni</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matchAlloggi.length === 0 ? (
                    <tr><td colSpan={canEdit ? 13 : 12} className="px-4 py-8 text-center text-gray-400">Nessun abbinamento alloggi</td></tr>
                  ) : matchAlloggi.map((m: any) => (
                    <React.Fragment key={m.id}>
                      <tr className={`hover:bg-gray-50 ${m.stato_match === 'Annullato' ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-3 font-medium text-sm whitespace-nowrap">{m.ben_cognome} {m.ben_nome}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs">{m.composizione_nucleo || "-"}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{m.comune_preferenza || "-"}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs">{m.budget_massimo ? formatCurrency(m.budget_massimo) : "-"}</td>
                        <td className="px-3 py-3 font-mono text-gray-600 text-xs">{m.id_alloggio}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs">{m.indirizzo || "-"}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(m.data_sopralluogo)}</td>
                        <td className="px-3 py-3 text-xs">{m.esito_sopralluogo ? (
                          <Badge className={m.esito_sopralluogo.includes("Positivo") ? "bg-green-100 text-green-800 text-xs" : m.esito_sopralluogo.includes("Negativo") ? "bg-red-100 text-red-800 text-xs" : "bg-yellow-100 text-yellow-800 text-xs"}>
                            {m.esito_sopralluogo}</Badge>
                        ) : "-"}</td>
                        <td className="px-3 py-3 text-xs">
                          <Badge className={m.contratto_firmato === "S" ? "bg-green-100 text-green-800 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                            {m.contratto_firmato === "S" ? "Firmato" : m.contratto_firmato === "In corso di firma" ? "In corso" : "No"}</Badge></td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(m.data_inizio_contratto)}</td>
                        <td className="px-3 py-3 text-xs">
                          <Badge className={m.contributo_progetto === "Sì" ? "bg-green-100 text-green-800 text-xs" : m.contributo_progetto === "Parziale" ? "bg-yellow-100 text-yellow-800 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                            {m.contributo_progetto === "Sì" ? "Sì" : m.contributo_progetto === "Parziale" ? "Parziale" : "No"}</Badge></td>
                        <td className="px-3 py-3">
                          <Badge className={m.stato_match === 'Attivo' ? 'bg-green-100 text-green-800 text-xs' : 'bg-red-100 text-red-700 text-xs'}>
                            {m.stato_match || 'Attivo'}</Badge></td>
                        {canEdit && (
                          <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {m.stato_match !== 'Annullato' && (
                                <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-700" title="Modifica" onClick={() => startEditAlloggio(m)}><Pencil size={14} /></Button>
                              )}
                              {m.stato_match !== 'Annullato' && (
                                <Button variant="ghost" size="icon" className="text-orange-500 hover:text-orange-700" title="Annulla abbinamento" onClick={() => annullaMatchAlloggio(m.id)}><XCircle size={14} /></Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" title="Elimina definitivamente" onClick={() => eliminaMatchAlloggio(m.id)}><Trash2 size={14} /></Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                      {editingMatch?.type === 'alloggio' && editingMatch?.id === m.id && (
                        <tr className="bg-blue-50">
                          <td colSpan={canEdit ? 13 : 12} className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              <div><label className="text-xs font-medium text-gray-500">Data Sopralluogo</label>
                                <Input type="date" value={editForm.data_sopralluogo} onChange={e => setEditForm({...editForm, data_sopralluogo: e.target.value})} /></div>
                              <div><label className="text-xs font-medium text-gray-500">Esito Sopralluogo</label>
                                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white" value={editForm.esito_sopralluogo} onChange={e => setEditForm({...editForm, esito_sopralluogo: e.target.value})}>
                                  <option value="">-- Seleziona --</option>
                                  <option value="Positivo – proseguire">Positivo – proseguire</option>
                                  <option value="Negativo – non adatto">Negativo – non adatto</option>
                                  <option value="In valutazione">In valutazione</option>
                                  <option value="Rifiutato dal beneficiario">Rifiutato dal beneficiario</option>
                                  <option value="Rifiutato dal proprietario">Rifiutato dal proprietario</option>
                                </select></div>
                              <div><label className="text-xs font-medium text-gray-500">Contratto Firmato</label>
                                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white" value={editForm.contratto_firmato} onChange={e => setEditForm({...editForm, contratto_firmato: e.target.value})}>
                                  <option value="N">No</option><option value="S">Sì</option><option value="In corso di firma">In corso di firma</option></select></div>
                              <div><label className="text-xs font-medium text-gray-500">Data Inizio Contratto</label>
                                <Input type="date" value={editForm.data_inizio_contratto} onChange={e => setEditForm({...editForm, data_inizio_contratto: e.target.value})} /></div>
                              <div><label className="text-xs font-medium text-gray-500">Contributo Progetto</label>
                                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white" value={editForm.contributo_progetto} onChange={e => setEditForm({...editForm, contributo_progetto: e.target.value})}>
                                  <option value="No">No</option><option value="Sì">Sì</option><option value="Parziale">Parziale</option></select></div>
                              <div className="md:col-span-2"><label className="text-xs font-medium text-gray-500">Note Tutor</label>
                                <Input value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} /></div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={saveMatch} disabled={savingMatch}><Save size={14} className="mr-1" />{savingMatch ? "Salvataggio..." : "Salva"}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingMatch(null)}><X size={14} className="mr-1" />Annulla</Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "lavoro" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Beneficiario</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Nazionalità</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Livello IT</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Competenze</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">ID Azienda</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Azienda</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Mansione</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Data Proposta</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Esito</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Data Avvio</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Stato</th>
                    {canEdit && <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs">Azioni</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matchLavoro.length === 0 ? (
                    <tr><td colSpan={canEdit ? 12 : 11} className="px-4 py-8 text-center text-gray-400">Nessun abbinamento lavoro</td></tr>
                  ) : matchLavoro.map((m: any) => (
                    <React.Fragment key={m.id}>
                      <tr className={`hover:bg-gray-50 ${m.stato_match === 'Annullato' ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-3 font-medium text-sm whitespace-nowrap">{m.ben_cognome} {m.ben_nome}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs">{m.ben_nazionalita || "-"}</td>
                        <td className="px-3 py-3 text-xs">{m.ben_livello_italiano ? <Badge variant="secondary" className="text-xs">{m.ben_livello_italiano}</Badge> : "-"}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs max-w-32 truncate">{m.ben_competenze || "-"}</td>
                        <td className="px-3 py-3 font-mono text-gray-600 text-xs">{m.id_azienda}</td>
                        <td className="px-3 py-3 text-gray-700 text-sm whitespace-nowrap">{m.nome_azienda}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs">{m.mansione_proposta || m.mansione_profilo || "-"}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(m.data_match)}</td>
                        <td className="px-3 py-3 text-xs">{m.esito ? (
                          <Badge className={m.esito.includes("accettata") || m.esito.includes("avviato") ? "bg-green-100 text-green-800 text-xs" : m.esito.includes("rifiutata") || m.esito.includes("idoneo") ? "bg-red-100 text-red-800 text-xs" : "bg-yellow-100 text-yellow-800 text-xs"}>
                            {m.esito}</Badge>
                        ) : "-"}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(m.data_avvio)}</td>
                        <td className="px-3 py-3">
                          <Badge className={m.stato_match === 'Attivo' ? 'bg-green-100 text-green-800 text-xs' : 'bg-red-100 text-red-700 text-xs'}>
                            {m.stato_match || 'Attivo'}</Badge></td>
                        {canEdit && (
                          <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {m.stato_match !== 'Annullato' && (
                                <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-700" title="Modifica" onClick={() => startEditLavoro(m)}><Pencil size={14} /></Button>
                              )}
                              {m.stato_match !== 'Annullato' && (
                                <Button variant="ghost" size="icon" className="text-orange-500 hover:text-orange-700" title="Annulla abbinamento" onClick={() => annullaMatchLavoro(m.id)}><XCircle size={14} /></Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" title="Elimina definitivamente" onClick={() => eliminaMatchLavoro(m.id)}><Trash2 size={14} /></Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                      {editingMatch?.type === 'lavoro' && editingMatch?.id === m.id && (
                        <tr className="bg-blue-50">
                          <td colSpan={canEdit ? 12 : 11} className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              <div><label className="text-xs font-medium text-gray-500">Mansione Proposta</label>
                                <Input value={editForm.mansione_proposta} onChange={e => setEditForm({...editForm, mansione_proposta: e.target.value})} /></div>
                              <div><label className="text-xs font-medium text-gray-500">Esito</label>
                                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white" value={editForm.esito} onChange={e => setEditForm({...editForm, esito: e.target.value})}>
                                  <option value="">-- Seleziona --</option>
                                  <option value="Proposta accettata">Proposta accettata</option>
                                  <option value="Proposta rifiutata">Proposta rifiutata</option>
                                  <option value="Colloquio in programma">Colloquio in programma</option>
                                  <option value="Tirocinio avviato">Tirocinio avviato</option>
                                  <option value="Non idoneo">Non idoneo</option>
                                </select></div>
                              <div><label className="text-xs font-medium text-gray-500">Data Avvio</label>
                                <Input type="date" value={editForm.data_avvio} onChange={e => setEditForm({...editForm, data_avvio: e.target.value})} /></div>
                              <div className="md:col-span-2"><label className="text-xs font-medium text-gray-500">Note</label>
                                <Input value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} /></div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={saveMatch} disabled={savingMatch}><Save size={14} className="mr-1" />{savingMatch ? "Salvataggio..." : "Salva"}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingMatch(null)}><X size={14} className="mr-1" />Annulla</Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Modale Dettaglio Alloggio */}
      {detailAlloggio && (() => {
        const a = detailAlloggio.alloggio;
        const s = detailAlloggio;
        const hasCoords = a.latitudine && a.longitudine;
        const markers = hasCoords ? [{
          id: a.id, lat: parseFloat(a.latitudine), lng: parseFloat(a.longitudine),
          label: a.id_alloggio,
          popup: `<b>${a.id_alloggio}</b><br/>${a.indirizzo || ""}, ${a.comune}`,
          color: "orange" as const
        }] : [];
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailAlloggio(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Home size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{a.id_alloggio}</h2>
                    <p className="text-sm text-gray-500">{a.tipologia} · {a.comune}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(s.score)}`}>{s.score}%</span>
                  <Button variant="ghost" size="icon" onClick={() => setDetailAlloggio(null)}><X size={18} /></Button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Indirizzo</p><p className="text-sm font-medium">{a.indirizzo || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Comune</p><p className="text-sm font-medium">{a.comune || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Layers size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Tipologia</p><p className="text-sm font-medium">{a.tipologia}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Home size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Vani</p><p className="text-sm font-medium">{a.n_vani}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Layers size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Piano</p><p className="text-sm font-medium">{a.piano || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Euro size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Canone mensile</p><p className="text-sm font-medium">{formatCurrency(a.canone_mensile)}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Euro size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Spese incluse</p><p className="text-sm font-medium">{a.spese_incluse === "S" ? "Sì" : a.spese_incluse === "Parziali" ? "Parziali" : "No"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Proprietario</p><p className="text-sm font-medium">{a.proprietario || a.agenzia || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Telefono</p><p className="text-sm font-medium">{a.telefono_referente || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Email</p><p className="text-sm font-medium break-all">{a.email_referente || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Disponibile da</p><p className="text-sm font-medium">{formatDate(a.disponibile_da)}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Stato</p><p className="text-sm font-medium">{a.stato}</p></div>
                  </div>
                </div>

                {a.note && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Note</p>
                    <p className="text-sm text-gray-700">{a.note}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  {s.distanzaKm != null && <Badge className="bg-purple-100 text-purple-700"><MapPin size={12} className="mr-1" />{s.distanzaKm} km{s.durataMin ? ` (~${s.durataMin} min)` : ""}</Badge>}
                  {s.stessoComune && <Badge className="bg-green-100 text-green-700">Stesso comune</Badge>}
                  {s.canoneOk === true && <Badge className="bg-green-100 text-green-700">Nel budget</Badge>}
                  {s.canoneOk === "parziale" && <Badge className="bg-amber-100 text-amber-700">Leggermente sopra budget</Badge>}
                  {s.canoneOk === false && <Badge className="bg-red-100 text-red-700">Fuori budget</Badge>}
                </div>

                {hasCoords ? (
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <MappaLeaflet markers={markers} height="250px" zoom={15} />
                  </div>
                ) : (
                  <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                    <MapPin size={16} className="mr-2" />Coordinate non disponibili
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
                <Button variant="outline" onClick={() => setDetailAlloggio(null)}>Chiudi</Button>
                <Button onClick={() => { creaMatchAlloggio(a.id); setDetailAlloggio(null); }}>
                  <Check size={14} className="mr-1" />Abbina alloggio
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modale Dettaglio Azienda */}
      {detailAzienda && (() => {
        const az = detailAzienda.azienda;
        const s = detailAzienda;
        const hasCoords = az.latitudine && az.longitudine;
        const markers = hasCoords ? [{
          id: az.id, lat: parseFloat(az.latitudine), lng: parseFloat(az.longitudine),
          label: az.nome_azienda,
          popup: `<b>${az.nome_azienda}</b><br/>${az.indirizzo || ""}, ${az.comune}`,
          color: "blue" as const
        }] : [];
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailAzienda(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Building2 size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{az.nome_azienda}</h2>
                    <p className="text-sm text-gray-500">{az.settore} · {az.comune}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(s.score)}`}>{s.score}%</span>
                  <Button variant="ghost" size="icon" onClick={() => setDetailAzienda(null)}><X size={18} /></Button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <Building2 size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">ID Azienda</p><p className="text-sm font-medium">{az.id_azienda}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Indirizzo</p><p className="text-sm font-medium">{az.indirizzo || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Comune</p><p className="text-sm font-medium">{az.comune || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Layers size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Settore</p><p className="text-sm font-medium">{az.settore || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Mansione/Profilo</p><p className="text-sm font-medium">{az.mansione_profilo || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Tipo contratto</p><p className="text-sm font-medium">{az.tipo_contratto || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Orario</p><p className="text-sm font-medium">{az.orario || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Referente</p><p className="text-sm font-medium">{az.referente || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Telefono</p><p className="text-sm font-medium">{az.telefono || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Email</p><p className="text-sm font-medium break-all">{az.email || "-"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Disponibile</p><p className="text-sm font-medium">{az.disponibile === "S" ? "Sì" : "No"}</p></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check size={15} className="text-gray-400 mt-0.5 shrink-0" />
                    <div><p className="text-xs text-gray-400">Tirocinio</p><p className="text-sm font-medium">{az.tirocinio === "S" ? "Sì" : "No"}</p></div>
                  </div>
                </div>

                {az.note && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Note</p>
                    <p className="text-sm text-gray-700">{az.note}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  {s.distanzaKm != null && <Badge className="bg-purple-100 text-purple-700"><MapPin size={12} className="mr-1" />{s.distanzaKm} km{s.durataMin ? ` (~${s.durataMin} min)` : ""}</Badge>}
                  {s.stessoComune && <Badge className="bg-green-100 text-green-700">Stesso comune</Badge>}
                  {az.tirocinio === "S" && <Badge className="bg-blue-100 text-blue-700">Tirocinio disponibile</Badge>}
                </div>

                {hasCoords ? (
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <MappaLeaflet markers={markers} height="250px" zoom={15} />
                  </div>
                ) : (
                  <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                    <MapPin size={16} className="mr-2" />Coordinate non disponibili
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
                <Button variant="outline" onClick={() => setDetailAzienda(null)}>Chiudi</Button>
                <Button onClick={() => { creaMatchLavoro(az.id); setDetailAzienda(null); }}>
                  <Check size={14} className="mr-1" />Abbina azienda
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
