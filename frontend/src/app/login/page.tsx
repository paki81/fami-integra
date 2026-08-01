"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, configApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Config {
  ente: string;
  progetto: string;
  sottotitolo: string;
  fondo: string;
  cup: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const router = useRouter();

  useEffect(() => {
    configApi.get().then(res => setConfig(res.data)).catch(() => setConfig(null));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem("fami_token", res.data.token);
      localStorage.setItem("fami_user", JSON.stringify(res.data.user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-green-100">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-[68px] h-[68px] rounded-xl bg-green-700 p-[2px]">
            <img src="/logo.png" alt="FAMI INTEGRA" className="w-full h-full rounded-[10px] object-contain bg-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">FAMI INTEGRA</CardTitle>
            <CardDescription className="mt-1">
              Piattaforma Centro Sportello - Accedi al sistema
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="admin@fami-integra.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
            <div className="text-center mt-2">
              <Link href="/forgot-password" className="text-sm text-green-700 hover:underline">
                Password dimenticata?
              </Link>
            </div>
            {config && (
              <div className="mt-6 space-y-1 text-center">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {config.ente}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed px-4">
                  {config.progetto}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed px-4">
                  {config.sottotitolo}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed px-4">
                  {config.fondo}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed px-4">
                  {config.cup}
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
