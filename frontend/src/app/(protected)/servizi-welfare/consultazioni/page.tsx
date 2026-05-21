"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { consultazioniWelfareApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Pencil, Trash2, FileDown, Search, ClipboardList } from "lucide-react";
import type { Consultazione } from "@/types/consultazione";

const RUOLI_AMMESSI = ["superadmin", "admin", "tutor", "counselor"];

export default function ConsultazioniListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<Consultazione[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  const [filtri, setFiltri] = useState({
    search: "",
    data_da: "",
    data_a: "",
    status: "",
  });

  const canAccess = user && RUOLI_AMMESSI.includes(user.ruolo);
  const canDelete = user && ["superadmin", "admin", "tutor"].includes(user.ruolo);
  const isAdmin = user && ["superadmin", "admin"].includes(user.ruolo);

  useEffect(() => {
    if (user && !canAccess) router.replace("/dashboard");
  }, [user, canAccess, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      Object.entries(filtri).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const res = await consultazioniWelfareApi.list(params);
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (_) {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filtri]);

  useEffect(() => {
    if (canAccess) load();
  }, [load, canAccess]);

  const onDelete = async (id: number) => {
    if (!confirm("Eliminare questa consultazione?")) return;
    try {
      await consultazioniWelfareApi.delete(id);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Errore eliminazione");
    }
  };

  const onDownloadPdf = async (c: Consultazione) => {
    try {
      const res = await consultazioniWelfareApi.pdf(c.id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = c.data_consulto
        ? new Date(c.data_consulto).toISOString().slice(0, 10)
        : "na";
      a.href = url;
      a.download = `consulto_${c.id}_${d}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Errore download PDF");
    }
  };

  if (!canAccess) return null;

  const totPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={22} className="text-green-700" />
            Registro Consultazioni Welfare
          </h1>
          <p className="text-sm text-gray-500">
            Elenco dei consulti welfare effettuati con i beneficiari.
          </p>
        </div>
        <Link href="/servizi-welfare/consultazioni/nuova">
          <Button>
            <Plus size={16} className="mr-1" /> Nuova consultazione
          </Button>
        </Link>
      </div>

      {/* Filtri */}
      <div className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600">Cerca per nome/cognome/CF</label>
          <div className="flex items-center gap-2 border rounded-md px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              value={filtri.search}
              onChange={(e) => {
                setPage(1);
                setFiltri((p) => ({ ...p, search: e.target.value }));
              }}
              className="flex-1 outline-none text-sm"
              placeholder="Es. Rossi Mario"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-600">Da</label>
          <input
            type="date"
            value={filtri.data_da}
            onChange={(e) => {
              setPage(1);
              setFiltri((p) => ({ ...p, data_da: e.target.value }));
            }}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">A</label>
          <input
            type="date"
            value={filtri.data_a}
            onChange={(e) => {
              setPage(1);
              setFiltri((p) => ({ ...p, data_a: e.target.value }));
            }}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-4">
          <label className="text-xs text-gray-600 mr-2">Status:</label>
          {(["", "bozza", "finalizzata"] as const).map((s) => (
            <button
              key={s || "all"}
              onClick={() => {
                setPage(1);
                setFiltri((p) => ({ ...p, status: s }));
              }}
              className={`text-xs px-3 py-1 rounded-full mr-2 border ${
                filtri.status === s
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {s === "" ? "Tutti" : s === "bozza" ? "Bozza" : "Finalizzata"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabella */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Data</th>
              <th className="text-left px-4 py-2">Beneficiario</th>
              <th className="text-left px-4 py-2">CF</th>
              <th className="text-left px-4 py-2">Operatore</th>
              <th className="text-left px-4 py-2">Voci</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Caricamento...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Nessuna consultazione trovata.
                </td>
              </tr>
            ) : (
              data.map((c) => {
                const canEdit = c.status === "bozza" || isAdmin;
                return (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {c.data_consulto
                        ? new Date(c.data_consulto).toLocaleDateString("it-IT")
                        : "-"}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {c.cognome} {c.nome}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{c.codice_fiscale || "-"}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {[c.operatore_nome, c.operatore_cognome].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td className="px-4 py-2">{Array.isArray(c.items) ? c.items.length : 0}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          c.status === "finalizzata"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link href={`/servizi-welfare/consultazioni/${c.id}`}>
                          <Button variant="ghost" size="sm" title="Visualizza">
                            <Eye size={14} />
                          </Button>
                        </Link>
                        {canEdit && (
                          <Link href={`/servizi-welfare/consultazioni/${c.id}/modifica`}>
                            <Button variant="ghost" size="sm" title="Modifica">
                              <Pencil size={14} />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Scarica PDF"
                          onClick={() => onDownloadPdf(c)}
                        >
                          <FileDown size={14} />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Elimina"
                            onClick={() => onDelete(c.id)}
                          >
                            <Trash2 size={14} className="text-red-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginazione */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Totale: <strong>{total}</strong>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Precedente
          </Button>
          <span>
            {page} / {totPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totPages, p + 1))}
            disabled={page >= totPages}
          >
            Successiva
          </Button>
        </div>
      </div>
    </div>
  );
}
