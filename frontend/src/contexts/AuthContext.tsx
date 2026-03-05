"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "@/lib/api";

interface User {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("fami_token");
    const savedUser = localStorage.getItem("fami_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      authApi.me().then(res => {
        setUser(res.data.user);
        localStorage.setItem("fami_user", JSON.stringify(res.data.user));
      }).catch(() => {
        localStorage.removeItem("fami_token");
        localStorage.removeItem("fami_user");
        setToken(null);
        setUser(null);
      });
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem("fami_token", newToken);
    localStorage.setItem("fami_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("fami_token");
    localStorage.removeItem("fami_user");
    setToken(null);
    setUser(null);
  }, []);

  const canEdit = !!user && ["superadmin", "admin", "tutor", "counselor"].includes(user.ruolo);
  const canDelete = !!user && ["superadmin", "admin"].includes(user.ruolo);
  const isAdmin = !!user && ["superadmin", "admin"].includes(user.ruolo);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, canEdit, canDelete, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve essere usato dentro AuthProvider");
  return context;
}
