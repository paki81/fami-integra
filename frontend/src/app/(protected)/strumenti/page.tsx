"use client";

import { useEffect, useState, useRef } from "react";
import { strumentiApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Wrench, Database, Trash2, AlertTriangle, Download, Upload, RefreshCw,
  HardDrive, Shield, Clock, FileArchive, X
} from "lucide-react";
import api from "@/lib/api";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function StrumentiPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [conteggi, setConteggi] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [operazione, setOperazione] = useState("");

  // Conferma svuotamento
  const [svuotaDialog, setSvuotaDialog] = useState<string | null>(null);
  const [svuotaConferma, setSvuotaConferma] = useState("");

  // Conferma ripristino
  const [ripristinoDialog, setRipristinoDialog] = useState<string | null>(null);
  const [ripristinoConferma, setRipristinoConferma] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, b] = await Promise.all([strumentiApi.conteggi(), strumentiApi.listaBackup()]);
      setConteggi(c.data);
      setBackups(b.data);
    } catch { toast.error("Errore nel caricamento dei dati"); }
    setLoading(false);
  };

  useEffect(() => {
    if (user && user.ruolo !== "superadmin") { router.push("/dashboard"); return; }
    if (user) fetchData();
  }, [user]);

  // Protezione accesso
  if (!user || user.ruolo !== "superadmin") return null;

  const handleSvuota = async () => {
    if (!svuotaDialog || svuotaConferma !== svuotaDialog) {
      toast.error(`Digita "${svuotaDialog}" per confermare`);
      return;
    }
    setOperazione(`svuota-${svuotaDialog}`);
    try {
      const res = await strumentiApi.svuota(svuotaDialog, svuotaConferma);
      toast.success(res.data.message + ` (${res.data.eliminati} record)`);
      setSvuotaDialog(null);
      setSvuotaConferma("");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Errore durante lo svuotamento");
    }
    setOperazione("");
  };

  const handleBackup = async () => {
    setOperazione("backup");
    try {
      const res = await strumentiApi.creaBackup();
      toast.success(`${res.data.message} — ${res.data.filename} (${formatBytes(res.data.size)})`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Errore durante il backup");
    }
    setOperazione("");
  };

  const handleDownload = (filename: string) => {
    const token = localStorage.getItem("fami_token");
    const url = `${api.defaults.baseURL}/strumenti/backup/download/${filename}`;
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    // Fetch with auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => toast.error("Errore download"));
  };

  const handleEliminaBackup = (filename: string) => {
    toast("Vuoi eliminare questo backup?", {
      action: {
        label: "Elimina", onClick: async () => {
          try {
            await strumentiApi.eliminaBackup(filename);
            toast.success("Backup eliminato");
            fetchData();
          } catch { toast.error("Errore eliminazione"); }
        }
      },
      cancel: { label: "Annulla", onClick: () => {} },
      duration: 8000,
    });
  };

  const handleRipristinoDaFile = async () => {
    if (!ripristinoDialog || ripristinoConferma !== "RIPRISTINA") {
      toast.error('Digita "RIPRISTINA" per confermare');
      return;
    }
    setOperazione("ripristino");
    try {
      const res = await strumentiApi.ripristinoDaFile(ripristinoDialog, ripristinoConferma);
      toast.success(res.data.message);
      setRipristinoDialog(null);
      setRipristinoConferma("");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Errore durante il ripristino");
    }
    setOperazione("");
  };

  const handleRipristinoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = window.prompt('ATTENZIONE: Questa operazione sovrascriverà tutto il database!\n\nDigita "RIPRISTINA" per confermare:');
    if (ok !== "RIPRISTINA") { toast.error("Ripristino annullato"); return; }
    setOperazione("ripristino-upload");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("conferma", "RIPRISTINA");
      const res = await strumentiApi.ripristino(fd);
      toast.success(res.data.message);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Errore durante il ripristino");
    }
    setOperazione("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const tabelleInfo: Record<string, { label: string; icon: any; color: string; desc: string }> = {
    beneficiari: { label: "Beneficiari", icon: "👤", color: "blue", desc: "Elimina tutti i beneficiari, matching e note correlate" },
    alloggi: { label: "Alloggi", icon: "🏠", color: "green", desc: "Elimina tutti gli alloggi, foto, contratti, matching e note correlate" },
    aziende: { label: "Aziende", icon: "🏢", color: "purple", desc: "Elimina tutte le aziende, matching e note correlate" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Wrench className="text-red-600" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strumenti di Sistema</h1>
          <p className="text-sm text-gray-500">Operazioni riservate al superadmin — Usa con cautela</p>
        </div>
        <div className="ml-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
            <Shield size={12} /> Solo Superadmin
          </span>
        </div>
      </div>

      {/* Conteggi */}
      {conteggi && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(conteggi).map(([k, v]) => (
            <div key={k} className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{String(v)}</p>
              <p className="text-xs text-gray-500 capitalize">{k.replace("_", " ")}</p>
            </div>
          ))}
        </div>
      )}

      {/* Backup & Ripristino */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><HardDrive size={20} className="text-blue-600" /> Backup & Ripristino Database</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleBackup} disabled={!!operazione}>
                {operazione === "backup" ? <RefreshCw size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
                {operazione === "backup" ? "Creazione..." : "Crea Backup"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!!operazione}>
                <Upload size={14} className="mr-1" /> Ripristina da File
              </Button>
              <input ref={fileInputRef} type="file" accept=".sql,.sql.gz,.gz" className="hidden" onChange={handleRipristinoUpload} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileArchive size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nessun backup disponibile</p>
              <p className="text-xs">Crea il primo backup cliccando il pulsante qui sopra</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map(b => (
                <div key={b.filename} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 hover:bg-blue-50 transition-colors">
                  <FileArchive size={18} className="text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.filename}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <Clock size={10} /> {formatDate(b.data)} — {formatBytes(b.size)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(b.filename)} title="Scarica">
                      <Download size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRipristinoDialog(b.filename); setRipristinoConferma(""); }} title="Ripristina"
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" disabled={!!operazione}>
                      <RefreshCw size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEliminaBackup(b.filename)} title="Elimina"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Svuotamento tabelle */}
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700"><AlertTriangle size={20} /> Svuotamento Tabelle — Zona Pericolosa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800 font-medium">Queste operazioni sono irreversibili. Verranno eliminati tutti i dati della tabella selezionata e i dati correlati (matching, note, foto, contratti). Si consiglia di creare un backup prima di procedere.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(tabelleInfo).map(([tabella, info]) => (
              <div key={tabella} className="border rounded-lg p-4 hover:border-red-300 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{info.label}</h3>
                    <p className="text-xs text-gray-500">{conteggi?.[tabella] ?? "..."} record</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">{info.desc}</p>
                <Button
                  size="sm" variant="destructive" className="w-full"
                  onClick={() => { setSvuotaDialog(tabella); setSvuotaConferma(""); }}
                  disabled={!!operazione || (conteggi && conteggi[tabella] === 0)}
                >
                  <Trash2 size={14} className="mr-1" /> Svuota {info.label}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog conferma svuotamento */}
      {svuotaDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSvuotaDialog(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Conferma Svuotamento</h3>
                <p className="text-sm text-gray-500">Tabella: <span className="font-semibold text-red-600">{svuotaDialog}</span></p>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setSvuotaDialog(null)}><X size={18} /></Button>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">Stai per eliminare <strong>definitivamente</strong> tutti i {conteggi?.[svuotaDialog]} record dalla tabella <strong>{svuotaDialog}</strong> e tutti i dati correlati. Questa azione è <strong>irreversibile</strong>.</p>
            </div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Digita <strong className="text-red-600">{svuotaDialog}</strong> per confermare:</label>
            <Input
              value={svuotaConferma}
              onChange={e => setSvuotaConferma(e.target.value)}
              placeholder={svuotaDialog}
              className="mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSvuotaDialog(null)}>Annulla</Button>
              <Button
                variant="destructive" className="flex-1"
                onClick={handleSvuota}
                disabled={svuotaConferma !== svuotaDialog || operazione === `svuota-${svuotaDialog}`}
              >
                {operazione === `svuota-${svuotaDialog}` ? <RefreshCw size={14} className="mr-1 animate-spin" /> : <Trash2 size={14} className="mr-1" />}
                {operazione === `svuota-${svuotaDialog}` ? "Eliminazione..." : "Svuota Definitivamente"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog conferma ripristino */}
      {ripristinoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRipristinoDialog(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <RefreshCw className="text-orange-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Conferma Ripristino</h3>
                <p className="text-sm text-gray-500 truncate max-w-[250px]">{ripristinoDialog}</p>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setRipristinoDialog(null)}><X size={18} /></Button>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800">Stai per <strong>sovrascrivere tutto il database</strong> con i dati del backup selezionato. I dati attuali saranno <strong>persi definitivamente</strong>.</p>
            </div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Digita <strong className="text-orange-600">RIPRISTINA</strong> per confermare:</label>
            <Input
              value={ripristinoConferma}
              onChange={e => setRipristinoConferma(e.target.value)}
              placeholder="RIPRISTINA"
              className="mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRipristinoDialog(null)}>Annulla</Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={handleRipristinoDaFile}
                disabled={ripristinoConferma !== "RIPRISTINA" || operazione === "ripristino"}
              >
                {operazione === "ripristino" ? <RefreshCw size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
                {operazione === "ripristino" ? "Ripristino..." : "Ripristina Database"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
