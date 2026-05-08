"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { serviziWelfareApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Edit, Trash2, X, Save, Search, Phone, HeartHandshake,
  MapPin, ChevronRight, Eye, ArrowLeft, Building, Upload, RefreshCw
} from "lucide-react";
import ComuneAutocomplete from "@/components/ComuneAutocomplete";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const MappaServiziWelfare = dynamic(() => import("@/components/MappaServiziWelfare"), { ssr: false });

const CATEGORIE = [
  "Sanitario", "Psicologico", "Socio-assist.", "Antiviolenza",
  "Istruzione / Lingua", "Supporto Legale", "Mediazione", "Supporto Amm.vo",
  "Associazioni Religiose", "Associazioni Culturali", "Associazioni Sportive", "Altro",
];

const IN_LOCO_OPTIONS = ["Si", "No", "Parz.", "Da verificare"];

const TARGET_OPTIONS = [
  "Tutti", "Adulti", "Minori", "Donne", "Giovani adulti M", "Benef. FAMI",
  "Richiedenti protezione", "Famiglie con minori", "Minori 6-16 anni", "Persone in difficoltà",
];

const categoriaBadgeColor: Record<string, string> = {
  "Sanitario": "bg-red-100 text-red-800",
  "Psicologico": "bg-purple-100 text-purple-800",
  "Socio-assist.": "bg-orange-100 text-orange-800",
  "Antiviolenza": "bg-pink-100 text-pink-800",
  "Istruzione / Lingua": "bg-blue-100 text-blue-800",
  "Supporto Legale": "bg-indigo-100 text-indigo-800",
  "Mediazione": "bg-teal-100 text-teal-800",
  "Supporto Amm.vo": "bg-cyan-100 text-cyan-800",
  "Associazioni Religiose": "bg-amber-100 text-amber-800",
  "Associazioni Culturali": "bg-emerald-100 text-emerald-800",
  "Associazioni Sportive": "bg-lime-100 text-lime-800",
  "Altro": "bg-gray-100 text-gray-600",
};

const emptyForm = {
  nome_ente: "", comune_erogatore: "", indirizzo_sede: "",
  contatto: "", orario_giorno: "", in_loco: "Da verificare",
  target_utenza: "", note_accesso: "", attivo: true,
  servizi: [] as { categoria: string; descrizione: string }[],
};

