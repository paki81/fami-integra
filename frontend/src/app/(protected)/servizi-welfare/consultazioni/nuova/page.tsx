"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConsultazioneForm from "../ConsultazioneForm";

const RUOLI_AMMESSI = ["superadmin", "admin", "tutor", "counselor"];

export default function NuovaConsultazionePage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && !RUOLI_AMMESSI.includes(user.ruolo)) router.replace("/dashboard");
  }, [user, router]);

  if (!user || !RUOLI_AMMESSI.includes(user.ruolo)) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nuova consultazione welfare</h1>
        <Link href="/servizi-welfare/consultazioni">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-1" /> Torna all&apos;elenco
          </Button>
        </Link>
      </div>
      <ConsultazioneForm mode="create" />
    </div>
  );
}
