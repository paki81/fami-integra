"use client";

import { useEffect, useState } from "react";
import { dashboardApi, matchingApi, contrattiApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, getStatoColor } from "@/lib/utils";
import { FileText, Home, Building2, FileCheck } from "lucide-react";

export default function ReportPage() {
  const [stats, setStats] = useState<any>(null);
  const [comuniData, setComuniData] = useState<any[]>([]);
  const [matchAlloggi, setMatchAlloggi] = useState<any[]>([]);
  const [matchLavoro, setMatchLavoro] = useState<any[]>([]);
  const [contratti, setContratti] = useState<any[]>([]);
  const [tab, setTab] = useState<"riepilogo" | "alloggi" | "lavoro" | "contratti">("riepilogo");

  useEffect(() => {
    dashboardApi.stats().then(r => setStats(r.data)).catch(console.error);
    dashboardApi.beneficiariPerComune().then(r => setComuniData(r.data)).catch(console.error);
    matchingApi.listaMatchAlloggi({ limit: 100 }).then(r => setMatchAlloggi(r.data.data)).catch(console.error);
    matchingApi.listaMatchLavoro({ limit: 100 }).then(r => setMatchLavoro(r.data.data)).catch(console.error);
    contrattiApi.list({ limit: 100 }).then(r => setContratti(r.data.data)).catch(console.error);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report</h1>
        <p className="text-sm text-gray-500">Riepilogo attività e monitoraggio</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {[
          { key: "riepilogo", label: "Riepilogo", icon: FileText },
          { key: "alloggi", label: "Abbinamenti Alloggi", icon: Home },
          { key: "lavoro", label: "Abbinamenti Lavoro", icon: Building2 },
          { key: "contratti", label: "Monitoraggio Contratti", icon: FileCheck },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${tab === t.key ? "bg-green-50 text-green-800 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === "riepilogo" && stats && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Riepilogo Generale</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Beneficiari totali</span>
                    <span className="font-bold">{stats.beneficiari.totale}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">In corso (da abbinare)</span>
                    <span className="font-bold text-blue-600">{stats.beneficiari.in_corso}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Abbinati</span>
                    <span className="font-bold text-green-600">{stats.beneficiari.abbinati}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Alloggi totali / disponibili</span>
                    <span className="font-bold">{stats.alloggi.totale} / {stats.alloggi.disponibili}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Aziende totali / disponibili</span>
                    <span className="font-bold">{stats.aziende.totale} / {stats.aziende.disponibili}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Abbinamenti alloggi effettuati</span>
                    <span className="font-bold">{stats.matching.alloggi}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Abbinamenti lavoro effettuati</span>
                    <span className="font-bold">{stats.matching.lavoro}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-gray-600">Contratti firmati</span>
                    <span className="font-bold text-emerald-600">{stats.matching.contratti_firmati}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Per Comune</CardTitle></CardHeader>
              <CardContent>
                {comuniData.map((c: any) => (
                  <div key={c.comune} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-medium">{c.comune}</span>
                    <div className="text-xs text-gray-500 space-x-2">
                      <span>{c.totale} tot.</span>
                      <span className="text-blue-600">{c.in_corso} in corso</span>
                      <span className="text-green-600">{c.abbinati} abbinati</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "alloggi" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Beneficiario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nucleo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Alloggio</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Comune</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Canone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Data Match</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Sopralluogo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Contratto</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {matchAlloggi.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{m.ben_cognome} {m.ben_nome}</td>
                    <td className="px-4 py-3 text-gray-600">{m.n_componenti_nucleo} comp.</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{m.id_alloggio}</td>
                    <td className="px-4 py-3 text-gray-600">{m.alloggio_comune}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(m.canone_mensile)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(m.data_match)}</td>
                    <td className="px-4 py-3 text-gray-600">{m.esito_sopralluogo || "-"}</td>
                    <td className="px-4 py-3"><Badge className={m.contratto_firmato === "S" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{m.contratto_firmato === "S" ? "Firmato" : "Pending"}</Badge></td>
                  </tr>
                ))}
                {matchAlloggi.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nessun abbinamento</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "lavoro" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Beneficiario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Azienda</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Settore</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Mansione</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Data Match</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Esito</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Data Avvio</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {matchLavoro.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{m.ben_cognome} {m.ben_nome}</td>
                    <td className="px-4 py-3 text-gray-700">{m.nome_azienda}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{m.settore}</Badge></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{m.mansione_profilo || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(m.data_match)}</td>
                    <td className="px-4 py-3 text-gray-600">{m.esito || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(m.data_avvio)}</td>
                  </tr>
                ))}
                {matchLavoro.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nessun abbinamento</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "contratti" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Beneficiario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Alloggio</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Comune</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Inizio</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fine</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Canone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Contributo/mese</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Totale</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Stato</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {contratti.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.ben_cognome} {c.ben_nome}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{c.id_alloggio}</td>
                    <td className="px-4 py-3 text-gray-600">{c.comune || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.data_inizio_contratto)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.data_fine_contratto)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(c.canone_mensile)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(c.contributo_progetto_mese)}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(c.totale_contributo)}</td>
                    <td className="px-4 py-3"><Badge className={getStatoColor(c.stato_contratto)}>{c.stato_contratto}</Badge></td>
                  </tr>
                ))}
                {contratti.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Nessun contratto</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
