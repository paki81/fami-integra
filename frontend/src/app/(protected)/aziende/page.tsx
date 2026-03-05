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

const MappaLeaflet = dynamic(() => import("@/components/MappaLeaflet"), { ssr: false });

const ORARI = ["Full-time", "Part-time", "Su turni", "Altro"];

const emptyAzienda = {
  id_azienda: "", nome_azienda: "", settore: "", mansione_profilo: "", tipo_contratto: "",
  orario: "Full-time", indirizzo: "", comune: "", referente: "", telefono: "", email: "",
  disponibile: "S", tirocinio: "N", note: ""
};

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
  const [error, setError] = useState("");
  const [viewTab, setViewTab] = useState<"lista" | "mappa">("lista");
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [geocodingMsg, setGeocodingMsg] = useState("");

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
    setGeocodingMsg("Geocodifica in corso...");
    try {
      const res = await geocodingApi.geocodeTutteAziende();
      setGeocodingMsg(res.data.message);
      loadMapData();
    } catch (err: any) { setGeocodingMsg("Errore: " + (err.response?.data?.error || "Errore")); }
  };

  useEffect(() => { if (viewTab === "mappa") loadMapData(); }, [viewTab]);

  const handleEdit = (a: any) => {
    setEditId(a.id);
    setForm({
      id_azienda: a.id_azienda || "", nome_azienda: a.nome_azienda || "", settore: a.settore || "",
      mansione_profilo: a.mansione_profilo || "", tipo_contratto: a.tipo_contratto || "",
      orario: a.orario || "Full-time", indirizzo: a.indirizzo || "", comune: a.comune || "",
      referente: a.referente || "", telefono: a.telefono || "", email: a.email || "",
      disponibile: a.disponibile || "S", tirocinio: a.tirocinio || "N", note: a.note || ""
    });
    setShowForm(true);
  };

  const handleNew = () => { setEditId(null); setForm({ ...emptyAzienda }); setShowForm(true); };

  const handleSave = async () => {
    setError("");
    if (!form.id_azienda || !form.nome_azienda) { setError("ID Azienda e Nome obbligatori"); return; }
    setSaving(true);
    try {
      if (editId) { await aziendeApi.update(editId, form); }
      else { await aziendeApi.create(form); }
      setShowForm(false); fetchData();
    } catch (err: any) { setError(err.response?.data?.error || "Errore nel salvataggio"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Eliminare questa azienda?")) return;
    try { await aziendeApi.delete(id); fetchData(); } catch (err) { console.error(err); }
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
              <Input placeholder="Cerca per nome, mansione, referente..." className="pl-9"
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
            {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs font-medium text-gray-500">ID Azienda *</label>
                <Input value={form.id_azienda} onChange={e => setForm({...form, id_azienda: e.target.value})} placeholder="es. AZ001" disabled={!!editId} /></div>
              <div><label className="text-xs font-medium text-gray-500">Nome Azienda *</label>
                <Input value={form.nome_azienda} onChange={e => setForm({...form, nome_azienda: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Settore</label>
                <Input value={form.settore} onChange={e => setForm({...form, settore: e.target.value})} placeholder="es. Ristorazione" /></div>
              <div className="sm:col-span-2"><label className="text-xs font-medium text-gray-500">Mansione/Profilo</label>
                <Input value={form.mansione_profilo} onChange={e => setForm({...form, mansione_profilo: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Tipo Contratto</label>
                <Input value={form.tipo_contratto} onChange={e => setForm({...form, tipo_contratto: e.target.value})} placeholder="es. Tirocinio" /></div>
              <div><label className="text-xs font-medium text-gray-500">Orario</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.orario} onChange={e => setForm({...form, orario: e.target.value})}>
                  {ORARI.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-500">Indirizzo</label>
                <Input value={form.indirizzo} onChange={e => setForm({...form, indirizzo: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Comune</label>
                <Input value={form.comune} onChange={e => setForm({...form, comune: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Referente</label>
                <Input value={form.referente} onChange={e => setForm({...form, referente: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Telefono</label>
                <Input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Email</label>
                <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
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
            {geocodingMsg && <p className={`text-xs mt-2 ${geocodingMsg.includes("Errore") ? "text-red-600" : "text-green-600"}`}>{geocodingMsg}</p>}
          </CardHeader>
          <CardContent>
            {loadingMap ? (
              <div className="h-[500px] flex items-center justify-center text-gray-400">Caricamento mappa...</div>
            ) : mapMarkers.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                <MapPin size={40} className="mb-2 opacity-30" />
                <p className="text-sm">Nessuna azienda geocodificata</p>
                <p className="text-xs mt-1">Clicca &quot;Geocodifica tutte&quot; per ottenere le coordinate dagli indirizzi</p>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Azienda</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Settore</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Mansione</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Contratto</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Comune</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Disp.</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Tirocinio</th>
                  {canEdit && <th className="px-4 py-3 text-right font-medium text-gray-500">Azioni</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Caricamento...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nessuna azienda trovata</td></tr>
                ) : data.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-600">{a.id_azienda}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.nome_azienda}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{a.settore || "-"}</Badge></td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-48 truncate">{a.mansione_profilo || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{a.tipo_contratto || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{a.comune || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge className={a.disponibile === "S" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {a.disponibile === "S" ? "Sì" : "No"}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge className={a.tirocinio === "S" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}>
                        {a.tirocinio === "S" ? "Sì" : "No"}</Badge></td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
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
