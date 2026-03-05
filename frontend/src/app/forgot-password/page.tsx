"use client";

import { useState } from "react";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Inserisci il tuo indirizzo email"); return; }
    setError(""); setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Errore durante l'invio. Riprova più tardi.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Mail className="text-green-700" size={24} />
          </div>
          <CardTitle className="text-xl text-gray-900">Password dimenticata</CardTitle>
          <CardDescription>
            {sent
              ? "Controlla la tua casella di posta"
              : "Inserisci l'email associata al tuo account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Se l&apos;indirizzo <strong>{email}</strong> è registrato nel sistema,
                riceverai un&apos;email con le istruzioni per reimpostare la password.
              </p>
              <p className="text-xs text-gray-400">
                Il link sarà valido per 1 ora. Controlla anche la cartella spam.
              </p>
              <Link href="/login">
                <Button variant="outline" className="mt-4 w-full">
                  <ArrowLeft size={16} className="mr-2" />Torna al login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
                  {error}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                <Input
                  type="email"
                  placeholder="nome@esempio.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={loading}>
                {loading ? "Invio in corso..." : "Invia istruzioni"}
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-green-700 hover:underline inline-flex items-center gap-1">
                  <ArrowLeft size={14} />Torna al login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