export default function ServiziWelfarePage() {
  const { user } = useAuth();
  const canEdit = ["superadmin", "admin", "tutor", "counselor"].includes(user?.ruolo || "");
  const canDelete = ["superadmin", "admin"].includes(user?.ruolo || "");

  const [vista, setVista] = useState<"comuni" | "dettaglio">("comuni");
  const [comuneSelezionato, setComuneSelezionato] = useState("");

  const [comuniList, setComuniList] = useState<any[]>([]);
  const [loadingComuni, setLoadingComuni] = useState(true);
  const [searchComune, setSearchComune] = useState("");

  const [entiComune, setEntiComune] = useState<any[]>([]);
  const [loadingEnti, setLoadingEnti] = useState(false);
  const [searchEnte, setSearchEnte] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  const [mappaEnti, setMappaEnti] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [detailItem, setDetailItem] = useState<any>(null);

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importModalita, setImportModalita] = useState<'aggiungi' | 'sostituisci'>('aggiungi');
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // --- Fetch ---
  const fetchComuni = useCallback(async () => {
    setLoadingComuni(true);
    try {
      const params: Record<string, any> = {};
      if (searchComune) params.search = searchComune;
      const res = await serviziWelfareApi.comuni(params);
      setComuniList(res.data);
    } catch { toast.error("Errore nel caricamento dei comuni"); }
    setLoadingComuni(false);
  }, [searchComune]);

  const fetchEntiComune = useCallback(async (comune: string) => {
    setLoadingEnti(true);
    try {
      const params: Record<string, any> = {};
      if (searchEnte) params.search = searchEnte;
      if (filterCategoria) params.categoria = filterCategoria;
      const res = await serviziWelfareApi.perComune(comune, params);
      setEntiComune(res.data);
    } catch { toast.error("Errore nel caricamento degli enti"); }
    setLoadingEnti(false);
  }, [searchEnte, filterCategoria]);

  const fetchMappa = useCallback(async () => {
    try { const res = await serviziWelfareApi.mappa(); setMappaEnti(res.data); }
    catch { /* silent */ }
  }, []);

  useEffect(() => { fetchComuni(); fetchMappa(); }, [fetchComuni, fetchMappa]);

  useEffect(() => {
    if (vista === "dettaglio" && comuneSelezionato) fetchEntiComune(comuneSelezionato);
  }, [vista, comuneSelezionato, fetchEntiComune]);

  const openComune = (comune: string) => {
    setComuneSelezionato(comune); setVista("dettaglio");
    setSearchEnte(""); setFilterCategoria(""); setShowForm(false); setDetailItem(null);
  };

  const backToComuni = () => {
    setVista("comuni"); setComuneSelezionato("");
    setShowForm(false); setDetailItem(null);
    fetchComuni(); fetchMappa();
  };

  // --- Servizi nel form ---
  const addServizio = () => {
    setForm(f => ({ ...f, servizi: [...f.servizi, { categoria: "", descrizione: "" }] }));
  };
  const removeServizio = (idx: number) => {
    setForm(f => ({ ...f, servizi: f.servizi.filter((_, i) => i !== idx) }));
  };
  const updateServizio = (idx: number, field: string, value: string) => {
    setForm(f => ({
      ...f,
      servizi: f.servizi.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  // --- CRUD ---
  const handleNew = () => {
    setEditId(null);
    setForm({ ...emptyForm, comune_erogatore: vista === "dettaglio" ? comuneSelezionato : "", servizi: [{ categoria: "", descrizione: "" }] });
    setFormErrors({}); setDetailItem(null); setShowForm(true);
  };

  const handleEdit = (ente: any) => {
    setEditId(ente.id);
    setForm({
      nome_ente: ente.nome_ente || "",
      comune_erogatore: ente.comune_erogatore || "",
      indirizzo_sede: ente.indirizzo_sede || "",
      contatto: ente.contatto || "",
      orario_giorno: ente.orario_giorno || "",
      in_loco: ente.in_loco || "Da verificare",
      target_utenza: ente.target_utenza || "",
      note_accesso: ente.note_accesso || "",
      attivo: !!ente.attivo,
      servizi: (ente.servizi || []).map((s: any) => ({ categoria: s.categoria || "", descrizione: s.descrizione || "" })),
    });
    if (form.servizi.length === 0) setForm(f => ({ ...f, servizi: [{ categoria: "", descrizione: "" }] }));
    setFormErrors({}); setDetailItem(null); setShowForm(true);
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!form.nome_ente.trim()) errors.nome_ente = "Il nome ente è obbligatorio";
    if (!form.comune_erogatore.trim()) errors.comune_erogatore = "Il comune è obbligatorio";
    const validServizi = form.servizi.filter(s => s.categoria);
    if (validServizi.length === 0) errors.servizi = "Seleziona almeno un servizio";
    if (Object.keys(errors).length) { setFormErrors(errors); toast.error("Compila tutti i campi obbligatori"); return; }

    setSaving(true);
    try {
      const payload = { ...form, servizi: validServizi };
      if (editId) {
        await serviziWelfareApi.update(editId, payload);
        toast.success("Ente aggiornato con successo");
      } else {
        await serviziWelfareApi.create(payload);
        toast.success("Ente aggiunto con successo");
      }
      setShowForm(false);
      if (vista === "dettaglio") fetchEntiComune(comuneSelezionato);
      fetchComuni(); fetchMappa();
    } catch (err: any) { toast.error(err.response?.data?.error || "Errore durante il salvataggio"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    toast("Vuoi eliminare questo ente e tutti i suoi servizi?", {
      action: { label: "Elimina", onClick: async () => {
        try {
          await serviziWelfareApi.delete(id);
          toast.success("Ente eliminato");
          if (vista === "dettaglio") fetchEntiComune(comuneSelezionato);
          fetchComuni(); fetchMappa();
        } catch { toast.error("Impossibile eliminare l'ente"); }
      }},
      cancel: { label: "Annulla", onClick: () => {} },
      duration: 8000,
    });
  };


  const handleImporta = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importModalita === 'sostituisci') {
      const ok = window.confirm('ATTENZIONE: Tutti gli enti e servizi esistenti verranno eliminati e sostituiti con i dati del file. Continuare?');
      if (!ok) { if (importFileRef.current) importFileRef.current.value = ''; return; }
    }
    setImporting(true);
    try {
      const res = await serviziWelfareApi.importa(file, importModalita);
      toast.success(res.data.message);
      if (res.data.errori?.length) {
        toast.warning(`${res.data.errori.length} righe con errori`);
        console.warn('Errori importazione:', res.data.errori);
      }
      setShowImportDialog(false);
      fetchComuni(); fetchMappa();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Errore durante l\'importazione');
    }
    setImporting(false);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  // ===================== VISTA COMUNI =====================
  if (vista === "comuni") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HeartHandshake size={26} className="text-green-600" />
              Servizi Welfare
            </h1>
            <p className="text-sm text-gray-500">{comuniList.length} comuni con enti registrati</p>
          </div>
          <div className="flex gap-2">
            {canDelete && (
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                <Upload size={16} className="mr-2" />Importa Excel
              </Button>
            )}
            {canEdit && (
              <Button onClick={handleNew}><Plus size={16} className="mr-2" />Nuovo Ente</Button>
            )}
          </div>
        </div>

        {/* Dialog importazione */}
        {showImportDialog && (
          <Card className="border-blue-200 shadow-lg">
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Upload size={18} className="text-blue-600" /> Importa Servizi Welfare da Excel</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowImportDialog(false)}><X size={16} /></Button>
              </div>
              <p className="text-sm text-gray-500 mb-3">Il file Excel deve avere un foglio per ogni comune con colonne: Categoria, Servizio/Ente, Comune Erogatore, Contatto, Orario/Giorno, In Loco?, Target, Note Accesso</p>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Modalita</label>
                  <select className="px-3 py-2 rounded-md border border-gray-300 text-sm bg-white" value={importModalita} onChange={e => setImportModalita(e.target.value as any)}>
                    <option value="aggiungi">Aggiungi ai dati esistenti</option>
                    <option value="sostituisci">Sostituisci tutto (elimina esistenti)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">File Excel (.xlsx)</label>
                  <input ref={importFileRef} type="file" accept=".xlsx,.xls" onChange={handleImporta} disabled={importing}
                    className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                {importing && <div className="flex items-center gap-2 text-blue-600 text-sm"><RefreshCw size={14} className="animate-spin" />Importazione in corso...</div>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Cerca comune, ente o servizio..." value={searchComune}
                  onChange={e => setSearchComune(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchComuni()}
                  className="pl-9" />
              </div>
              {searchComune && (
                <Button variant="ghost" size="sm" onClick={() => setSearchComune("")} className="text-gray-500 shrink-0">
                  <X size={14} className="mr-1" />Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {showForm && renderForm()}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Comune</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">Enti</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">Servizi</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingComuni ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Caricamento...</td></tr>
                  ) : comuniList.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      {searchComune ? "Nessun risultato trovato" : "Nessun ente registrato. Aggiungi il primo!"}
                    </td></tr>
                  ) : comuniList.map(c => (
                    <tr key={c.comune_erogatore} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => openComune(c.comune_erogatore)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-green-600 flex-shrink-0" />
                          <span className="font-medium text-gray-900">{c.comune_erogatore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-blue-100 text-blue-800">{c.n_enti}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-green-100 text-green-800">{c.n_servizi}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); openComune(c.comune_erogatore); }}>
                          <ChevronRight size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin size={18} className="text-green-600" />Mappa Enti nel Territorio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mappaEnti.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                <HeartHandshake size={40} className="mb-2 opacity-30" />
                <p className="text-sm">Nessun ente geocodificato</p>
              </div>
            ) : (
              <MappaServiziWelfare enti={mappaEnti} height="450px" />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===================== VISTA DETTAGLIO COMUNE =====================
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={backToComuni} className="shrink-0"><ArrowLeft size={20} /></Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={22} className="text-green-600" />{comuneSelezionato}
            </h1>
            <p className="text-sm text-gray-500">{entiComune.length} enti welfare registrati</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={handleNew}><Plus size={16} className="mr-2" />Nuovo Ente</Button>
        )}
      </div>

      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Cerca ente o servizio</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Cerca ente, servizio, contatto..."
                  value={searchEnte}
                  onChange={e => setSearchEnte(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchEntiComune(comuneSelezionato)}
                  className="pl-9" />
              </div>
            </div>
            <div className="w-full sm:w-52">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Filtra per servizio</label>
              <select
                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white"
                value={filterCategoria}
                onChange={e => setFilterCategoria(e.target.value)}
              >
                <option value="">Tutti i servizi</option>
                {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {(searchEnte || filterCategoria) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchEnte(""); setFilterCategoria(""); }} className="text-gray-500 shrink-0">
                <X size={14} className="mr-1" />Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showForm && renderForm()}

      {loadingEnti ? (
        <Card><CardContent className="py-8 text-center text-gray-400">Caricamento enti...</CardContent></Card>
      ) : entiComune.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-400">Nessun ente trovato per questo comune</CardContent></Card>
      ) : (
        entiComune.map((ente: any) => (
          <div key={ente.id}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building size={16} className="text-green-600 flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900 truncate">{ente.nome_ente}</h3>
                      <Badge className={ente.attivo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                        {ente.attivo ? "Attivo" : "Inattivo"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(ente.servizi || []).map((s: any, i: number) => (
                        <Badge key={i} className={categoriaBadgeColor[s.categoria] || "bg-gray-100 text-gray-600"}>
                          {s.categoria}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {ente.indirizzo_sede && <span className="flex items-center gap-1"><MapPin size={10} />{ente.indirizzo_sede}</span>}
                      {ente.contatto && <span className="flex items-center gap-1"><Phone size={10} />{ente.contatto}</span>}
                      {ente.orario_giorno && <span>{ente.orario_giorno}</span>}
                      {ente.in_loco && ente.in_loco !== "Da verificare" && <span>In loco: {ente.in_loco}</span>}
                      {ente.target_utenza && <span>Target: {ente.target_utenza}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setDetailItem(detailItem?.id === ente.id ? null : ente); setShowForm(false); setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100); }} title="Dettaglio"><Eye size={14} /></Button>
                    {canEdit && <Button variant="ghost" size="icon" onClick={() => handleEdit(ente)} title="Modifica"><Edit size={14} /></Button>}
                    {canDelete && <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(ente.id)} title="Elimina"><Trash2 size={14} /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
            {detailItem?.id === ente.id && (
              <div ref={detailRef} className="mt-2">
                <Card className="border-blue-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2"><Eye size={18} className="text-blue-600" />Dettaglio Ente</CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => setDetailItem(null)}><X size={18} /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="sm:col-span-2 lg:col-span-3">
                        <span className="text-xs text-gray-500 block">Nome Ente</span>
                        <span className="font-semibold text-gray-900 text-base">{detailItem.nome_ente}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Comune</span>
                        <span className="text-gray-800">{detailItem.comune_erogatore || "\u2014"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Indirizzo Sede</span>
                        <span className="text-gray-800">{detailItem.indirizzo_sede || "\u2014"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Contatto</span>
                        <span className="text-gray-800">{detailItem.contatto || "\u2014"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Orario / Giorno</span>
                        <span className="text-gray-800">{detailItem.orario_giorno || "\u2014"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">In Loco?</span>
                        <Badge className={
                          detailItem.in_loco === "Si" ? "bg-green-100 text-green-800" :
                          detailItem.in_loco === "No" ? "bg-red-100 text-red-800" :
                          detailItem.in_loco === "Parz." ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-600"
                        }>{detailItem.in_loco}</Badge>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Target</span>
                        <span className="text-gray-800">{detailItem.target_utenza || "\u2014"}</span>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <span className="text-xs text-gray-500 block mb-1">Servizi erogati</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(detailItem.servizi || []).map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-1">
                              <Badge className={categoriaBadgeColor[s.categoria] || "bg-gray-100 text-gray-600"}>{s.categoria}</Badge>
                              {s.descrizione && <span className="text-xs text-gray-500">({s.descrizione})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                      {detailItem.note_accesso && (
                        <div className="sm:col-span-2 lg:col-span-3">
                          <span className="text-xs text-gray-500 block">Note Accesso</span>
                          <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 rounded p-2 mt-1">{detailItem.note_accesso}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ))
      )}

      {entiComune.filter(e => e.latitudine && e.longitudine).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin size={18} className="text-green-600" />Mappa Enti — {comuneSelezionato}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MappaServiziWelfare enti={entiComune.filter(e => e.latitudine && e.longitudine)} height="400px" />
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ===================== FORM ENTE + SERVIZI =====================
  function renderForm() {
    return (
      <Card className="border-green-200 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>{editId ? "Modifica Ente" : "Nuovo Ente Welfare"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={18} /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500">Nome Ente / Servizio *</label>
              <Input
                value={form.nome_ente}
                onChange={e => { setForm({ ...form, nome_ente: e.target.value }); setFormErrors(p => ({ ...p, nome_ente: "" })); }}
                placeholder="es. ASL FG, Croce Rossa, Caritas..."
                className={formErrors.nome_ente ? "border-red-400 focus:ring-red-500" : ""}
              />
              {formErrors.nome_ente && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.nome_ente}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Comune Erogatore *</label>
              <ComuneAutocomplete
                value={form.comune_erogatore}
                onChange={val => { setForm(f => ({ ...f, comune_erogatore: val })); setFormErrors(p => ({ ...p, comune_erogatore: "" })); }}
                placeholder="Cerca comune..."
                className={formErrors.comune_erogatore ? "[&_input]:border-red-400" : ""}
              />
              {formErrors.comune_erogatore && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.comune_erogatore}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500">Indirizzo Sede</label>
              <Input value={form.indirizzo_sede} onChange={e => setForm({ ...form, indirizzo_sede: e.target.value })} placeholder="Via Roma 1 (per geolocalizzazione)" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Contatto</label>
              <Input value={form.contatto} onChange={e => setForm({ ...form, contatto: e.target.value })} placeholder="Telefono, email..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Orario / Giorno</label>
              <Input value={form.orario_giorno} onChange={e => setForm({ ...form, orario_giorno: e.target.value })} placeholder="es. Lun-Ven 9-12" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">In Loco?</label>
              <select className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white" value={form.in_loco} onChange={e => setForm({ ...form, in_loco: e.target.value })}>
                {IN_LOCO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Target Utenza</label>
              <select className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white" value={form.target_utenza} onChange={e => setForm({ ...form, target_utenza: e.target.value })}>
                <option value="">-- Seleziona --</option>
                {TARGET_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.attivo as boolean} onChange={e => setForm({ ...form, attivo: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                <span className="text-sm">Ente attivo</span>
              </label>
            </div>
          </div>

          {/* Servizi offerti */}
          <div className="mt-5 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Servizi offerti *</label>
              <Button type="button" variant="outline" size="sm" onClick={addServizio}>
                <Plus size={14} className="mr-1" />Aggiungi servizio
              </Button>
            </div>
            {formErrors.servizi && <p className="text-[11px] text-red-500 mb-2">{formErrors.servizi}</p>}
            {form.servizi.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">Nessun servizio aggiunto. Clicca &quot;Aggiungi servizio&quot;.</p>
            )}
            <div className="space-y-2">
              {form.servizi.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white"
                      value={s.categoria}
                      onChange={e => { updateServizio(idx, "categoria", e.target.value); setFormErrors(p => ({ ...p, servizi: "" })); }}
                    >
                      <option value="">-- Categoria servizio --</option>
                      {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <Input
                      value={s.descrizione}
                      onChange={e => updateServizio(idx, "descrizione", e.target.value)}
                      placeholder="Descrizione (opzionale)"
                      className="text-sm"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeServizio(idx)} className="text-red-400 hover:text-red-600 shrink-0 mt-0.5">
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 mt-4">
            <label className="text-xs font-medium text-gray-500">Note Accesso</label>
            <textarea className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm min-h-[60px]" value={form.note_accesso} onChange={e => setForm({ ...form, note_accesso: e.target.value })} placeholder="Come accedere al servizio, modalità di iscrizione..." />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} className="mr-2" />{saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
}
