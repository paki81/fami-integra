"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { aziendeApi, geocodingApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, X, Save, Map, List, MapPin } from "lucide-react";
import ComuneAutocomplete from "@/components/ComuneAutocomplete";
import { toast } from "sonner";

const MappaLeaflet = dynamic(() => import("@/components/MappaLeaflet"), { ssr: false });

const ORARI = ["Full-time", "Part-time", "Su turni", "Stagionale", "Altro"];
const SETTORI = ["Agricoltura", "Ristorazione", "Edilizia", "Pulizie", "Logistica", "Commercio", "Altro"];
const TIPI_CONTRATTO = ["Tempo determinato", "Indeterminato", "Part time", "Tirocinio", "Lavoro occasionale"];
const ESITI_CONTATTO = ["Da contattare", "Contattato – risposta positiva", "Contattato – risposta negativa", "In attesa"];

const emptyAzienda = {
  id_azienda: "", nome_azienda: "", settore: "", mansione_profilo: "", tipo_contratto: "",
  orario: "Full-time", indirizzo: "", comune: "", cap: "", referente: "", telefono: "", email: "",
  data_primo_contatto: "", esito_contatto: "", disponibile: "S", tirocinio: "N", note: ""
};

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("it-IT") : "-";

export default function AziendePage() {
  const { canEdit, canDelete } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filtroComune, setFiltroComune] = useState("");
  const [filtroDisp, setFiltroDisp] = useState("");
  const [comuni, setComuni] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyAzienda });
  const [saving, setSaving] = useState(false);
  const [viewTab, setViewTab] = useState<"lista" | "mappa">("lista");
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [geocodingMsg, setGeocodingMsg] = useState("");
  const [mapClickResult, setMapClickResult] = useState<{lat:number,lng:number,indirizzo:string,comune:string,cap:string}|null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, sort: "id", order: "DESC" };
      if (search) params.search = search;
      if (filtroComune) params.comune = filtroComune;
      if (filtroDisp) params.disponibile = filtroDisp;
      const res = await aziendeApi.list(params);
      setData(res.data.data); setTotal(res.data.total); setPages(res.data.pages);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [page, search, filtroComune, filtroDisp]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { aziendeApi.comuni().then(r => setComuni(r.data)).catch(() => {}); }, []);

  const loadMapData = async () => {
    setLoadingMap(true);
    try {
      const res = await geocodingApi.mappaAziende();
      setMapMarkers(res.data.map((a: any) => ({
        id: a.id, lat: parseFloat(a.latitudine), lng: parseFloat(a.longitudine),
        label: a.nome_azienda,
        popup: `<b>${a.nome_azienda}</b><br/>${a.indirizzo}, ${a.comune}<br/>Settore: ${a.settore}<br/>Mansione: ${a.mansione_profilo || "-"}<br/>Disp: ${a.disponibile === "S" ? "S\u00ec" : "No"}`,
        color: a.disponibile === "S" ? "blue" : "red"
      })));
    } catch (err) { console.error(err); }
    setLoadingMap(false);
  };

  const handleGeocodeAll = async () => {
    toast.info("Geocodifica in corso...");
    try {
      const res = await geocodingApi.geocodeTutteAziende();
      toast.success(res.data.message);
      loadMapData();
    } catch (err: any) { toast.error("Errore durante la geocodifica degli indirizzi"); }
  };

  useEffect(() => { if (viewTab === "mappa") loadMapData(); }, [viewTab]);

  const handleEdit = (a: any) => {
    setEditId(a.id);
    setForm({
      id_azienda: a.id_azienda || "", nome_azienda: a.nome_azienda || "", settore: a.settore || "",
      mansione_profilo: a.mansione_profilo || "", tipo_contratto: a.tipo_contratto || "",
      orario: a.orario || "Full-time", indirizzo: a.indirizzo || "", comune: a.comune || "", cap: a.cap || "",
      referente: a.referente || "", telefono: a.telefono || "", email: a.email || "",
      data_primo_contatto: a.data_primo_contatto ? a.data_primo_contatto.split("T")[0] : "",
      esito_contatto: a.esito_contatto || "",
      disponibile: a.disponibile || "S", tirocinio: a.tirocinio || "N", note: a.note || ""
    });
    setShowForm(true);
  };

  const handleNew = () => { setEditId(null); setForm({ ...emptyAzienda }); setMapClickResult(null); setShowForm(true); };

  const handleMapClick = (result: {lat:number,lng:number,indirizzo:string,comune:string,cap:string}) => {
    setMapClickResult(result);
    if (!showForm) {
      setEditId(null);
      setForm({ ...emptyAzienda, indirizzo: result.indirizzo, comune: result.comune });
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
    if (!form.id_azienda || !form.nome_azienda) { toast.error("Inserisci ID Azienda e Nome per continuare"); return; }
    setSaving(true);
    try {
      if (editId) {
        await aziendeApi.update(editId, form);
        toast.success("Azienda aggiornata con successo");
      } else {
        await aziendeApi.create(form);
        toast.success("Nuova azienda creata con successo");
      }
      setShowForm(false); fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg?.includes("DUP") || msg?.includes("già esistente")) toast.error("Esiste già un'azienda con questo ID");
      else if (msg?.includes("Incorrect")) toast.error("Controlla che le date e i numeri siano corretti");
      else toast.error(msg || "Si è verificato un errore durante il salvataggio");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    toast("Vuoi eliminare questa azienda?", {
      action: { label: "Elimina", onClick: async () => {
        try {
          await aziendeApi.delete(id);
          toast.success("Azienda eliminata");
          fetchData();
        } catch { toast.error("Impossibile eliminare l'azienda. Potrebbe essere collegata ad altri dati."); }
      }},
      cancel: { label: "Annulla", onClick: () => {} },
      duration: 8000,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aziende</h1>
          <p className="text-sm text-gray-500">{total} registrate</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewTab("lista")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewTab === "lista" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
              <List size={14} />Lista</button>
            <button onClick={() => setViewTab("mappa")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewTab === "mappa" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
              <Map size={14} />Mappa</button>
          </div>
          {canEdit && <Button onClick={handleNew}><Plus size={16} className="mr-2" />Nuova Azienda</Button>}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <Input placeholder="Cerca per nome, mansione, comune, CAP..." className="pl-9"
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
              value={filtroComune} onChange={e => { setFiltroComune(e.target.value); setPage(1); }}>
              <option value="">Tutti i comuni</option>
              {comuni.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
              value={filtroDisp} onChange={e => { setFiltroDisp(e.target.value); setPage(1); }}>
              <option value="">Tutti</option>
              <option value="S">Disponibili</option>
              <option value="N">Non disponibili</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{editId ? "Modifica Azienda" : "Nuova Azienda"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={18} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs font-medium text-gray-500">ID Azienda *</label>
                <Input value={form.id_azienda} onChange={e => setForm({...form, id_azienda: e.target.value})} placeholder="es. AZ001" disabled={!!editId} /></div>
              <div><label className="text-xs font-medium text-gray-500">Nome Azienda *</label>
                <Input value={form.nome_azienda} onChange={e => setForm({...form, nome_azienda: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Settore</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.settore} onChange={e => setForm({...form, settore: e.target.value})}>
                  <option value="">-- Seleziona --</option>
                  {SETTORI.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="sm:col-span-2"><label className="text-xs font-medium text-gray-500">Mansione/Profilo</label>
                <Input value={form.mansione_profilo} onChange={e => setForm({...form, mansione_profilo: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Tipo Contratto</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.tipo_contratto} onChange={e => setForm({...form, tipo_contratto: e.target.value})}>
                  <option value="">-- Seleziona --</option>
                  {TIPI_CONTRATTO.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-500">Orario</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.orario} onChange={e => setForm({...form, orario: e.target.value})}>
                  {ORARI.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-500">Indirizzo</label>
                <Input value={form.indirizzo} onChange={e => setForm({...form, indirizzo: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Comune</label>
                <ComuneAutocomplete value={form.comune} onChange={v => setForm({...form, comune: v})} /></div>
              <div><label className="text-xs font-medium text-gray-500">CAP</label>
                <Input value={form.cap} onChange={e => setForm({...form, cap: e.target.value})} placeholder="es. 71021" maxLength={5} /></div>
              <div><label className="text-xs font-medium text-gray-500">Referente</label>
                <Input value={form.referente} onChange={e => setForm({...form, referente: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Telefono</label>
                <Input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Email</label>
                <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Data Primo Contatto</label>
                <Input type="date" value={form.data_primo_contatto} onChange={e => setForm({...form, data_primo_contatto: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Esito Contatto</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.esito_contatto} onChange={e => setForm({...form, esito_contatto: e.target.value})}>
                  <option value="">-- Seleziona --</option>
                  {ESITI_CONTATTO.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-500">Disponibile</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.disponibile} onChange={e => setForm({...form, disponibile: e.target.value})}>
                  <option value="S">Sì</option><option value="N">No</option></select></div>
              <div><label className="text-xs font-medium text-gray-500">Tirocinio</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.tirocinio} onChange={e => setForm({...form, tirocinio: e.target.value})}>
                  <option value="S">Sì</option><option value="N">No</option></select></div>
              <div className="sm:col-span-2 lg:col-span-3"><label className="text-xs font-medium text-gray-500">Note</label>
                <textarea className="w-full h-20 px-3 py-2 rounded-md border border-gray-300 text-sm resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
              <Button onClick={handleSave} disabled={saving}><Save size={16} className="mr-2" />{saving ? "Salvataggio..." : "Salva"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mappa */}
      {viewTab === "mappa" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />Mappa Aziende
              </CardTitle>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={handleGeocodeAll} disabled={geocodingMsg === "Geocodifica in corso..."}>
                  <MapPin size={14} className="mr-1.5" />Geocodifica tutte
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingMap ? (
              <div className="h-[500px] flex items-center justify-center text-gray-400">Caricamento mappa...</div>
            ) : (
              <>
                {canEdit && <p className="text-xs text-gray-400 mb-2">Clicca sulla mappa per ottenere un indirizzo e creare una nuova azienda</p>}
                <MappaLeaflet markers={mapMarkers} height="500px" onMapClick={canEdit ? handleMapClick : undefined} />
                {mapClickResult && (
                  <div className="mt-2 flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <MapPin size={16} className="text-purple-600 shrink-0" />
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{mapClickResult.indirizzo || 'Indirizzo non trovato'}</span>
                      {mapClickResult.comune && <span className="text-gray-500"> \u2014 {mapClickResult.comune} {mapClickResult.cap}</span>}
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
      {viewTab === "lista" && <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">ID</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Azienda</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Settore</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Mansione</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Contratto</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Orario</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Comune</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">CAP</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Referente</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Contatti</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Data Contatto</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Esito</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Disp.</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 text-xs">Tirocinio</th>
                  {canEdit && <th className="px-3 py-3 text-right font-medium text-gray-500 text-xs">Azioni</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={canEdit ? 15 : 14} className="px-4 py-8 text-center text-gray-400">Caricamento...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={canEdit ? 15 : 14} className="px-4 py-8 text-center text-gray-400">Nessuna azienda trovata</td></tr>
                ) : data.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 font-mono text-gray-600 text-xs">{a.id_azienda}</td>
                    <td className="px-3 py-3 font-medium text-gray-900 text-sm whitespace-nowrap">{a.nome_azienda}</td>
                    <td className="px-3 py-3"><Badge variant="secondary" className="text-xs">{a.settore || "-"}</Badge></td>
                    <td className="px-3 py-3 text-gray-600 text-xs max-w-40 truncate">{a.mansione_profilo || "-"}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{a.tipo_contratto || "-"}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{a.orario || "-"}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{a.comune || "-"}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{a.cap || "-"}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{a.referente || "-"}</td>
                    <td className="px-3 py-3 text-xs">
                      {a.telefono && <div className="text-gray-600">{a.telefono}</div>}
                      {a.email && <div className="text-blue-600 truncate max-w-32">{a.email}</div>}
                      {!a.telefono && !a.email && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(a.data_primo_contatto)}</td>
                    <td className="px-3 py-3 text-xs">{a.esito_contatto ? (
                      <Badge className={a.esito_contatto.includes("positiva") ? "bg-green-100 text-green-800 text-xs" : a.esito_contatto.includes("negativa") ? "bg-red-100 text-red-800 text-xs" : "bg-yellow-100 text-yellow-800 text-xs"}>
                        {a.esito_contatto.replace("Contattato – ", "")}</Badge>
                    ) : "-"}</td>
                    <td className="px-3 py-3">
                      <Badge className={a.disponibile === "S" ? "bg-green-100 text-green-800 text-xs" : "bg-red-100 text-red-800 text-xs"}>
                        {a.disponibile === "S" ? "Sì" : "No"}</Badge></td>
                    <td className="px-3 py-3">
                      <Badge className={a.tirocinio === "S" ? "bg-blue-100 text-blue-800 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                        {a.tirocinio === "S" ? "Sì" : "No"}</Badge></td>
                    {canEdit && (
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Edit size={14} /></Button>
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
    </div>
  );
}
