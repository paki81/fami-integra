"use client";

import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, Building2, GitMerge, FileCheck, Calendar } from "lucide-react";
import { formatDate, getStatoColor } from "@/lib/utils";

interface Stats {
  beneficiari: { totale: number; in_corso: number; abbinati: number };
  alloggi: { totale: number; disponibili: number };
  aziende: { totale: number; disponibili: number };
  matching: { alloggi: number; lavoro: number; contratti_firmati: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [comuniData, setComuniData] = useState<any[]>([]);
  const [uscite, setUscite] = useState<any[]>([]);
  const [matchRecenti, setMatchRecenti] = useState<any>({ alloggi: [], lavoro: [] });

  useEffect(() => {
    dashboardApi.stats().then((r) => setStats(r.data)).catch(console.error);
    dashboardApi.beneficiariPerComune().then((r) => setComuniData(r.data)).catch(console.error);
    dashboardApi.usciteProssime().then((r) => setUscite(r.data)).catch(console.error);
    dashboardApi.matchingRecenti().then((r) => setMatchRecenti(r.data)).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  const statCards = [
    { label: "Beneficiari in uscita", value: stats.beneficiari.in_corso, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Alloggi disponibili", value: stats.alloggi.disponibili, icon: Home, color: "text-green-600", bg: "bg-green-50" },
    { label: "Aziende disponibili", value: stats.aziende.disponibili, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Abbinamenti alloggi", value: stats.matching.alloggi, icon: GitMerge, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Abbinamenti lavoro", value: stats.matching.lavoro, icon: GitMerge, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Contratti firmati", value: stats.matching.contratti_firmati, icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Panoramica Centro FAMI INTEGRA</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon size={20} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Prossime uscite SAI */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Prossime uscite SAI
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uscite.length === 0 ? (
              <p className="text-sm text-gray-400">Nessuna uscita programmata</p>
            ) : (
              <div className="space-y-3">
                {uscite.slice(0, 8).map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {b.cognome} {b.nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        {b.comune} · {b.n_componenti_nucleo} comp. · {b.area_intervento}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-medium text-gray-700">{formatDate(b.data_uscita_sai)}</p>
                      <Badge className={getStatoColor(b.stato)}>{b.stato}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Beneficiari per Comune */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={18} className="text-green-600" />
              Beneficiari per Comune
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comuniData.length === 0 ? (
              <p className="text-sm text-gray-400">Nessun dato</p>
            ) : (
              <div className="space-y-3">
                {comuniData.map((c: any) => (
                  <div key={c.comune} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{c.comune}</span>
                      <span className="text-gray-500">{c.totale} totali · {c.in_corso} in corso · {c.abbinati} abbinati</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div className="bg-green-500 h-full" style={{ width: `${(c.abbinati / c.totale) * 100}%` }} />
                        <div className="bg-blue-400 h-full" style={{ width: `${(c.in_corso / c.totale) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abbinamenti Recenti Alloggi */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Home size={18} className="text-orange-600" />
              Abbinamenti Alloggi Recenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matchRecenti.alloggi.length === 0 ? (
              <p className="text-sm text-gray-400">Nessun abbinamento alloggi</p>
            ) : (
              <div className="space-y-2">
                {matchRecenti.alloggi.map((m: any) => (
                  <div key={m.id} className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                    <span className="font-medium">{m.cognome} {m.nome}</span>
                    <span className="text-gray-500">{m.id_alloggio} · {m.comune} · {formatDate(m.data_match)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abbinamenti Recenti Lavoro */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 size={18} className="text-indigo-600" />
              Abbinamenti Lavoro Recenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matchRecenti.lavoro.length === 0 ? (
              <p className="text-sm text-gray-400">Nessun abbinamento lavoro</p>
            ) : (
              <div className="space-y-2">
                {matchRecenti.lavoro.map((m: any) => (
                  <div key={m.id} className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                    <span className="font-medium">{m.cognome} {m.nome}</span>
                    <span className="text-gray-500">{m.nome_azienda} · {formatDate(m.data_match)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
