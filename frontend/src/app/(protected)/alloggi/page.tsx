"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { alloggiApi, geocodingApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, getStatoColor } from "@/lib/utils";
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, X, Save, Map, List, MapPin, Image as ImageIcon } from "lucide-react";
import GalleriaFoto from "@/components/GalleriaFoto";
import ComuneAutocomplete from "@/components/ComuneAutocomplete";
import { toast } from "sonner";

const MappaLeaflet = dynamic(() => import("@/components/MappaLeaflet"), { ssr: false });

const TIPOLOGIE = ["Appartamento", "Monolocale", "Bilocale", "Stanza singola", "Casa indipendente", "Posto letto", "Altro"];
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
  const [viewTab, setViewTab] = useState<"lista" | "mappa">("lista");
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [geocodingMsg, setGeocodingMsg] = useState("");
  const [selectedAlloggio, setSelectedAlloggio] = useState<any>(null);
  const [mapClickResult, setMapClickResult] = useState<{lat:number,lng:number,indirizzo:string,comune:string,cap:string}|null>(null);

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

  useEffect(() => { if (viewTab === "mappa") loadMapData(); }, [viewTab]);

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
    if (!form.id_alloggio) { toast.error("Inserisci l'ID Alloggio per continuare"); return; }
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
          <p className="text-sm text-gray-500">{total} registrati</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => { setViewTab("lista"); setSelectedAlloggio(null); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewTab === "lista" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
              <List size={14} />Lista</button>
            <button onClick={() => setViewTab("mappa")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewTab === "mappa" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
              <Map size={14} />Mappa</button>
          </div>
          {canEdit && <Button onClick={handleNew}><Plus size={16} className="mr-2" />Nuovo Alloggio</Button>}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <Input placeholder="Cerca per ID, indirizzo, proprietario..." className="pl-9"
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
                <Input value={form.id_alloggio} onChange={e => setForm({...form, id_alloggio: e.target.value})} placeholder="es. ALG01" disabled={!!editId} /></div>
              <div><label className="text-xs font-medium text-gray-500">Comune</label>
                <ComuneAutocomplete value={form.comune} onChange={v => setForm({...form, comune: v})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Indirizzo</label>
                <Input value={form.indirizzo} onChange={e => setForm({...form, indirizzo: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Tipologia</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.tipologia} onChange={e => setForm({...form, tipologia: e.target.value})}>
                  {TIPOLOGIE.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
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
      {viewTab === "mappa" && (
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
      {viewTab === "lista" && <Card>
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
    </div>
  );
}
