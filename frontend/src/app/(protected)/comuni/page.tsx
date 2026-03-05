"use client";

import { useEffect, useState, useCallback } from "react";
import { comuniProgettoApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, X, Save, MapPin, Phone, Mail, User } from "lucide-react";
import ComuneAutocomplete from "@/components/ComuneAutocomplete";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const MappaComuniProgetto = dynamic(() => import("@/components/MappaComuniProgetto"), { ssr: false });

const emptyForm = {
  nome: "", provincia: "", sigla: "", tipologia_progetto: "", ruolo_comune: "Altro",
  indirizzo_sede: "", telefono_sede: "", email_sede: "", responsabile: "", note: "", attivo: true,
};

export default function ComuniPage() {
  const { user } = useAuth();
  const canEdit = ["superadmin", "admin"].includes(user?.ruolo || "");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await comuniProgettoApi.list();
      setData(res.data);
    } catch { toast.error("Errore nel caricamento dei comuni"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleNew = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const handleEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      nome: c.nome || "", provincia: c.provincia || "", sigla: c.sigla || "",
      tipologia_progetto: c.tipologia_progetto || "", ruolo_comune: c.ruolo_comune || "Altro",
      indirizzo_sede: c.indirizzo_sede || "", telefono_sede: c.telefono_sede || "",
      email_sede: c.email_sede || "", responsabile: c.responsabile || "",
      note: c.note || "", attivo: !!c.attivo,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Inserisci il nome del comune"); return; }
    setSaving(true);
    try {
      if (editId) {
        await comuniProgettoApi.update(editId, form);
        toast.success("Comune aggiornato con successo");
      } else {
        await comuniProgettoApi.create(form);
        toast.success("Comune aggiunto al progetto");
      }
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg?.includes("DUP") || msg?.includes("già")) toast.error("Questo comune è già presente nel progetto");
      else toast.error(msg || "Si è verificato un errore durante il salvataggio");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    toast("Vuoi rimuovere questo comune dal progetto?", {
      action: { label: "Rimuovi", onClick: async () => {
        try {
          await comuniProgettoApi.delete(id);
          toast.success("Comune rimosso dal progetto");
          fetchData();
        } catch { toast.error("Impossibile rimuovere il comune"); }
      }},
      cancel: { label: "Annulla", onClick: () => {} },
      duration: 8000,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comuni del Progetto</h1>
          <p className="text-sm text-gray-500">{data.filter(c => c.attivo).length} comuni attivi su {data.length} totali</p>
        </div>
        {canEdit && (
          <Button onClick={handleNew}><Plus size={16} className="mr-2" />Aggiungi Comune</Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{editId ? "Modifica Comune" : "Nuovo Comune del Progetto"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={18} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-medium text-gray-500">Comune *</label>
                <ComuneAutocomplete
                  value={form.nome}
                  onChange={(nome) => setForm(f => ({ ...f, nome }))}
                  onSelectFull={(nome, provincia, sigla) => setForm(f => ({ ...f, nome, provincia, sigla }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Provincia</label>
                <Input value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Sigla</label>
                <Input value={form.sigla} onChange={e => setForm({ ...form, sigla: e.target.value })} maxLength={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Tipologia Progetto</label>
                <Input value={form.tipologia_progetto} onChange={e => setForm({ ...form, tipologia_progetto: e.target.value })} placeholder="es. SAI, CAS, FAMI..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Ruolo Comune</label>
                <select className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white" value={form.ruolo_comune} onChange={e => setForm({ ...form, ruolo_comune: e.target.value })}>
                  <option value="Capofila">Capofila</option>
                  <option value="Partner">Partner</option>
                  <option value="Associato">Associato</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500">Indirizzo Sede Operativa</label>
                <Input value={form.indirizzo_sede} onChange={e => setForm({ ...form, indirizzo_sede: e.target.value })} placeholder="Via Roma 1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Responsabile</label>
                <Input value={form.responsabile} onChange={e => setForm({ ...form, responsabile: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Telefono Sede</label>
                <Input value={form.telefono_sede} onChange={e => setForm({ ...form, telefono_sede: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Email Sede</label>
                <Input type="email" value={form.email_sede} onChange={e => setForm({ ...form, email_sede: e.target.value })} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-gray-500">Note</label>
                <textarea className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm min-h-[60px]"
                  value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.attivo as boolean} onChange={e => setForm({ ...form, attivo: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm">Attivo nel progetto</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annulla</Button>
              <Button onClick={handleSave} disabled={saving}><Save size={16} className="mr-2" />{saving ? "Salvataggio..." : "Salva"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista comuni */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Comune</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Provincia</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Tipologia</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Ruolo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Sede Operativa</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Responsabile</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Contatti</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Stato</th>
                  {canEdit && <th className="px-4 py-3 text-right font-medium text-gray-500">Azioni</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={canEdit ? 9 : 8} className="px-4 py-8 text-center text-gray-400">Caricamento...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={canEdit ? 9 : 8} className="px-4 py-8 text-center text-gray-400">Nessun comune nel progetto</td></tr>
                ) : data.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{c.provincia} {c.sigla ? `(${c.sigla})` : ""}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.tipologia_progetto || "\u2014"}</td>
                    <td className="px-4 py-3">
                      <Badge className={c.ruolo_comune === 'Capofila' ? 'bg-amber-100 text-amber-800' : c.ruolo_comune === 'Partner' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}>
                        {c.ruolo_comune || 'Altro'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.indirizzo_sede || "\u2014"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.responsabile && <span className="flex items-center gap-1"><User size={12} />{c.responsabile}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs space-y-0.5">
                      {c.telefono_sede && <span className="flex items-center gap-1"><Phone size={10} />{c.telefono_sede}</span>}
                      {c.email_sede && <span className="flex items-center gap-1"><Mail size={10} />{c.email_sede}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={c.attivo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                        {c.attivo ? "Attivo" : "Inattivo"}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Edit size={14} /></Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mappa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin size={18} className="text-green-600" />Mappa Sedi e Confini Comunali
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[500px] flex items-center justify-center text-gray-400">Caricamento mappa...</div>
          ) : data.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
              <MapPin size={40} className="mb-2 opacity-30" />
              <p className="text-sm">Nessun comune nel progetto</p>
              <p className="text-xs mt-1">Aggiungi comuni per visualizzare la mappa</p>
            </div>
          ) : (
            <MappaComuniProgetto comuni={data} height="500px" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
