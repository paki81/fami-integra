"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { alloggiApi, geocodingApi, contrattiApi, beneficiariApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, getStatoColor } from "@/lib/utils";
import React from "react";
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, X, Save, Map, List, MapPin, Image as ImageIcon, FileText, Pencil } from "lucide-react";
import GalleriaFoto from "@/components/GalleriaFoto";
import ComuneAutocomplete from "@/components/ComuneAutocomplete";
import RegistroNote from "@/components/RegistroNote";
import { toast } from "sonner";

const MappaLeaflet = dynamic(() => import("@/components/MappaLeaflet"), { ssr: false });

const TIPOLOGIE = ["Appartamento", "Monolocale", "Bilocale", "Trilocale", "Stanza singola", "Casa", "Casa indipendente", "Mansarda", "Posto letto", "Altro"];
const STATI = ["Disponibile – da verificare", "Contattato – risposta positiva", "Contattato – risposta negativa", "Occupato", "In trattativa", "Contratto firmato"];
const SPESE = ["S", "N", "Parziali"];

const emptyAlloggio = {
  id_alloggio: "", comune: "", indirizzo: "", tipologia: "Altro", n_vani: 1, piano: "",
  canone_mensile: "", spese_incluse: "N", proprietario: "", agenzia: "",
  telefono_referente: "", email_referente: "", data_primo_contatto: "", disponibile_da: "", stato: "Disponibile – da verificare", note: ""
};

