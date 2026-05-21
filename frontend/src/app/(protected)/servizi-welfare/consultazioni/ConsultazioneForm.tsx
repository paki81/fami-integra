"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { beneficiariApi, serviziWelfareApi, alloggiApi, aziendeApi, consultazioniWelfareApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Search, Plus, Trash2, Save, CheckCircle2, X, HeartHandshake, Home, Building2 } from "lucide-react";
import type {
  Consultazione,
  ConsultazioneItem,
  ConsultazionePayload,
  ConsultazioneStatus,
} from "@/types/consultazione";

interface BeneficiarioLite {
  id: number;
  codice_id?: string;
  nome: string;
  cognome: string;
  comune?: string;
  codice_fiscale?: string;
}

interface EnteServizioLite {
  id: number;
  nome_ente: string;
  comune_erogatore?: string;
  contatto?: string;
  servizi?: { id: number; categoria: string; descrizione?: string }[];
}

export default function ConsultazioneForm({
  initial,
  mode,
}: {
  initial?: Consultazione | null;
  mode: "create" | "edit";
}) {
  const router = useRouter();

  // ----- Dati beneficiario
  const [benQuery, setBenQuery] = useState("");
  const [benResults, setBenResults] = useState<BeneficiarioLite[]>([]);
  const [benSelected, setBenSelected] = useState<BeneficiarioLite | null>(null);

  const [nome, setNome] = useState(initial?.nome || "");
  const [cognome, setCognome] = useState(initial?.cognome || "");
  const [codiceFiscale, setCodiceFiscale] = useState(initial?.codice_fiscale || "");
  const [dataConsulto, setDataConsulto] = useState(
    initial?.data_consulto
      ? new Date(initial.data_consulto).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState(initial?.note || "");
  const [items, setItems] = useState<ConsultazioneItem[]>(initial?.items || []);

  // ----- Ricerca multi-fonte (welfare / alloggi / aziende)
  type Fonte = "welfare" | "alloggi" | "aziende";
  const [fonteAttiva, setFonteAttiva] = useState<Fonte>("welfare");
  const [welfareQuery, setWelfareQuery] = useState("");
  const [welfareResults, setWelfareResults] = useState<EnteServizioLite[]>([]);
  const [alloggiQuery, setAlloggiQuery] = useState("");
  const [alloggiResults, setAlloggiResults] = useState<any[]>([]);
  const [aziendeQuery, setAziendeQuery] = useState("");
  const [aziendeResults, setAziendeResults] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Precarica beneficiario in modifica
  useEffect(() => {
    if (initial?.beneficiario_id && !benSelected) {
      beneficiariApi
        .get(initial.beneficiario_id)
        .then((res) => {
          const b = res.data;
          setBenSelected({
            id: b.id,
            codice_id: b.codice_id,
            nome: b.nome,
            cognome: b.cognome,
            comune: b.comune,
          });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.beneficiario_id]);

  // Ricerca beneficiari (debounced)
  useEffect(() => {
    if (!benQuery || benQuery.length < 2) {
      setBenResults([]);
      return;
    }
    const t = setTimeout(() => {
      beneficiariApi
        .list({ search: benQuery, limit: 10 })
        .then((res) => setBenResults(res.data?.data || []))
        .catch(() => setBenResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [benQuery]);

  // Ricerca servizi welfare (debounced)
  useEffect(() => {
    if (!welfareQuery || welfareQuery.length < 2) {
      setWelfareResults([]);
      return;
    }
    const t = setTimeout(() => {
      serviziWelfareApi
        .list({ search: welfareQuery, limit: 15 })
        .then((res) => setWelfareResults(res.data?.data || []))
        .catch(() => setWelfareResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [welfareQuery]);

  // Ricerca alloggi (debounced)
  useEffect(() => {
    if (!alloggiQuery || alloggiQuery.length < 2) {
      setAlloggiResults([]);
      return;
    }
    const t = setTimeout(() => {
      alloggiApi
        .list({ search: alloggiQuery, limit: 15 })
        .then((res) => setAlloggiResults(res.data?.data || []))
        .catch(() => setAlloggiResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [alloggiQuery]);

  // Ricerca aziende (debounced)
  useEffect(() => {
    if (!aziendeQuery || aziendeQuery.length < 2) {
      setAziendeResults([]);
      return;
    }
    const t = setTimeout(() => {
      aziendeApi
        .list({ search: aziendeQuery, limit: 15 })
        .then((res) => setAziendeResults(res.data?.data || []))
        .catch(() => setAziendeResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [aziendeQuery]);

  const selectBeneficiario = (b: BeneficiarioLite) => {
    setBenSelected(b);
    setBenQuery("");
    setBenResults([]);
    if (!nome) setNome(b.nome || "");
    if (!cognome) setCognome(b.cognome || "");
  };

  const addServizioAsItem = (ente: EnteServizioLite, servizioIdx: number) => {
    const s = ente.servizi?.[servizioIdx];
    if (!s) return;
    setItems((prev) => [
      ...prev,
      {
        categoria: s.categoria || "",
        titolo: ente.nome_ente,
        contenuto: [s.descrizione, ente.contatto ? `Contatto: ${ente.contatto}` : null]
          .filter(Boolean)
          .join("\n"),
        fonte: ente.comune_erogatore ? `Ente welfare — ${ente.comune_erogatore}` : "Ente welfare",
      },
    ]);
  };

  const addAlloggioAsItem = (a: any) => {
    const contenuto = [
      a.tipologia ? `Tipologia: ${a.tipologia}` : null,
      a.indirizzo ? `Indirizzo: ${a.indirizzo}${a.comune ? ", " + a.comune : ""}` : null,
      a.n_vani ? `Vani: ${a.n_vani}` : null,
      a.canone_mensile ? `Canone: € ${a.canone_mensile}` : null,
      a.proprietario ? `Proprietario: ${a.proprietario}` : null,
      a.telefono_referente ? `Telefono: ${a.telefono_referente}` : null,
      a.stato ? `Stato: ${a.stato}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    setItems((prev) => [
      ...prev,
      {
        categoria: "Alloggio",
        titolo: `${a.id_alloggio || ""} ${a.indirizzo || ""}`.trim() || `Alloggio #${a.id}`,
        contenuto,
        fonte: `Alloggio${a.comune ? " — " + a.comune : ""}`,
      },
    ]);
  };

  const addAziendaAsItem = (a: any) => {
    const contenuto = [
      a.settore ? `Settore: ${a.settore}` : null,
      a.mansione_profilo ? `Mansione: ${a.mansione_profilo}` : null,
      a.tipo_contratto ? `Contratto: ${a.tipo_contratto}` : null,
      a.orario ? `Orario: ${a.orario}` : null,
      a.indirizzo ? `Indirizzo: ${a.indirizzo}${a.comune ? ", " + a.comune : ""}` : null,
      a.referente ? `Referente: ${a.referente}` : null,
      a.telefono ? `Telefono: ${a.telefono}` : null,
      a.email ? `Email: ${a.email}` : null,
      a.tirocinio === "S" ? "Tirocinio: Sì" : null,
    ]
      .filter(Boolean)
      .join("\n");
    setItems((prev) => [
      ...prev,
      {
        categoria: "Azienda",
        titolo: a.nome_azienda || `Azienda #${a.id}`,
        contenuto,
        fonte: `Azienda${a.comune ? " — " + a.comune : ""}`,
      },
    ]);
  };

  const addCustomItem = () => {
    setItems((p) => [...p, { categoria: "", titolo: "", contenuto: "", fonte: null }]);
  };

  const updateItem = (idx: number, patch: Partial<ConsultazioneItem>) => {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => {
    setItems((p) => p.filter((_, i) => i !== idx));
  };

  const buildPayload = (status: ConsultazioneStatus): ConsultazionePayload | null => {
    if (!benSelected) {
      setError("Seleziona un beneficiario");
      return null;
    }
    if (!nome.trim() || !cognome.trim()) {
      setError("Nome e cognome sono obbligatori");
      return null;
    }
    if (!dataConsulto) {
      setError("Data consulto obbligatoria");
      return null;
    }
    setError(null);
    return {
      beneficiario_id: benSelected.id,
      nome: nome.trim(),
      cognome: cognome.trim(),
      codice_fiscale: codiceFiscale.trim() || null,
      data_consulto: dataConsulto,
      note: note.trim() || null,
      items,
      status,
    };
  };

  const handleSubmit = async (status: ConsultazioneStatus) => {
    const payload = buildPayload(status);
    if (!payload) return;
    setSaving(true);
    try {
      let res;
      if (mode === "edit" && initial) {
        res = await consultazioniWelfareApi.update(initial.id, payload);
      } else {
        res = await consultazioniWelfareApi.create(payload);
      }
      router.push(`/servizi-welfare/consultazioni/${res.data.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const itemsCount = useMemo(() => items.length, [items]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Sezione Beneficiario */}
      <section className="bg-white border rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">1. Beneficiario</h2>
        {benSelected ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-3">
            <div>
              <div className="font-medium text-green-900">
                {benSelected.cognome} {benSelected.nome}
              </div>
              <div className="text-xs text-green-700">
                {benSelected.codice_id ? `${benSelected.codice_id} · ` : ""}
                {benSelected.comune || ""}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBenSelected(null)}
            >
              <X size={14} className="mr-1" /> Cambia
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white">
              <Search size={16} className="text-gray-400" />
              <input
                value={benQuery}
                onChange={(e) => setBenQuery(e.target.value)}
                placeholder="Cerca beneficiario per nome, cognome o codice..."
                className="flex-1 outline-none text-sm"
              />
            </div>
            {benResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-md max-h-64 overflow-auto">
                {benResults.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => selectBeneficiario(b)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                  >
                    <span className="font-medium">
                      {b.cognome} {b.nome}
                    </span>
                    <span className="text-gray-500 ml-2 text-xs">
                      {b.codice_id || ""} {b.comune ? `· ${b.comune}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div>
            <label className="text-xs text-gray-600">Nome *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Cognome *</label>
            <input
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Codice fiscale</label>
            <input
              value={codiceFiscale}
              onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
              className="w-full border rounded-md px-3 py-2 text-sm uppercase"
              maxLength={20}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Data consulto *</label>
            <input
              type="date"
              value={dataConsulto}
              onChange={(e) => setDataConsulto(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Ricerca multi-fonte */}
      <section className="bg-white border rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">2. Cerca e aggiungi voci</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {([
            { k: "welfare", label: "Servizi Welfare", Icon: HeartHandshake },
            { k: "alloggi", label: "Alloggi", Icon: Home },
            { k: "aziende", label: "Aziende", Icon: Building2 },
          ] as { k: Fonte; label: string; Icon: any }[]).map(({ k, label, Icon }) => (
            <button
              key={k}
              onClick={() => setFonteAttiva(k)}
              className={`text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1 border transition-colors ${
                fonteAttiva === k
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {fonteAttiva === "welfare" && (
          <>
            <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white">
              <Search size={16} className="text-gray-400" />
              <input
                value={welfareQuery}
                onChange={(e) => setWelfareQuery(e.target.value)}
                placeholder="Cerca ente, categoria, comune..."
                className="flex-1 outline-none text-sm"
              />
            </div>
            {welfareResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-80 overflow-auto">
                {welfareResults.map((ente) => (
                  <div key={ente.id} className="border rounded-md p-3">
                    <div>
                      <div className="font-medium text-sm">{ente.nome_ente}</div>
                      <div className="text-xs text-gray-500">
                        {ente.comune_erogatore || "—"}
                        {ente.contatto ? ` · ${ente.contatto}` : ""}
                      </div>
                    </div>
                    {ente.servizi && ente.servizi.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ente.servizi.map((s, idx) => (
                          <button
                            key={s.id || idx}
                            onClick={() => addServizioAsItem(ente, idx)}
                            className="text-xs bg-green-50 border border-green-200 text-green-800 hover:bg-green-100 px-2 py-1 rounded-full inline-flex items-center gap-1"
                            title="Aggiungi al report"
                          >
                            <Plus size={12} /> {s.categoria}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {fonteAttiva === "alloggi" && (
          <>
            <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white">
              <Search size={16} className="text-gray-400" />
              <input
                value={alloggiQuery}
                onChange={(e) => setAlloggiQuery(e.target.value)}
                placeholder="Cerca per id, indirizzo, comune..."
                className="flex-1 outline-none text-sm"
              />
            </div>
            {alloggiResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-80 overflow-auto">
                {alloggiResults.map((a) => (
                  <div key={a.id} className="border rounded-md p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {a.id_alloggio} · {a.tipologia || "-"}{" "}
                        {a.n_vani ? `· ${a.n_vani} vani` : ""}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {[a.indirizzo, a.comune].filter(Boolean).join(", ")}
                        {a.canone_mensile ? ` · € ${a.canone_mensile}/mese` : ""}
                      </div>
                      {a.stato && (
                        <div className="text-[11px] text-gray-500 mt-0.5">Stato: {a.stato}</div>
                      )}
                    </div>
                    <button
                      onClick={() => addAlloggioAsItem(a)}
                      className="shrink-0 text-xs bg-green-50 border border-green-200 text-green-800 hover:bg-green-100 px-2 py-1 rounded-full inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> Aggiungi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {fonteAttiva === "aziende" && (
          <>
            <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white">
              <Search size={16} className="text-gray-400" />
              <input
                value={aziendeQuery}
                onChange={(e) => setAziendeQuery(e.target.value)}
                placeholder="Cerca per nome, settore, comune..."
                className="flex-1 outline-none text-sm"
              />
            </div>
            {aziendeResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-80 overflow-auto">
                {aziendeResults.map((a) => (
                  <div key={a.id} className="border rounded-md p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{a.nome_azienda}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {[a.settore, a.comune].filter(Boolean).join(" · ")}
                        {a.tipo_contratto ? ` · ${a.tipo_contratto}` : ""}
                      </div>
                      {a.mansione_profilo && (
                        <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {a.mansione_profilo}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => addAziendaAsItem(a)}
                      className="shrink-0 text-xs bg-green-50 border border-green-200 text-green-800 hover:bg-green-100 px-2 py-1 rounded-full inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> Aggiungi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Items del report */}
      <section className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">3. Voci del report ({itemsCount})</h2>
          <Button variant="outline" size="sm" onClick={addCustomItem}>
            <Plus size={14} className="mr-1" /> Voce manuale
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nessuna voce. Aggiungi servizi dalla ricerca sopra o crea una voce manuale.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="border rounded-md p-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    value={it.titolo}
                    onChange={(e) => updateItem(idx, { titolo: e.target.value })}
                    placeholder="Titolo / Ente"
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  />
                  <input
                    value={it.categoria}
                    onChange={(e) => updateItem(idx, { categoria: e.target.value })}
                    placeholder="Categoria"
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  />
                </div>
                <textarea
                  value={it.contenuto}
                  onChange={(e) => updateItem(idx, { contenuto: e.target.value })}
                  placeholder="Contenuto / Note"
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 text-sm mt-2 bg-white"
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    value={it.fonte || ""}
                    onChange={(e) => updateItem(idx, { fonte: e.target.value || null })}
                    placeholder="Fonte (opzionale)"
                    className="flex-1 border rounded-md px-3 py-2 text-sm bg-white"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Note libere */}
      <section className="bg-white border rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">4. Note</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Annotazioni libere..."
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/servizi-welfare/consultazioni")}
          disabled={saving}
        >
          Annulla
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSubmit("bozza")}
          disabled={saving}
        >
          <Save size={14} className="mr-1" /> Salva come bozza
        </Button>
        <Button onClick={() => handleSubmit("finalizzata")} disabled={saving}>
          <CheckCircle2 size={14} className="mr-1" /> Finalizza
        </Button>
      </div>
    </div>
  );
}
