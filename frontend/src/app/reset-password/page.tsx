"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [nome, setNome] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    authApi.verifyResetToken(token)
      .then((res) => { setValid(true); setNome(res.data.nome); })
      .catch(() => { setValid(false); })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("La password deve essere di almeno 8 caratteri"); return; }
    if (password !== confirmPassword) { setError("Le password non corrispondono"); return; }
    setSaving(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Errore durante il ripristino. Il link potrebbe essere scaduto.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <p className="text-gray-500">Verifica in corso...</p>
      </div>
    );
  }

  if (!token || !valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <CardTitle className="text-xl text-gray-900">Link non valido</CardTitle>
            <CardDescription>
              Il link di ripristino non è valido o è scaduto. Richiedi un nuovo link.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <Link href="/forgot-password">
              <Button className="bg-green-700 hover:bg-green-800 w-full">Richiedi nuovo link</Button>
            </Link>
            <Link href="/login" className="text-sm text-green-700 hover:underline inline-flex items-center gap-1">
              <ArrowLeft size={14} />Torna al login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-3">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <CardTitle className="text-xl text-gray-900">Password reimpostata</CardTitle>
            <CardDescription>
              La tua password è stata aggiornata con successo. Ora puoi accedere con la nuova password.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login">
              <Button className="bg-green-700 hover:bg-green-800 w-full">Vai al login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Lock className="text-green-700" size={24} />
          </div>
          <CardTitle className="text-xl text-gray-900">Reimposta password</CardTitle>
          <CardDescription>
            Ciao <strong>{nome}</strong>, inserisci la tua nuova password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Nuova password</label>
              <Input
                type="password"
                placeholder="Minimo 8 caratteri"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Conferma password</label>
              <Input
                type="password"
                placeholder="Ripeti la password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {password.length > 0 && password.length < 8 && (
              <p className="text-xs text-orange-600">La password deve essere di almeno 8 caratteri</p>
            )}
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-red-600">Le password non corrispondono</p>
            )}
            <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={saving}>
              {saving ? "Salvataggio..." : "Reimposta password"}
            </Button>
            <div className="text-center">
              <Link href="/login" className="text-sm text-green-700 hover:underline inline-flex items-center gap-1">
                <ArrowLeft size={14} />Torna al login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <p className="text-gray-500">Caricamento...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
