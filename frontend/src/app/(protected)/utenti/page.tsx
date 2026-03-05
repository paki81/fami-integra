"use client";

import { useEffect, useState } from "react";
import { utentiApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, X, Save, Shield } from "lucide-react";

const RUOLI = ["superadmin", "admin", "tutor", "counselor", "viewer"];

export default function UtentiPage() {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: "", cognome: "", email: "", password: "", ruolo: "viewer", attivo: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try { const res = await utentiApi.list(); setData(res.data); } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleNew = () => {
    setEditId(null);
    setForm({ nome: "", cognome: "", email: "", password: "", ruolo: "viewer", attivo: true });
    setShowForm(true); setError("");
  };

  const handleEdit = (u: any) => {
    setEditId(u.id);
    setForm({ nome: u.nome, cognome: u.cognome, email: u.email, password: "", ruolo: u.ruolo, attivo: !!u.attivo });
    setShowForm(true); setError("");
  };

  const handleSave = async () => {
    setError("");
    if (!form.nome || !form.cognome || !form.email) { setError("Nome, cognome e email obbligatori"); return; }
    if (!editId && !form.password) { setError("Password obbligatoria per nuovi utenti"); return; }
    if (!editId && form.password.length < 8) { setError("Password minimo 8 caratteri"); return; }
    setSaving(true);
    try {
      const payload: any = { nome: form.nome, cognome: form.cognome, email: form.email, ruolo: form.ruolo, attivo: form.attivo };
      if (form.password) payload.password = form.password;
      if (editId) { await utentiApi.update(editId, payload); }
      else { await utentiApi.create(payload); }
      setShowForm(false); fetchData();
    } catch (err: any) { setError(err.response?.data?.error || "Errore nel salvataggio"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) { alert("Non puoi eliminare te stesso"); return; }
    if (!confirm("Eliminare questo utente?")) return;
    try { await utentiApi.delete(id); fetchData(); } catch (err) { console.error(err); }
  };

  const ruoloColor = (r: string) => {
    switch (r) {
      case "superadmin": return "bg-red-100 text-red-800";
      case "admin": return "bg-orange-100 text-orange-800";
      case "tutor": return "bg-blue-100 text-blue-800";
      case "counselor": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>
          <p className="text-sm text-gray-500">{data.length} utenti registrati</p>
        </div>
        <Button onClick={handleNew}><Plus size={16} className="mr-2" />Nuovo Utente</Button>
      </div>

      {showForm && (
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{editId ? "Modifica Utente" : "Nuovo Utente"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X size={18} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs font-medium text-gray-500">Nome *</label>
                <Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Cognome *</label>
                <Input value={form.cognome} onChange={e => setForm({...form, cognome: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Email *</label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-500">Password {editId ? "(lascia vuoto per non cambiare)" : "*"}</label>
                <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editId ? "••••••••" : "Min. 8 caratteri"} /></div>
              <div><label className="text-xs font-medium text-gray-500">Ruolo</label>
                <select className="h-10 w-full px-3 rounded-md border border-gray-300 text-sm bg-white"
                  value={form.ruolo} onChange={e => setForm({...form, ruolo: e.target.value})}>
                  {RUOLI.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.attivo} onChange={e => setForm({...form, attivo: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm">Attivo</span>
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Ruolo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Stato</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Ultimo accesso</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Caricamento...</td></tr>
                ) : data.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{u.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.nome} {u.cognome}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3"><Badge className={ruoloColor(u.ruolo)}>{u.ruolo}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge className={u.attivo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {u.attivo ? "Attivo" : "Disattivato"}</Badge></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.ultimo_accesso ? new Date(u.ultimo_accesso).toLocaleString("it-IT") : "Mai"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}><Edit size={14} /></Button>
                        {u.id !== currentUser?.id && (
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(u.id)}><Trash2 size={14} /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
