"use client";

import React, { useEffect, useState } from "react";
import { registroNoteApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Plus, Pencil, Trash2, X, Check, Clock, User } from "lucide-react";
import { toast } from "sonner";

interface Nota {
  id: number;
  entita: string;
  entita_id: number;
  testo: string;
  creato_da: number;
  autore_nome: string;
  autore_cognome: string;
  creato_il: string;
  aggiornato_il: string;
}

interface RegistroNoteProps {
  entita: "beneficiari" | "alloggi" | "aziende";
  entitaId: number;
}

export default function RegistroNote({ entita, entitaId }: RegistroNoteProps) {
  const { user } = useAuth();
  const [note, setNote] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuovaNota, setNuovaNota] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.ruolo === "superadmin" || user?.ruolo === "admin";

  useEffect(() => {
    loadNote();
  }, [entita, entitaId]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const res = await registroNoteApi.list(entita, entitaId);
      setNote(res.data);
    } catch {
      console.error("Errore caricamento note");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!nuovaNota.trim()) return;
    setSaving(true);
    try {
      const res = await registroNoteApi.create(entita, entitaId, nuovaNota);
      setNote([res.data, ...note]);
      setNuovaNota("");
      setAdding(false);
      toast.success("Nota aggiunta");
    } catch {
      toast.error("Errore nell'aggiunta della nota");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const res = await registroNoteApi.update(id, editText);
      setNote(note.map(n => n.id === id ? res.data : n));
      setEditingId(null);
      toast.success("Nota aggiornata");
    } catch {
      toast.error("Errore nell'aggiornamento della nota");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Eliminare questa nota?")) return;
    try {
      await registroNoteApi.delete(id);
      setNote(note.filter(n => n.id !== id));
      toast.success("Nota eliminata");
    } catch {
      toast.error("Errore nell'eliminazione della nota");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-800">Registro Note</h4>
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">{note.length}</span>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
          >
            <Plus size={14} />Aggiungi
          </button>
        )}
      </div>

      {/* Form nuova nota */}
      {adding && (
        <div className="mb-3 border border-blue-200 rounded-xl p-3 bg-blue-50/50">
          <textarea
            value={nuovaNota}
            onChange={e => setNuovaNota(e.target.value)}
            placeholder="Scrivi una nota..."
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => { setAdding(false); setNuovaNota(""); }} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              Annulla
            </button>
            <button onClick={handleAdd} disabled={saving || !nuovaNota.trim()} className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
              {saving ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </div>
      )}

      {/* Lista note - timeline */}
      {loading ? (
        <div className="py-4 text-center text-xs text-gray-400">Caricamento note...</div>
      ) : note.length === 0 ? (
        <div className="py-6 text-center">
          <MessageSquare size={20} className="mx-auto text-gray-300 mb-1" />
          <p className="text-xs text-gray-400">Nessuna nota registrata</p>
        </div>
      ) : (
        <div className="space-y-0 relative">
          {/* Linea timeline */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" />
          {note.map((n, i) => (
            <div key={n.id} className="relative flex gap-3 py-2 group">
              {/* Dot timeline */}
              <div className={`relative z-10 w-[7px] h-[7px] rounded-full mt-1.5 shrink-0 ml-[12px] ${i === 0 ? "bg-blue-500 ring-2 ring-blue-200" : "bg-gray-300"}`} />
              
              <div className="flex-1 min-w-0">
                {editingId === n.id ? (
                  /* Editing inline */
                  <div className="border border-blue-200 rounded-lg p-2 bg-blue-50/50">
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5 mt-1.5">
                      <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                        <X size={14} />
                      </button>
                      <button onClick={() => handleUpdate(n.id)} disabled={saving || !editText.trim()} className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 rounded">
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Visualizzazione nota */
                  <div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{n.testo}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                        <User size={10} />{n.autore_nome} {n.autore_cognome}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock size={10} />{formatDate(n.creato_il)}
                      </span>
                      {n.aggiornato_il && n.aggiornato_il !== n.creato_il && (
                        <span className="text-[10px] text-gray-300 italic">modificata</span>
                      )}
                      {/* Azioni inline - solo admin */}
                      {isAdmin && (
                        <span className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingId(n.id); setEditText(n.testo); }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                            title="Modifica"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(n.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
