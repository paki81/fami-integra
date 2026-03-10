"use client";

import React, { useEffect, useState } from "react";
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abbinamento</h1>
        <p className="text-sm text-gray-500">Trova alloggi e lavoro per i beneficiari</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <Button variant={tab === "cerca" ? "default" : "ghost"} size="sm" onClick={() => setTab("cerca")}>
          <Search size={14} className="mr-2" />Cerca Abbinamento</Button>
        <Button variant={tab === "alloggi" ? "default" : "ghost"} size="sm" onClick={() => setTab("alloggi")}>
          <Home size={14} className="mr-2" />Abbinamenti Alloggi ({matchAlloggi.length})</Button>
        <Button variant={tab === "lavoro" ? "default" : "ghost"} size="sm" onClick={() => setTab("lavoro")}>
          <Building2 size={14} className="mr-2" />Abbinamenti Lavoro ({matchLavoro.length})</Button>
      </div>

      {tab === "cerca" && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Lista beneficiari */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Beneficiari in uscita</CardTitle>
              <Input placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} className="mt-2" />
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
              {filteredBen.map(b => (
                <div key={b.id}
                  onClick={() => handleSelectBen(b)}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${selectedBen?.id === b.id ? "border-green-500 bg-green-50" : "border-gray-100 hover:bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{b.cognome} {b.nome}</p>
                    {b.stato !== "In Corso" && (
                      <Badge className={b.stato === "Abbinato Alloggio" ? "bg-orange-100 text-orange-700 text-[10px]" : "bg-indigo-100 text-indigo-700 text-[10px]"}>
                        {b.stato === "Abbinato Alloggio" ? "Ha alloggio" : "Ha lavoro"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{b.comune} · {b.n_componenti_nucleo} comp. · {b.area_intervento}</p>
                  <p className="text-xs text-gray-400">Uscita: {formatDate(b.data_uscita_sai)}</p>
                </div>
              ))}
              {filteredBen.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nessun beneficiario</p>}
            </CardContent>
          </Card>

          {/* Suggerimenti */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedBen ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-400">
                  <GitMerge size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Seleziona un beneficiario per vedere i suggerimenti di abbinamento</p>
                </CardContent>
              </Card>
            ) : loadingSug ? (
              <Card><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto" /></CardContent></Card>
            ) : (
              <>
                {/* Suggerimenti Alloggi */}
                {(selectedBen.area_intervento?.includes("ALLOGGIO") || selectedBen.area_intervento?.includes("LAVORATIVO-ALLOGGIO")) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Home size={16} className="text-orange-600" />
                        Alloggi suggeriti ({sugAlloggi.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sugAlloggi.length === 0 ? (
                        <p className="text-sm text-gray-400">Nessun alloggio compatibile trovato</p>
                      ) : sugAlloggi.map((s: any) => (
                        <div key={s.alloggio.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer" onClick={() => setDetailAlloggio(s)}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(s.score)}`}>{s.score}%</span>
                              <span className="font-medium text-sm">{s.alloggio.id_alloggio}</span>
                              <Badge variant="secondary" className="text-xs">{s.alloggio.tipologia}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {s.alloggio.comune} · {s.alloggio.indirizzo} · {s.alloggio.n_vani} vani · {formatCurrency(s.alloggio.canone_mensile)}
                              {s.distanzaKm != null && <span className="text-purple-600 ml-1">{s.distanzaKm} km{s.durataMin ? ` (~${s.durataMin} min)` : ""}</span>}
                              {s.stessoComune && <span className="text-green-600 ml-1">✓ Stesso comune</span>}
                              {s.canoneOk === true && <span className="text-green-600 ml-1">✓ Nel budget</span>}
                              {s.canoneOk === "parziale" && <span className="text-amber-600 ml-1">⚠ Leggermente sopra budget</span>}
                              {s.canoneOk === false && <span className="text-red-500 ml-1">✗ Fuori budget</span>}
                            </p>
                          </div>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); creaMatchAlloggio(s.alloggio.id); }}>
                            <Check size={14} className="mr-1" />Abbina
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Suggerimenti Aziende */}
                {selectedBen.area_intervento?.includes("LAVORATIVO") && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-600" />
                        Aziende suggerite ({sugAziende.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sugAziende.length === 0 ? (
                        <p className="text-sm text-gray-400">Nessuna azienda compatibile trovata</p>
                      ) : sugAziende.map((s: any) => (
                        <div key={s.azienda.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer" onClick={() => setDetailAzienda(s)}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(s.score)}`}>{s.score}%</span>
                              <span className="font-medium text-sm">{s.azienda.nome_azienda}</span>
                              <Badge variant="secondary" className="text-xs">{s.azienda.settore}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {s.azienda.comune} · {s.azienda.mansione_profilo} · {s.azienda.tipo_contratto}
                              {s.distanzaKm != null && <span className="text-purple-600 ml-1">{s.distanzaKm} km{s.durataMin ? ` (~${s.durataMin} min)` : ""}</span>}
                              {s.stessoComune && <span className="text-green-600 ml-1">✓ Stesso comune</span>}
                              {s.azienda.tirocinio === "S" && <span className="text-blue-600 ml-1">✓ Tirocinio</span>}
                            </p>
                          </div>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); creaMatchLavoro(s.azienda.id); }}>
                            <Check size={14} className="mr-1" />Abbina
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "alloggi" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
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
          </CardContent>
        </Card>
      )}

      {tab === "lavoro" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
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
          </CardContent>
        </Card>
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
