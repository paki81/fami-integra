"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { consultazioniWelfareApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ConsultazioneForm from "../../ConsultazioneForm";
import type { Consultazione } from "@/types/consultazione";

const RUOLI_AMMESSI = ["superadmin", "admin", "tutor", "counselor"];

export default function ModificaConsultazionePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = parseInt(String(params?.id || "0"), 10);
  const { user } = useAuth();

  const [c, setC] = useState<Consultazione | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = user && RUOLI_AMMESSI.includes(user.ruolo);
  const isAdmin = user && ["superadmin", "admin"].includes(user.ruolo);

  useEffect(() => {
    if (user && !canAccess) router.replace("/dashboard");
  }, [user, canAccess, router]);

  useEffect(() => {
    if (!id || !canAccess) return;
    setLoading(true);
    consultazioniWelfareApi
      .get(id)
      .then((res) => {
        setC(res.data);
        if (res.data.status === "finalizzata" && !isAdmin) {
          router.replace(`/servizi-welfare/consultazioni/${id}`);
        }
      })
      .catch((e) => setError(e?.response?.data?.error || "Errore caricamento"))
      .finally(() => setLoading(false));
  }, [id, canAccess, isAdmin, router]);

  if (!canAccess) return null;
  if (loading) return <div className="text-gray-500">Caricamento...</div>;
  if (error) return <div className="text-red-700">{error}</div>;
  if (!c) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Modifica consultazione #{c.id}
        </h1>
        <Link href={`/servizi-welfare/consultazioni/${c.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-1" /> Annulla
          </Button>
        </Link>
      </div>
      <ConsultazioneForm mode="edit" initial={c} />
    </div>
  );
}
