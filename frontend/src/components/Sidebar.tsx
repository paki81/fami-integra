"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Home, Building2, GitMerge,
  FileText, Settings, LogOut, Menu, X, Upload, Shield, MapPin
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["superadmin", "admin", "tutor", "counselor", "viewer"] },
  { href: "/beneficiari", label: "Beneficiari", icon: Users, roles: ["superadmin", "admin", "tutor", "counselor", "viewer"] },
  { href: "/alloggi", label: "Alloggi", icon: Home, roles: ["superadmin", "admin", "tutor", "viewer"] },
  { href: "/aziende", label: "Aziende", icon: Building2, roles: ["superadmin", "admin", "counselor", "viewer"] },
  { href: "/comuni", label: "Comuni", icon: MapPin, roles: ["superadmin", "admin", "tutor", "counselor", "viewer"] },
  { href: "/matching", label: "Abbinamento", icon: GitMerge, roles: ["superadmin", "admin", "tutor", "counselor"] },
  { href: "/report", label: "Report", icon: FileText, roles: ["superadmin", "admin", "tutor", "counselor", "viewer"] },
  { href: "/import", label: "Import/Export", icon: Upload, roles: ["superadmin", "admin"] },
  { href: "/utenti", label: "Utenti", icon: Shield, roles: ["superadmin"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const filtered = navItems.filter((item) => item.roles.includes(user.ruolo));

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white rounded-md p-2 shadow-md border border-gray-200"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-green-700 p-[2px]">
              <img src="/logo.png" alt="FAMI INTEGRA" className="w-full h-full rounded-[6px] object-contain bg-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">FAMI INTEGRA</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Centro Sportello</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filtered.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-800 text-xs font-bold">
              {user.nome?.[0]}{user.cognome?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.nome} {user.cognome}</p>
              <p className="text-xs text-gray-500 capitalize">{user.ruolo}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Esci
          </button>
        </div>
      </aside>
    </>
  );
}
