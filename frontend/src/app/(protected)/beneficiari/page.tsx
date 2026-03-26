"use client";

import { useEffect, useState, useCallback } from "react";
import { beneficiariApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getStatoColor } from "@/lib/utils";
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, X, Save } from "lucide-react";
import ComuneAutocomplete from "@/components/ComuneAutocomplete";
import RegistroNote from "@/components/RegistroNote";
import { toast } from "sonner";

const STATI = ["In Corso", "Abbinato Alloggio", "Abbinato Lavoro", "Abbinato Entrambi", "Completato", "Annullato"];
const NUCLEI = ["S", "N", "NUCLEO", "SINGOLO"];

const emptyBen = {
  cognome: "", nome: "", tipo_permesso: "", progetto_provenienza: "", nucleo_singolo: "S", n_componenti_nucleo: 1,
  area_intervento: "", comune: "", tipo_progetto: "", budget_alloggio: "", note: "", data_uscita_sai: "", stato: "In Corso",
  competenze: "", nazionalita: "", livello_italiano: "", telefono: "", email: ""
};

export default function BeneficiariPage() {
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
  const [form, setForm] = useState({ ...emptyBen });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, sort: "id", order: "DESC" };
      if (search) params.search = search;
      if (filtroComune) params.comune = filtroComune;
      if (filtroStato) params.stato = filtroStato;
      const res = await beneficiariApi.list(params);
      setData(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [page, search, filtroComune, filtroStato]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { beneficiariApi.comuni().then(r => setComuni(r.data)).catch(() => {}); }, []);

  const handleEdit = (ben: any) => {
    setEditId(ben.id);
    setForm({
      cognome: ben.cognome || "", nome: ben.nome || "", tipo_permesso: ben.tipo_permesso || "",
      progetto_provenienza: ben.progetto_provenienza || "",
      nucleo_singolo: ben.nucleo_singolo || "S", n_componenti_nucleo: ben.n_componenti_nucleo || 1,
      area_intervento: ben.area_intervento || "", comune: ben.comune || "",
      tipo_progetto: ben.tipo_progetto || "",
      budget_alloggio: ben.budget_alloggio || "", note: ben.note || "",
      data_uscita_sai: ben.data_uscita_sai ? ben.data_uscita_sai.split("T")[0] : "",
      stato: ben.stato || "In Corso", competenze: ben.competenze || "", nazionalita: ben.nazionalita || "",
      livello_italiano: ben.livello_italiano || "", telefono: ben.telefono || "", email: ben.email || ""
    });
    setShowForm(true);
  };

  const handleNew = () => { setEditId(null); setForm({ ...emptyBen }); setShowForm(true); };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!form.cognome.trim()) errors.cognome = "Il cognome è obbligatorio";
    if (!form.nome.trim()) errors.nome = "Il nome è obbligatorio";
    if (!form.area_intervento) errors.area_intervento = "Seleziona un'area di intervento";
    if (!form.comune.trim()) errors.comune = "Il comune è obbligatorio";
    if (form.n_componenti_nucleo < 1) errors.n_componenti_nucleo = "Min. 1 componente";
    if (!form.budget_alloggio && String(form.budget_alloggio) !== "0") errors.budget_alloggio = "Il budget alloggio è obbligatorio";
    if (!form.nazionalita.trim()) errors.nazionalita = "La nazionalità è obbligatoria";
    if (!form.livello_italiano.trim()) errors.livello_italiano = "Il livello di italiano è obbligatorio";
    if (!form.telefono.trim()) errors.telefono = "Il telefono è obbligatorio";
    if (!form.email.trim()) errors.email = "L'email è obbligatoria";
    if (!form.competenze.trim()) errors.competenze = "Le competenze sono obbligatorie";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) { toast.error("Compila tutti i campi obbligatori"); return; }
    setSaving(true);
    try {
      if (editId) {
        await beneficiariApi.update(editId, form);
        toast.success("Beneficiario aggiornato con successo");
      } else {
        await beneficiariApi.create(form);
        toast.success("Nuovo beneficiario creato con successo");
      }
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg?.includes("Incorrect")) toast.error("Controlla che le date e i numeri siano corretti");
      else if (msg?.includes("DUP")) toast.error("Esiste già un beneficiario con questi dati");
      else toast.error(msg || "Si è verificato un errore durante il salvataggio");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    toast("Vuoi eliminare questo beneficiario?", {
      action: { label: "Elimina", onClick: async () => {
        try {
          await beneficiariApi.delete(id);
          toast.success("Beneficiario eliminato");
          fetchData();
        } catch { toast.error("Impossibile eliminare il beneficiario. Potrebbe essere collegato ad altri dati."); }
      }},
      cancel: { label: "Annulla", onClick: () => {} },
      duration: 8000,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beneficiari</h1>
          <p className="text-sm text-gray-500">{total} registrati</p>
        </div>
        {canEdit && (
          <Button onClick={handleNew}><Plus size={16} className="mr-2" />Nuovo Beneficiario</Button>
        )}
      </div>

      {/* Filtri */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <Input placeholder="Cerca per cognome, nome, note..." className="pl-9"
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

      {/* Form Modale */}
      {showForm && (
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{editId ? "Modifica Beneficiario" : "Nuovo Beneficiario"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={18} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs font-medium text-gray-500">Cognome *</label>
                <Input value={form.cognome} onChange={e => { setForm({...form, cognome: e.target.value}); setFormErrors(p => ({...p, cognome: ""})); }} className={formErrors.cognome ? "border-red-400 focus:ring-red-500" : ""} />
                {formErrors.cognome && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.cognome}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Nome *</label>
                <Input value={form.nome} onChange={e => { setForm({...form, nome: e.target.value}); setFormErrors(p => ({...p, nome: ""})); }} className={formErrors.nome ? "border-red-400 focus:ring-red-500" : ""} />
                {formErrors.nome && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.nome}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Tipo Permesso</label>
                <Input value={form.tipo_permesso} onChange={e => setForm({...form, tipo_permesso: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Progetto Provenienza</label>
                <Input value={form.progetto_provenienza} onChange={e => setForm({...form, progetto_provenienza: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Nucleo/Singolo</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.nucleo_singolo} onChange={e => setForm({...form, nucleo_singolo: e.target.value})}>
                  {NUCLEI.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-500">N° Componenti</label>
                <Input type="number" min={1} value={form.n_componenti_nucleo}
                  onChange={e => setForm({...form, n_componenti_nucleo: parseInt(e.target.value) || 1})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Area Intervento *</label>
                <select className={`h-10 w-full px-3 rounded-md border text-sm bg-white ${formErrors.area_intervento ? "border-red-400" : "border-gray-300"}`}
                  value={form.area_intervento} onChange={e => { setForm({...form, area_intervento: e.target.value}); setFormErrors(p => ({...p, area_intervento: ""})); }}>
                  <option value="">- Seleziona -</option><option value="LAVORATIVO">LAVORATIVO</option>
                  <option value="ALLOGGIO">ALLOGGIO</option><option value="LAVORATIVO-ALLOGGIO">LAVORATIVO-ALLOGGIO</option>
                </select>
                {formErrors.area_intervento && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.area_intervento}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Comune *</label>
                <ComuneAutocomplete value={form.comune} onChange={v => { setForm({...form, comune: v}); setFormErrors(p => ({...p, comune: ""})); }} />
                {formErrors.comune && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.comune}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Tipo Progetto</label>
                <Input value={form.tipo_progetto} onChange={e => setForm({...form, tipo_progetto: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Budget Alloggio (€/mese) *</label>
                <Input type="number" min={0} step={50} value={form.budget_alloggio}
                  onChange={e => { setForm({...form, budget_alloggio: e.target.value}); setFormErrors(p => ({...p, budget_alloggio: ""})); }} placeholder="es. 400" className={formErrors.budget_alloggio ? "border-red-400 focus:ring-red-500" : ""} />
                {formErrors.budget_alloggio && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.budget_alloggio}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Data Uscita SAI</label>
                <Input type="date" value={form.data_uscita_sai} onChange={e => setForm({...form, data_uscita_sai: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Stato</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.stato} onChange={e => setForm({...form, stato: e.target.value})}>
                  {STATI.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-500">Nazionalità *</label>
                <Input value={form.nazionalita} onChange={e => { setForm({...form, nazionalita: e.target.value}); setFormErrors(p => ({...p, nazionalita: ""})); }} className={formErrors.nazionalita ? "border-red-400 focus:ring-red-500" : ""} />
                {formErrors.nazionalita && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.nazionalita}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Livello Italiano *</label>
                <Input value={form.livello_italiano} onChange={e => { setForm({...form, livello_italiano: e.target.value}); setFormErrors(p => ({...p, livello_italiano: ""})); }} placeholder="es. A1, A2, B1..." className={formErrors.livello_italiano ? "border-red-400 focus:ring-red-500" : ""} />
                {formErrors.livello_italiano && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.livello_italiano}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Telefono *</label>
                <Input value={form.telefono} onChange={e => { setForm({...form, telefono: e.target.value}); setFormErrors(p => ({...p, telefono: ""})); }} className={formErrors.telefono ? "border-red-400 focus:ring-red-500" : ""} />
                {formErrors.telefono && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.telefono}</p>}</div>
              <div><label className="text-xs font-medium text-gray-500">Email *</label>
                <Input type="email" value={form.email} onChange={e => { setForm({...form, email: e.target.value}); setFormErrors(p => ({...p, email: ""})); }} className={formErrors.email ? "border-red-400 focus:ring-red-500" : ""} />
                {formErrors.email && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.email}</p>}</div>
              <div className="sm:col-span-2"><label className="text-xs font-medium text-gray-500">Competenze *</label>
                <Input value={form.competenze} onChange={e => { setForm({...form, competenze: e.target.value}); setFormErrors(p => ({...p, competenze: ""})); }} placeholder="es. Ristorazione, cucina, edilizia..." className={formErrors.competenze ? "border-red-400 focus:ring-red-500" : ""} />
                {formErrors.competenze && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.competenze}</p>}</div>
              <div className="sm:col-span-2 lg:col-span-3"><label className="text-xs font-medium text-gray-500">Note</label>
                <textarea className="w-full h-20 px-3 py-2 rounded-md border border-gray-300 text-sm resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></div>
              {editId && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <RegistroNote entita="beneficiari" entitaId={editId} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save size={16} className="mr-2" />{saving ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabella */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Cognome Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Permesso</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Nucleo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Area</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Comune</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Uscita SAI</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Stato</th>
                  {canEdit && <th className="px-4 py-3 text-right font-medium text-gray-500">Azioni</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Caricamento...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nessun beneficiario trovato</td></tr>
                ) : data.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{b.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{b.cognome} {b.nome}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{b.tipo_permesso || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{b.nucleo_singolo} ({b.n_componenti_nucleo})</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{b.area_intervento || "-"}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{b.comune || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(b.data_uscita_sai)}</td>
                    <td className="px-4 py-3"><Badge className={getStatoColor(b.stato)}>{b.stato}</Badge></td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(b)}>
                            <Edit size={14} /></Button>
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700"
                              onClick={() => handleDelete(b.id)}><Trash2 size={14} /></Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginazione */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">Pagina {page} di {pages} ({total} risultati)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} /></Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