export default function AlloggiPage() {
  const { canEdit, canDelete } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filtroComune, setFiltroComune] = useState("");
  const [filtroStato, setFiltroStato] = useState("");
  const [comuni, setComuni] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyAlloggio });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [geocodingMsg, setGeocodingMsg] = useState("");
  const [selectedAlloggio, setSelectedAlloggio] = useState<any>(null);
  const [mapClickResult, setMapClickResult] = useState<{lat:number,lng:number,indirizzo:string,comune:string,cap:string}|null>(null);
  const [mainTab, setMainTab] = useState<"lista"|"mappa"|"contratti">("lista");
  const [contratti, setContratti] = useState<any[]>([]);
  const [contrattiTotal, setContrattiTotal] = useState(0);
  const [contrattiPage, setContrattiPage] = useState(1);
  const [contrattiPages, setContrattiPages] = useState(1);
  const [contrattiLoading, setContrattiLoading] = useState(false);
  const [filtroStatoContratto, setFiltroStatoContratto] = useState("");
  const [searchContratti, setSearchContratti] = useState("");
  const [editingContratto, setEditingContratto] = useState<any>(null);
  const [editContrattoForm, setEditContrattoForm] = useState<any>({});
  const [savingContratto, setSavingContratto] = useState(false);
  const [showNewContratto, setShowNewContratto] = useState(false);
  const [newContrattoForm, setNewContrattoForm] = useState<any>({ id_beneficiario: "", id_alloggio: "", comune: "", data_inizio_contratto: "", data_fine_contratto: "", canone_mensile: "", contributo_mensile: "", mesi_contributo_previsti: 0, note: "" });
  const [beneficiariList, setBeneficiariList] = useState<any[]>([]);
  const [alloggiList, setAlloggiList] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, sort: "id", order: "DESC" };
      if (search) params.search = search;
      if (filtroComune) params.comune = filtroComune;
      if (filtroStato) params.stato = filtroStato;
      const res = await alloggiApi.list(params);
      setData(res.data.data); setTotal(res.data.total); setPages(res.data.pages);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [page, search, filtroComune, filtroStato]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { alloggiApi.comuni().then(r => setComuni(r.data)).catch(() => {}); }, []);

  const loadMapData = async () => {
    setLoadingMap(true);
    try {
      const res = await geocodingApi.mappaAlloggi();
      setMapMarkers(res.data.map((a: any) => ({
        id: a.id, lat: parseFloat(a.latitudine), lng: parseFloat(a.longitudine),
        label: `${a.id_alloggio} - ${a.tipologia}`,
        popup: `<b>${a.id_alloggio}</b><br/>${a.indirizzo}, ${a.comune}<br/>${a.tipologia} - ${a.n_vani} vani<br/>Canone: €${a.canone_mensile}<br/>Stato: ${a.stato}`,
        color: a.stato === "Disponibile" ? "green" : a.stato === "In trattativa" ? "orange" : "red"
      })));
    } catch (err) { console.error(err); }
    setLoadingMap(false);
  };

  const handleGeocodeAll = async () => {
    toast.info("Geocodifica in corso...");
    try {
      const res = await geocodingApi.geocodeTuttiAlloggi();
      toast.success(res.data.message);
      loadMapData();
    } catch (err: any) { toast.error("Errore durante la geocodifica degli indirizzi"); }
  };

  useEffect(() => { if (mainTab === "mappa") loadMapData(); }, [mainTab]);

  // --- Monitoraggio Contratti ---
  const fetchContratti = useCallback(async () => {
    setContrattiLoading(true);
    try {
      const params: any = { page: contrattiPage, limit: 15 };
      if (filtroStatoContratto) params.stato_contratto = filtroStatoContratto;
      if (searchContratti) params.search = searchContratti;
      const res = await contrattiApi.list(params);
      setContratti(res.data.data); setContrattiTotal(res.data.total); setContrattiPages(res.data.pages);
    } catch (err) { console.error(err); }
    setContrattiLoading(false);
  }, [contrattiPage, filtroStatoContratto, searchContratti]);

  useEffect(() => { if (mainTab === "contratti") fetchContratti(); }, [mainTab, fetchContratti]);

  const startEditContratto = (c: any) => {
    setEditingContratto(c.id);
    setEditContrattoForm({
      data_inizio_contratto: c.data_inizio_contratto ? c.data_inizio_contratto.split("T")[0] : "",
      data_fine_contratto: c.data_fine_contratto ? c.data_fine_contratto.split("T")[0] : "",
      canone_mensile: c.canone_mensile || "",
      contributo_mensile: c.contributo_mensile || "",
      mesi_contributo_previsti: c.mesi_contributo_previsti || 0,
      pagamenti_effettuati: c.pagamenti_effettuati || 0,
      ultimo_pagamento: c.ultimo_pagamento ? c.ultimo_pagamento.split("T")[0] : "",
      stato_contratto: c.stato_contratto || "Attivo",
      note: c.note || "",
    });
  };

  const saveContratto = async () => {
    if (!editingContratto) return;
    setSavingContratto(true);
    try {
      await contrattiApi.update(editingContratto, editContrattoForm);
      toast.success("Contratto aggiornato");
      setEditingContratto(null);
      fetchContratti();
    } catch (err: any) { toast.error(err.response?.data?.error || "Errore nel salvataggio"); }
    setSavingContratto(false);
  };

  const deleteContratto = (id: number) => {
    toast("Vuoi eliminare questo contratto?", {
      action: { label: "Elimina", onClick: async () => {
        try { await contrattiApi.delete(id); toast.success("Contratto eliminato"); fetchContratti(); }
        catch { toast.error("Errore nell'eliminazione"); }
      }},
      cancel: { label: "Annulla", onClick: () => {} },
      duration: 8000,
    });
  };

  const STATI_CONTRATTO = ["Attivo", "Scaduto", "Risolto anticipatamente", "In rinnovo"];

  const openNewContratto = async () => {
    setShowNewContratto(true);
    setNewContrattoForm({ id_beneficiario: "", id_alloggio: "", comune: "", data_inizio_contratto: "", data_fine_contratto: "", canone_mensile: "", contributo_mensile: "", mesi_contributo_previsti: 0, note: "" });
    try {
      const [resB, resA] = await Promise.all([
        beneficiariApi.list({ limit: 200, stato: "In Corso,Abbinato Alloggio,Abbinato Lavoro,Abbinato Entrambi" }),
        alloggiApi.list({ limit: 200 })
      ]);
      setBeneficiariList(resB.data.data || []);
      setAlloggiList(resA.data.data || []);
    } catch { toast.error("Errore nel caricamento liste"); }
  };

  const handleAlloggioSelectForContratto = (alloggioId: string) => {
    const al = alloggiList.find((a: any) => String(a.id) === alloggioId);
    setNewContrattoForm((prev: any) => ({
      ...prev,
      id_alloggio: alloggioId,
      comune: al?.comune || prev.comune,
      canone_mensile: al?.canone_mensile || prev.canone_mensile,
    }));
  };

  const saveNewContratto = async () => {
    if (!newContrattoForm.id_beneficiario || !newContrattoForm.id_alloggio) {
      toast.error("Seleziona beneficiario e alloggio"); return;
    }
    setSavingContratto(true);
    try {
      await contrattiApi.create(newContrattoForm);
      toast.success("Contratto creato");
      setShowNewContratto(false);
      fetchContratti();
    } catch (err: any) { toast.error(err.response?.data?.error || "Errore nella creazione"); }
    setSavingContratto(false);
  };

  const handleEdit = (a: any) => {
    setEditId(a.id);
    setForm({
      id_alloggio: a.id_alloggio || "", comune: a.comune || "", indirizzo: a.indirizzo || "",
      tipologia: a.tipologia || "Altro", n_vani: a.n_vani || 1, piano: a.piano || "",
      canone_mensile: a.canone_mensile || "", spese_incluse: a.spese_incluse || "N",
      proprietario: a.proprietario || "", agenzia: a.agenzia || "",
      telefono_referente: a.telefono_referente || "", email_referente: a.email_referente || "",
      data_primo_contatto: a.data_primo_contatto ? a.data_primo_contatto.split("T")[0] : "",
      disponibile_da: a.disponibile_da ? a.disponibile_da.split("T")[0] : "",
      stato: a.stato || "Disponibile – da verificare", note: a.note || ""
    });
    setShowForm(true);
  };

  const handleNew = () => { setEditId(null); setForm({ ...emptyAlloggio }); setMapClickResult(null); setShowForm(true); };

  const handleMapClick = (result: {lat:number,lng:number,indirizzo:string,comune:string,cap:string}) => {
    setMapClickResult(result);
    if (!showForm) {
      setEditId(null);
      setForm({ ...emptyAlloggio, indirizzo: result.indirizzo, comune: result.comune });
      setShowForm(true);
      toast.info("Indirizzo dalla mappa inserito nel form");
    }
  };

  const applyMapAddress = () => {
    if (!mapClickResult) return;
    setForm(f => ({ ...f, indirizzo: mapClickResult.indirizzo, comune: mapClickResult.comune }));
    toast.success("Indirizzo aggiornato dal punto sulla mappa");
    setMapClickResult(null);
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!form.id_alloggio.trim()) errors.id_alloggio = "L'ID alloggio è obbligatorio";
    if (!form.comune.trim()) errors.comune = "Il comune è obbligatorio";
    if (!form.indirizzo.trim()) errors.indirizzo = "L'indirizzo è obbligatorio";
    if (!form.tipologia) errors.tipologia = "Seleziona una tipologia";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) { toast.error("Compila tutti i campi obbligatori"); return; }
    setSaving(true);
    try {
      const payload = { ...form, canone_mensile: form.canone_mensile ? parseFloat(String(form.canone_mensile)) : null };
      if (editId) {
        await alloggiApi.update(editId, payload);
        toast.success("Alloggio aggiornato con successo");
      } else {
        await alloggiApi.create(payload);
        toast.success("Nuovo alloggio creato con successo");
      }
      setShowForm(false); fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg?.includes("DUP") || msg?.includes("già esistente")) toast.error("Esiste già un alloggio con questo ID");
      else if (msg?.includes("Incorrect")) toast.error("Controlla che le date e i numeri siano corretti");
      else toast.error(msg || "Si è verificato un errore durante il salvataggio");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    toast("Vuoi eliminare questo alloggio?", {
      action: { label: "Elimina", onClick: async () => {
        try {
          await alloggiApi.delete(id);
          toast.success("Alloggio eliminato");
          fetchData();
        } catch { toast.error("Impossibile eliminare l'alloggio. Potrebbe essere collegato ad altri dati."); }
      }},
      cancel: { label: "Annulla", onClick: () => {} },
      duration: 8000,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alloggi</h1>
          <p className="text-sm text-gray-500">{mainTab === "contratti" ? `${contrattiTotal} contratti` : `${total} registrati`}</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => { setMainTab("lista"); setSelectedAlloggio(null); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === "lista" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
              <List size={14} />Lista</button>
            <button onClick={() => setMainTab("mappa")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === "mappa" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
              <Map size={14} />Mappa</button>
            <button onClick={() => setMainTab("contratti")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === "contratti" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
              <FileText size={14} />Contratti</button>
          </div>
          {mainTab !== "contratti" && canEdit && <Button onClick={handleNew}><Plus size={16} className="mr-2" />Nuovo Alloggio</Button>}
          {mainTab === "contratti" && canEdit && <Button onClick={openNewContratto}><Plus size={16} className="mr-2" />Nuovo Contratto</Button>}
        </div>
      </div>

      {mainTab !== "contratti" && (<>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <Input placeholder="Cerca per ID, indirizzo, comune, proprietario..." className="pl-9"
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
              value={filtroComune} onChange={e => { setFiltroComune(e.target.value); setPage(1); }}>
              <option value="">Tutti i comuni</option>
              {comuni.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
              value={filtroStato} onChange={e => { setFiltroStato(e.target.value); setPage(1); }}>
              <option value="">Tutti gli stati</option>
              {STATI.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{editId ? "Modifica Alloggio" : "Nuovo Alloggio"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={18} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs font-medium text-gray-500">ID Alloggio *</label>
                <Input value={form.id_alloggio} onChange={e => { setForm({...form, id_alloggio: e.target.value}); setFormErrors(p => ({...p, id_alloggio: ""})); }} placeholder="es. ALG01" disabled={!!editId} className={formErrors.id_alloggio ? "border-red-400 focus:ring-red-500" : ""} />
                {formErrors.id_alloggio && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.id_alloggio}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Comune *</label>
                <ComuneAutocomplete value={form.comune} onChange={v => { setForm({...form, comune: v}); setFormErrors(p => ({...p, comune: ""})); }} />
                {formErrors.comune && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.comune}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Indirizzo *</label>
                <Input value={form.indirizzo} onChange={e => { setForm({...form, indirizzo: e.target.value}); setFormErrors(p => ({...p, indirizzo: ""})); }} className={formErrors.indirizzo ? "border-red-400 focus:ring-red-500" : ""} />
                {formErrors.indirizzo && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.indirizzo}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Tipologia *</label>
                <select className={`h-10 w-full px-3 rounded-md border text-sm bg-white ${formErrors.tipologia ? "border-red-400" : "border-gray-300"}`}
                  value={form.tipologia} onChange={e => { setForm({...form, tipologia: e.target.value}); setFormErrors(p => ({...p, tipologia: ""})); }}>
                  {TIPOLOGIE.map(t => <option key={t} value={t}>{t}</option>)}</select>
                {formErrors.tipologia && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.tipologia}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">N° Vani</label>
                <Input type="number" min={1} value={form.n_vani} onChange={e => setForm({...form, n_vani: parseInt(e.target.value) || 1})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Piano</label>
                <Input value={form.piano} onChange={e => setForm({...form, piano: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Canone Mensile (€)</label>
                <Input type="number" step="0.01" value={form.canone_mensile} onChange={e => setForm({...form, canone_mensile: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Spese Incluse</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.spese_incluse} onChange={e => setForm({...form, spese_incluse: e.target.value})}>
                  {SPESE.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-500">Proprietario</label>
                <Input value={form.proprietario} onChange={e => setForm({...form, proprietario: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Telefono Referente</label>
                <Input value={form.telefono_referente} onChange={e => setForm({...form, telefono_referente: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Email Referente</label>
                <Input value={form.email_referente} onChange={e => setForm({...form, email_referente: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Data Primo Contatto</label>
                <Input type="date" value={form.data_primo_contatto} onChange={e => setForm({...form, data_primo_contatto: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Disponibile da</label>
                <Input type="date" value={form.disponibile_da} onChange={e => setForm({...form, disponibile_da: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Stato</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.stato} onChange={e => setForm({...form, stato: e.target.value})}>
                  {STATI.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="sm:col-span-2 lg:col-span-3"><label className="text-xs font-medium text-gray-500">Note</label>
                <textarea className="w-full h-20 px-3 py-2 rounded-md border border-gray-300 text-sm resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></div>
              {editId && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <RegistroNote entita="alloggi" entitaId={editId} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
              <Button onClick={handleSave} disabled={saving}><Save size={16} className="mr-2" />{saving ? "Salvataggio..." : "Salva"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dettaglio alloggio con foto */}
      {selectedAlloggio && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-600" />
                Foto - {selectedAlloggio.id_alloggio} ({selectedAlloggio.indirizzo}, {selectedAlloggio.comune})
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedAlloggio(null)}><X size={18} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <GalleriaFoto alloggioId={selectedAlloggio.id} canEdit={canEdit} />
          </CardContent>
        </Card>
      )}

      {/* Mappa */}
      {mainTab === "mappa" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin size={18} className="text-green-600" />Mappa Alloggi
              </CardTitle>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={handleGeocodeAll} disabled={geocodingMsg === "Geocodifica in corso..."}>
                  <MapPin size={14} className="mr-1.5" />Geocodifica tutti
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingMap ? (
              <div className="h-[500px] flex items-center justify-center text-gray-400">Caricamento mappa...</div>
            ) : (
              <>
                {canEdit && <p className="text-xs text-gray-400 mb-2">Clicca sulla mappa per ottenere un indirizzo e creare un nuovo alloggio</p>}
                <MappaLeaflet markers={mapMarkers} height="500px" onMapClick={canEdit ? handleMapClick : undefined} />
                {mapClickResult && (
                  <div className="mt-2 flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <MapPin size={16} className="text-purple-600 shrink-0" />
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{mapClickResult.indirizzo || 'Indirizzo non trovato'}</span>
                      {mapClickResult.comune && <span className="text-gray-500"> — {mapClickResult.comune} {mapClickResult.cap}</span>}
                    </div>
                    <Button size="sm" onClick={applyMapAddress}>
                      <MapPin size={14} className="mr-1" />Usa indirizzo
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabella lista */}
      {mainTab === "lista" && <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">ID</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Comune</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Indirizzo</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Tipologia</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Vani</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Piano</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Canone</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Spese</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Proprietario</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Contatti</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Data Contatto</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Disponibile</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Esito / Stato</th>
                  {canEdit && <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs">Azioni</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={canEdit ? 14 : 13} className="px-4 py-8 text-center text-gray-400">Caricamento...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={canEdit ? 14 : 13} className="px-4 py-8 text-center text-gray-400">Nessun alloggio trovato</td></tr>
                ) : data.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedAlloggio(a)}>
                    <td className="px-3 py-3 font-mono text-gray-600 text-xs">{a.id_alloggio}</td>
                    <td className="px-3 py-3 text-gray-700 text-xs whitespace-nowrap">{a.comune || "-"}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{a.indirizzo || "-"}</td>
                    <td className="px-3 py-3"><Badge variant="secondary" className="text-xs">{a.tipologia}</Badge></td>
                    <td className="px-3 py-3 text-gray-600 text-xs text-center">{a.n_vani}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{a.piano || "-"}</td>
                    <td className="px-3 py-3 text-gray-700 font-medium text-xs whitespace-nowrap">{formatCurrency(a.canone_mensile)}</td>
                    <td className="px-3 py-3 text-xs">{a.spese_incluse === "S" ? <Badge className="bg-green-100 text-green-800 text-xs">Sì</Badge> : a.spese_incluse === "Parziali" ? <Badge className="bg-yellow-100 text-yellow-800 text-xs">Parziali</Badge> : <Badge className="bg-gray-100 text-gray-600 text-xs">No</Badge>}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{a.proprietario || a.agenzia || "-"}</td>
                    <td className="px-3 py-3 text-xs">
                      {a.telefono_referente && <div className="text-gray-600">{a.telefono_referente}</div>}
                      {a.email_referente && <div className="text-blue-600 truncate max-w-28">{a.email_referente}</div>}
                      {!a.telefono_referente && !a.email_referente && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(a.data_primo_contatto)}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(a.disponibile_da)}</td>
                    <td className="px-3 py-3"><Badge className={getStatoColor(a.stato) + " text-xs"}>{a.stato}</Badge></td>
                    {canEdit && (
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Edit size={14} /></Button>
                          <Button variant="ghost" size="icon" className="text-blue-500" onClick={() => setSelectedAlloggio(a)}><ImageIcon size={14} /></Button>
                          {canDelete && <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(a.id)}><Trash2 size={14} /></Button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">Pagina {page} di {pages} ({total} risultati)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>}
      </>)}

      {/* === TAB MONITORAGGIO CONTRATTI === */}
      {mainTab === "contratti" && (<>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <Input placeholder="Cerca per beneficiario, alloggio..." className="pl-9"
                  value={searchContratti} onChange={e => { setSearchContratti(e.target.value); setContrattiPage(1); }} />
              </div>
              <select className="h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
                value={filtroStatoContratto} onChange={e => { setFiltroStatoContratto(e.target.value); setContrattiPage(1); }}>
                <option value="">Tutti gli stati</option>
                {STATI_CONTRATTO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {showNewContratto && (
          <Card className="border-green-200 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Nuovo Contratto</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowNewContratto(false)}><X size={18} /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="text-xs font-medium text-gray-500">Beneficiario *</label>
                  <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white" value={newContrattoForm.id_beneficiario} onChange={e => setNewContrattoForm({...newContrattoForm, id_beneficiario: e.target.value})}>
                    <option value="">-- Seleziona --</option>
                    {beneficiariList.map((b: any) => <option key={b.id} value={b.id}>{b.cognome} {b.nome}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-gray-500">Alloggio *</label>
                  <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white" value={newContrattoForm.id_alloggio} onChange={e => handleAlloggioSelectForContratto(e.target.value)}>
                    <option value="">-- Seleziona --</option>
                    {alloggiList.map((a: any) => <option key={a.id} value={a.id}>{a.id_alloggio} - {a.indirizzo}, {a.comune}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-gray-500">Comune</label>
                  <Input value={newContrattoForm.comune} onChange={e => setNewContrattoForm({...newContrattoForm, comune: e.target.value})} /></div>
                <div><label className="text-xs font-medium text-gray-500">Data Inizio Contratto</label>
                  <Input type="date" value={newContrattoForm.data_inizio_contratto} onChange={e => setNewContrattoForm({...newContrattoForm, data_inizio_contratto: e.target.value})} /></div>
                <div><label className="text-xs font-medium text-gray-500">Data Fine Contratto</label>
                  <Input type="date" value={newContrattoForm.data_fine_contratto} onChange={e => setNewContrattoForm({...newContrattoForm, data_fine_contratto: e.target.value})} /></div>
                <div><label className="text-xs font-medium text-gray-500">Canone Mensile (€)</label>
                  <Input type="number" step="0.01" value={newContrattoForm.canone_mensile} onChange={e => setNewContrattoForm({...newContrattoForm, canone_mensile: e.target.value})} /></div>
                <div><label className="text-xs font-medium text-gray-500">Contributo Progetto (€/mese)</label>
                  <Input type="number" step="0.01" value={newContrattoForm.contributo_mensile} onChange={e => setNewContrattoForm({...newContrattoForm, contributo_mensile: e.target.value})} /></div>
                <div><label className="text-xs font-medium text-gray-500">Mesi Contributo Previsti</label>
                  <Input type="number" min={0} value={newContrattoForm.mesi_contributo_previsti} onChange={e => setNewContrattoForm({...newContrattoForm, mesi_contributo_previsti: parseInt(e.target.value) || 0})} /></div>
                <div className="sm:col-span-2 lg:col-span-3"><label className="text-xs font-medium text-gray-500">Note</label>
                  <Input value={newContrattoForm.note} onChange={e => setNewContrattoForm({...newContrattoForm, note: e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowNewContratto(false)}>Annulla</Button>
                <Button onClick={saveNewContratto} disabled={savingContratto}><Save size={16} className="mr-2" />{savingContratto ? "Salvataggio..." : "Salva"}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Beneficiario</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">ID Alloggio</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Comune</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Inizio</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Fine</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Canone</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Contributo/mese</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Mesi Previsti</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Totale Contrib.</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Pagamenti</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Ultimo Pag.</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Stato</th>
                    {canEdit && <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs">Azioni</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contrattiLoading ? (
                    <tr><td colSpan={canEdit ? 13 : 12} className="px-4 py-8 text-center text-gray-400">Caricamento...</td></tr>
                  ) : contratti.length === 0 ? (
                    <tr><td colSpan={canEdit ? 13 : 12} className="px-4 py-8 text-center text-gray-400">Nessun contratto trovato</td></tr>
                  ) : contratti.map((c: any) => (
                    <React.Fragment key={c.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3 font-medium text-sm whitespace-nowrap">{c.ben_cognome} {c.ben_nome}</td>
                        <td className="px-3 py-3 font-mono text-gray-600 text-xs">{c.id_alloggio}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{c.comune || c.alloggio_comune || "-"}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(c.data_inizio_contratto)}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(c.data_fine_contratto)}</td>
                        <td className="px-3 py-3 text-gray-700 font-medium text-xs whitespace-nowrap">{formatCurrency(c.canone_mensile)}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs">{formatCurrency(c.contributo_mensile)}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs text-center">{c.mesi_contributo_previsti || 0}</td>
                        <td className="px-3 py-3 text-gray-700 font-medium text-xs">{formatCurrency(c.totale_contributo)}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs text-center">{c.pagamenti_effettuati || 0}</td>
                        <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(c.ultimo_pagamento)}</td>
                        <td className="px-3 py-3">
                          <Badge className={c.stato_contratto === "Attivo" ? "bg-green-100 text-green-800 text-xs" : c.stato_contratto === "In rinnovo" ? "bg-blue-100 text-blue-800 text-xs" : c.stato_contratto === "Scaduto" ? "bg-red-100 text-red-800 text-xs" : "bg-yellow-100 text-yellow-800 text-xs"}>
                            {c.stato_contratto}</Badge></td>
                        {canEdit && (
                          <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => startEditContratto(c)}><Pencil size={14} /></Button>
                              {canDelete && <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => deleteContratto(c.id)}><Trash2 size={14} /></Button>}
                            </div>
                          </td>
                        )}
                      </tr>
                      {editingContratto === c.id && (
                        <tr className="bg-blue-50">
                          <td colSpan={canEdit ? 13 : 12} className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              <div><label className="text-xs font-medium text-gray-500">Data Inizio Contratto</label>
                                <Input type="date" value={editContrattoForm.data_inizio_contratto} onChange={e => setEditContrattoForm({...editContrattoForm, data_inizio_contratto: e.target.value})} /></div>
                              <div><label className="text-xs font-medium text-gray-500">Data Fine Contratto</label>
                                <Input type="date" value={editContrattoForm.data_fine_contratto} onChange={e => setEditContrattoForm({...editContrattoForm, data_fine_contratto: e.target.value})} /></div>
                              <div><label className="text-xs font-medium text-gray-500">Canone Mensile (€)</label>
                                <Input type="number" step="0.01" value={editContrattoForm.canone_mensile} onChange={e => setEditContrattoForm({...editContrattoForm, canone_mensile: e.target.value})} /></div>
                              <div><label className="text-xs font-medium text-gray-500">Contributo Progetto (€/mese)</label>
                                <Input type="number" step="0.01" value={editContrattoForm.contributo_mensile} onChange={e => setEditContrattoForm({...editContrattoForm, contributo_mensile: e.target.value})} /></div>
                              <div><label className="text-xs font-medium text-gray-500">Mesi Contributo Previsti</label>
                                <Input type="number" min={0} value={editContrattoForm.mesi_contributo_previsti} onChange={e => setEditContrattoForm({...editContrattoForm, mesi_contributo_previsti: parseInt(e.target.value) || 0})} /></div>
                              <div><label className="text-xs font-medium text-gray-500">Pagamenti Effettuati</label>
                                <Input type="number" min={0} value={editContrattoForm.pagamenti_effettuati} onChange={e => setEditContrattoForm({...editContrattoForm, pagamenti_effettuati: parseInt(e.target.value) || 0})} /></div>
                              <div><label className="text-xs font-medium text-gray-500">Ultimo Pagamento</label>
                                <Input type="date" value={editContrattoForm.ultimo_pagamento} onChange={e => setEditContrattoForm({...editContrattoForm, ultimo_pagamento: e.target.value})} /></div>
                              <div><label className="text-xs font-medium text-gray-500">Stato Contratto</label>
                                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white" value={editContrattoForm.stato_contratto} onChange={e => setEditContrattoForm({...editContrattoForm, stato_contratto: e.target.value})}>
                                  {STATI_CONTRATTO.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                              <div className="md:col-span-2"><label className="text-xs font-medium text-gray-500">Note</label>
                                <Input value={editContrattoForm.note} onChange={e => setEditContrattoForm({...editContrattoForm, note: e.target.value})} /></div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={saveContratto} disabled={savingContratto}><Save size={14} className="mr-1" />{savingContratto ? "Salvataggio..." : "Salva"}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingContratto(null)}><X size={14} className="mr-1" />Annulla</Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {contrattiPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">Pagina {contrattiPage} di {contrattiPages} ({contrattiTotal} risultati)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={contrattiPage <= 1} onClick={() => setContrattiPage(p => p - 1)}><ChevronLeft size={14} /></Button>
                  <Button variant="outline" size="sm" disabled={contrattiPage >= contrattiPages} onClick={() => setContrattiPage(p => p + 1)}><ChevronRight size={14} /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </>)}
    </div>
  );
}
