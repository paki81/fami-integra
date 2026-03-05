"use client";

import { useState, useRef } from "react";
import { importApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, Users, Home, Building2 } from "lucide-react";

const TABELLE_EXPORT = [
  { key: "beneficiari", label: "Beneficiari", icon: Users },
  { key: "alloggi", label: "Alloggi", icon: Home },
  { key: "aziende", label: "Aziende", icon: Building2 },
  { key: "matching_alloggi", label: "Abbinamenti Alloggi", icon: Home },
  { key: "matching_lavoro", label: "Abbinamenti Lavoro", icon: Building2 },
];

export default function ImportPage() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<"beneficiari" | "alloggi" | "aziende">("beneficiari");

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Seleziona un file Excel (.xlsx)"); return; }
    setError(""); setResult(null); setImporting(true);
    try {
      let res;
      if (importType === "beneficiari") res = await importApi.importBeneficiari(file);
      else if (importType === "alloggi") res = await importApi.importAlloggi(file);
      else res = await importApi.importAziende(file);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Errore durante l'import");
    }
    setImporting(false);
  };

  const handleExport = async (tabella: string, formato: "xlsx" | "csv") => {
    try {
      const res = formato === "xlsx"
        ? await importApi.exportExcel(tabella)
        : await importApi.exportCsv(tabella);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tabella}_export.${formato}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import / Export</h1>
        <p className="text-sm text-gray-500">Importa dati da Excel o esporta tabelle</p>
      </div>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload size={18} className="text-green-600" />Importa da Excel</CardTitle>
          <CardDescription>Carica un file .xlsx con la struttura dei fogli Excel FAMI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select className="h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
              value={importType} onChange={e => setImportType(e.target.value as any)}>
              <option value="beneficiari">Beneficiari (FAMI_POTENZIALI_BENEFICIARI.xlsx)</option>
              <option value="alloggi">Alloggi (Registro Alloggi FAMI WP3.xlsx)</option>
              <option value="aziende">Aziende (Registro Aziende FAMI WP4.xlsx)</option>
            </select>
            <input ref={fileRef} type="file" accept=".xlsx,.xls"
              className="flex-1 h-10 px-3 py-1.5 rounded-md border border-gray-300 text-sm bg-white file:mr-4 file:rounded file:border-0 file:bg-green-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-green-700" />
            <Button onClick={handleImport} disabled={importing}>
              <FileSpreadsheet size={16} className="mr-2" />
              {importing ? "Importazione..." : "Importa"}
            </Button>
          </div>

          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800">{result.message}</p>
              <p className="text-xs text-green-600 mt-1">Importati: {result.imported} | Errori: {result.errors?.length || 0}</p>
              {result.errors?.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {result.errors.map((e: any, i: number) => (
                    <p key={i} className="text-xs text-red-600">Riga {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download size={18} className="text-blue-600" />Esporta Dati</CardTitle>
          <CardDescription>Scarica i dati in formato Excel o CSV</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TABELLE_EXPORT.map(t => (
              <div key={t.key} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200">
                <div className="flex items-center gap-2">
                  <t.icon size={16} className="text-gray-500" />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => handleExport(t.key, "xlsx")}>Excel</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleExport(t.key, "csv")}>CSV</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
