"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { consultazioniWelfareApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, FileDown, Trash2 } from "lucide-react";
import type { Consultazione } from "@/types/consultazione";

const RUOLI_AMMESSI = ["superadmin", "admin", "tutor", "counselor"];

export default function DettaglioConsultazionePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = parseInt(String(params?.id || "0"), 10);
  const { user } = useAuth();

  const [c, setC] = useState<Consultazione | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = user && RUOLI_AMMESSI.includes(user.ruolo);
  const isAdmin = user && ["superadmin", "admin"].includes(user.ruolo);
  const canDelete = user && ["superadmin", "admin", "tutor"].includes(user.ruolo);

  useEffect(() => {
    if (user && !canAccess) router.replace("/dashboard");
  }, [user, canAccess, router]);

  useEffect(() => {
    if (!id || !canAccess) return;
    setLoading(true);
    consultazioniWelfareApi
      .get(id)
      .then((res) => setC(res.data))
      .catch((e) => setError(e?.response?.data?.error || "Errore caricamento"))
      .finally(() => setLoading(false));
  }, [id, canAccess]);

  const onPdf = async () => {
    if (!c) return;
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
  };

  const onDelete = async () => {
    if (!c) return;
    if (!confirm("Eliminare questa consultazione?")) return;
    await consultazioniWelfareApi.delete(c.id);
    router.push("/servizi-welfare/consultazioni");
  };

  if (!canAccess) return null;
  if (loading) return <div className="text-gray-500">Caricamento...</div>;
  if (error) return <div className="text-red-700">{error}</div>;
  if (!c) return null;

  const canEdit = c.status === "bozza" || isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Consulto #{c.id}{" "}
          <span
            className={`ml-2 text-xs px-2 py-1 rounded-full ${
              c.status === "finalizzata"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {c.status}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/servizi-welfare/consultazioni">
            <Button variant="outline" size="sm">
              <ArrowLeft size={14} className="mr-1" /> Elenco
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={onPdf}>
            <FileDown size={14} className="mr-1" /> PDF
          </Button>
          {canEdit && (
            <Link href={`/servizi-welfare/consultazioni/${c.id}/modifica`}>
              <Button size="sm">
                <Pencil size={14} className="mr-1" /> Modifica
              </Button>
            </Link>
          )}
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 size={14} className="mr-1" /> Elimina
            </Button>
          )}
        </div>
      </div>

      <section className="bg-white border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-green-700 mb-2">Beneficiario</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Nome</div>
            <div className="font-medium">{c.nome}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Cognome</div>
            <div className="font-medium">{c.cognome}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Codice fiscale</div>
            <div className="font-medium">{c.codice_fiscale || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Data consulto</div>
            <div className="font-medium">
              {c.data_consulto
                ? new Date(c.data_consulto).toLocaleDateString("it-IT")
                : "-"}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-green-700 mb-2">Operatore</h2>
        <div className="text-sm">
          {[c.operatore_nome, c.operatore_cognome].filter(Boolean).join(" ") || "-"}
          {c.operatore_email && (
            <span className="text-gray-500 ml-2">({c.operatore_email})</span>
          )}
        </div>
      </section>

      <section className="bg-white border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-green-700 mb-2">
          Informazioni Welfare ({c.items?.length || 0})
        </h2>
        {!c.items || c.items.length === 0 ? (
          <p className="text-sm text-gray-500">Nessuna voce.</p>
        ) : (
          <div className="space-y-3">
            {c.items.map((it, idx) => (
              <div key={idx} className="border rounded-md p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    {idx + 1}. {it.titolo || "(senza titolo)"}
                  </div>
                  {it.categoria && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      {it.categoria}
                    </span>
                  )}
                </div>
                {it.contenuto && (
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">
                    {it.contenuto}
                  </p>
                )}
                {it.fonte && (
                  <p className="text-xs text-gray-500 mt-1">Fonte: {it.fonte}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-green-700 mb-2">Note</h2>
        <p className="text-sm whitespace-pre-line">{c.note || "—"}</p>
      </section>

      <p className="text-xs text-gray-400">
        Creata il {new Date(c.created_at).toLocaleString("it-IT")} · ultima modifica{" "}
        {new Date(c.updated_at).toLocaleString("it-IT")}
      </p>
    </div>
  );
}
