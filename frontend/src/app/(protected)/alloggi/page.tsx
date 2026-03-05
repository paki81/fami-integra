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

const MappaLeaflet = dynamic(() => import("@/components/MappaLeaflet"), { ssr: false });

const TIPOLOGIE = ["Appartamento", "Monolocale", "Bilocale", "Stanza singola", "Casa indipendente", "Posto letto", "Altro"];
const STATI = ["Disponibile", "Occupato", "In trattativa", "Non disponibile"];
const SPESE = ["S", "N", "Parziali"];

const emptyAlloggio = {
  id_alloggio: "", comune: "", indirizzo: "", tipologia: "Altro", n_vani: 1, piano: "",
  canone_mensile: "", spese_incluse: "N", proprietario: "", agenzia: "",
  telefono_referente: "", email_referente: "", disponibile_da: "", stato: "Disponibile", note: ""
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
  const [error, setError] = useState("");
  const [viewTab, setViewTab] = useState<"lista" | "mappa">("lista");
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [geocodingMsg, setGeocodingMsg] = useState("");
  const [selectedAlloggio, setSelectedAlloggio] = useState<any>(null);

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
    setGeocodingMsg("Geocodifica in corso...");
    try {
      const res = await geocodingApi.geocodeTuttiAlloggi();
      setGeocodingMsg(res.data.message);
      loadMapData();
    } catch (err: any) { setGeocodingMsg("Errore: " + (err.response?.data?.error || "Errore")); }
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
      disponibile_da: a.disponibile_da ? a.disponibile_da.split("T")[0] : "",
      stato: a.stato || "Disponibile", note: a.note || ""
    });
    setShowForm(true);
  };

  const handleNew = () => { setEditId(null); setForm({ ...emptyAlloggio }); setShowForm(true); };

  const handleSave = async () => {
    setError("");
    if (!form.id_alloggio) { setError("ID Alloggio obbligatorio"); return; }
    setSaving(true);
    try {
      const payload = { ...form, canone_mensile: form.canone_mensile ? parseFloat(String(form.canone_mensile)) : null };
      if (editId) { await alloggiApi.update(editId, payload); }
      else { await alloggiApi.create(payload); }
      setShowForm(false); fetchData();
    } catch (err: any) { setError(err.response?.data?.error || "Errore nel salvataggio"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Eliminare questo alloggio?")) return;
    try { await alloggiApi.delete(id); fetchData(); } catch (err) { console.error(err); }
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
            {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs font-medium text-gray-500">ID Alloggio *</label>
                <Input value={form.id_alloggio} onChange={e => setForm({...form, id_alloggio: e.target.value})} placeholder="es. ALG01" disabled={!!editId} /></div>
              <div><label className="text-xs font-medium text-gray-500">Comune</label>
                <Input value={form.comune} onChange={e => setForm({...form, comune: e.target.value})} /></div>
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
            {geocodingMsg && <p className={`text-xs mt-2 ${geocodingMsg.includes("Errore") ? "text-red-600" : "text-green-600"}`}>{geocodingMsg}</p>}
          </CardHeader>
          <CardContent>
            {loadingMap ? (
              <div className="h-[500px] flex items-center justify-center text-gray-400">Caricamento mappa...</div>
            ) : mapMarkers.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                <MapPin size={40} className="mb-2 opacity-30" />
                <p className="text-sm">Nessun alloggio geocodificato</p>
                <p className="text-xs mt-1">Clicca &quot;Geocodifica tutti&quot; per ottenere le coordinate dagli indirizzi</p>
              </div>
            ) : (
              <MappaLeaflet markers={mapMarkers} height="500px" />
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Comune</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Indirizzo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Tipologia</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Vani</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Canone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Disponibile</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Stato</th>
                  {canEdit && <th className="px-4 py-3 text-right font-medium text-gray-500">Azioni</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Caricamento...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nessun alloggio trovato</td></tr>
                ) : data.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedAlloggio(a)}>
                    <td className="px-4 py-3 font-mono text-gray-600">{a.id_alloggio}</td>
                    <td className="px-4 py-3 text-gray-700">{a.comune || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{a.indirizzo || "-"}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{a.tipologia}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{a.n_vani}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(a.canone_mensile)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(a.disponibile_da)}</td>
                    <td className="px-4 py-3"><Badge className={getStatoColor(a.stato)}>{a.stato}</Badge></td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
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
