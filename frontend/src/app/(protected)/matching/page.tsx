"use client";

import { useEffect, useState } from "react";
import { beneficiariApi, matchingApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, getScoreColor, getStatoColor } from "@/lib/utils";
import { GitMerge, Home, Building2, Search, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function MatchingPage() {
  const { user } = useAuth();
  const [beneficiari, setBeneficiari] = useState<any[]>([]);
  const [selectedBen, setSelectedBen] = useState<any>(null);
  const [sugAlloggi, setSugAlloggi] = useState<any[]>([]);
  const [sugAziende, setSugAziende] = useState<any[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [matchAlloggi, setMatchAlloggi] = useState<any[]>([]);
  const [matchLavoro, setMatchLavoro] = useState<any[]>([]);
  const [tab, setTab] = useState<"cerca" | "alloggi" | "lavoro">("cerca");
  const [search, setSearch] = useState("");

  useEffect(() => {
    beneficiariApi.list({ limit: 100, stato: "In Corso" }).then(r => setBeneficiari(r.data.data)).catch(console.error);
    matchingApi.listaMatchAlloggi({ limit: 50 }).then(r => setMatchAlloggi(r.data.data)).catch(console.error);
    matchingApi.listaMatchLavoro({ limit: 50 }).then(r => setMatchLavoro(r.data.data)).catch(console.error);
  }, []);

  const handleSelectBen = async (ben: any) => {
    setSelectedBen(ben);
    setLoadingSug(true);
    try {
      const [resA, resAz] = await Promise.all([
        matchingApi.suggerisciAlloggi(ben.id),
        matchingApi.suggerisciAziende(ben.id)
      ]);
      setSugAlloggi(resA.data.suggerimenti || []);
      setSugAziende(resAz.data.suggerimenti || []);
    } catch (err) { console.error(err); }
    setLoadingSug(false);
  };

  const creaMatchAlloggio = async (alloggioId: number) => {
    if (!selectedBen) return;
    try {
      await matchingApi.creaMatchAlloggio({
        id_beneficiario: selectedBen.id,
        id_alloggio: alloggioId,
        composizione_nucleo: `${selectedBen.nucleo_singolo} (${selectedBen.n_componenti_nucleo})`,
        comune_preferenza: selectedBen.comune
      });
      toast.success("Abbinamento alloggio creato con successo");
      matchingApi.listaMatchAlloggi({ limit: 50 }).then(r => setMatchAlloggi(r.data.data));
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg?.includes("già") || msg?.includes("DUP")) toast.error("Questo abbinamento esiste già");
      else toast.error(msg || "Si è verificato un errore durante l'abbinamento");
    }
  };

  const creaMatchLavoro = async (aziendaId: number) => {
    if (!selectedBen) return;
    try {
      await matchingApi.creaMatchLavoro({
        id_beneficiario: selectedBen.id,
        id_azienda: aziendaId
      });
      toast.success("Abbinamento lavoro creato con successo");
      matchingApi.listaMatchLavoro({ limit: 50 }).then(r => setMatchLavoro(r.data.data));
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (msg?.includes("già") || msg?.includes("DUP")) toast.error("Questo abbinamento esiste già");
      else toast.error(msg || "Si è verificato un errore durante l'abbinamento");
    }
  };

  const filteredBen = beneficiari.filter(b =>
    !search || `${b.cognome} ${b.nome} ${b.comune}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abbinamento</h1>
        <p className="text-sm text-gray-500">Trova alloggi e lavoro per i beneficiari</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <Button variant={tab === "cerca" ? "default" : "ghost"} size="sm" onClick={() => setTab("cerca")}>
          <Search size={14} className="mr-2" />Cerca Abbinamento</Button>
        <Button variant={tab === "alloggi" ? "default" : "ghost"} size="sm" onClick={() => setTab("alloggi")}>
          <Home size={14} className="mr-2" />Abbinamenti Alloggi ({matchAlloggi.length})</Button>
        <Button variant={tab === "lavoro" ? "default" : "ghost"} size="sm" onClick={() => setTab("lavoro")}>
          <Building2 size={14} className="mr-2" />Abbinamenti Lavoro ({matchLavoro.length})</Button>
      </div>

      {tab === "cerca" && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Lista beneficiari */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Beneficiari in uscita</CardTitle>
              <Input placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} className="mt-2" />
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
              {filteredBen.map(b => (
                <div key={b.id}
                  onClick={() => handleSelectBen(b)}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${selectedBen?.id === b.id ? "border-green-500 bg-green-50" : "border-gray-100 hover:bg-gray-50"}`}>
                  <p className="font-medium text-sm">{b.cognome} {b.nome}</p>
                  <p className="text-xs text-gray-500">{b.comune} · {b.n_componenti_nucleo} comp. · {b.area_intervento}</p>
                  <p className="text-xs text-gray-400">Uscita: {formatDate(b.data_uscita_sai)}</p>
                </div>
              ))}
              {filteredBen.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Nessun beneficiario</p>}
            </CardContent>
          </Card>

          {/* Suggerimenti */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedBen ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-400">
                  <GitMerge size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Seleziona un beneficiario per vedere i suggerimenti di abbinamento</p>
                </CardContent>
              </Card>
            ) : loadingSug ? (
              <Card><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700 mx-auto" /></CardContent></Card>
            ) : (
              <>
                {/* Suggerimenti Alloggi */}
                {(selectedBen.area_intervento?.includes("ALLOGGIO") || selectedBen.area_intervento?.includes("LAVORATIVO-ALLOGGIO")) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Home size={16} className="text-orange-600" />
                        Alloggi suggeriti ({sugAlloggi.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sugAlloggi.length === 0 ? (
                        <p className="text-sm text-gray-400">Nessun alloggio compatibile trovato</p>
                      ) : sugAlloggi.map((s: any) => (
                        <div key={s.alloggio.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(s.score)}`}>{s.score}%</span>
                              <span className="font-medium text-sm">{s.alloggio.id_alloggio}</span>
                              <Badge variant="secondary" className="text-xs">{s.alloggio.tipologia}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {s.alloggio.comune} · {s.alloggio.indirizzo} · {s.alloggio.n_vani} vani · {formatCurrency(s.alloggio.canone_mensile)}
                              {s.stessoComune && <span className="text-green-600 ml-1">✓ Stesso comune</span>}
                            </p>
                          </div>
                          <Button size="sm" onClick={() => creaMatchAlloggio(s.alloggio.id)}>
                            <Check size={14} className="mr-1" />Abbina
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Suggerimenti Aziende */}
                {selectedBen.area_intervento?.includes("LAVORATIVO") && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-600" />
                        Aziende suggerite ({sugAziende.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sugAziende.length === 0 ? (
                        <p className="text-sm text-gray-400">Nessuna azienda compatibile trovata</p>
                      ) : sugAziende.map((s: any) => (
                        <div key={s.azienda.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(s.score)}`}>{s.score}%</span>
                              <span className="font-medium text-sm">{s.azienda.nome_azienda}</span>
                              <Badge variant="secondary" className="text-xs">{s.azienda.settore}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {s.azienda.comune} · {s.azienda.mansione_profilo} · {s.azienda.tipo_contratto}
                              {s.stessoComune && <span className="text-green-600 ml-1">✓ Stesso comune</span>}
                              {s.azienda.tirocinio === "S" && <span className="text-blue-600 ml-1">✓ Tirocinio</span>}
                            </p>
                          </div>
                          <Button size="sm" onClick={() => creaMatchLavoro(s.azienda.id)}>
                            <Check size={14} className="mr-1" />Abbina
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "alloggi" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Beneficiario</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Alloggio</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Comune</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Data Abbinamento</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Sopralluogo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Contratto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matchAlloggi.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nessun abbinamento alloggi</td></tr>
                  ) : matchAlloggi.map((m: any) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{m.ben_cognome} {m.ben_nome}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{m.id_alloggio}</td>
                      <td className="px-4 py-3 text-gray-600">{m.alloggio_comune}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(m.data_match)}</td>
                      <td className="px-4 py-3 text-gray-600">{m.esito_sopralluogo || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={m.contratto_firmato === "S" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                          {m.contratto_firmato === "S" ? "Firmato" : "Non firmato"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "lavoro" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Beneficiario</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Azienda</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Settore</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Data Abbinamento</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Esito</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Data Avvio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matchLavoro.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nessun abbinamento lavoro</td></tr>
                  ) : matchLavoro.map((m: any) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{m.ben_cognome} {m.ben_nome}</td>
                      <td className="px-4 py-3 text-gray-700">{m.nome_azienda}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{m.settore}</Badge></td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(m.data_match)}</td>
                      <td className="px-4 py-3 text-gray-600">{m.esito || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(m.data_avvio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
