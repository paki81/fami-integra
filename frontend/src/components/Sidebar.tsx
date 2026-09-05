"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { configApi } from "@/lib/api";
import {
  LayoutDashboard, Users, Home, Building2, GitMerge,
  FileText, Settings, LogOut, Menu, X, Upload, Shield, MapPin, Wrench, HeartHandshake, ChevronDown, ChevronRight, ClipboardList
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["superadmin", "admin", "tutor", "counselor", "viewer"] },
  { href: "/beneficiari", label: "Beneficiari", icon: Users, roles: ["superadmin", "admin", "tutor", "counselor", "viewer"] },
  { href: "/alloggi", label: "Alloggi", icon: Home, roles: ["superadmin", "admin", "tutor", "viewer"] },
  { href: "/aziende", label: "Aziende", icon: Building2, roles: ["superadmin", "admin", "counselor", "viewer"] },
  { href: "/comuni", label: "Comuni", icon: MapPin, roles: ["superadmin", "admin", "tutor", "counselor", "viewer"],
    children: [
      { href: "/servizi-welfare", label: "Servizi Welfare", icon: HeartHandshake, roles: ["superadmin", "admin", "tutor", "counselor", "viewer"] },
      { href: "/servizi-welfare/consultazioni", label: "Consultazioni", icon: ClipboardList, roles: ["superadmin", "admin", "tutor", "counselor"] },
    ]
  },
  { href: "/matching", label: "Abbinamento", icon: GitMerge, roles: ["superadmin", "admin", "tutor", "counselor"] },
  { href: "/report", label: "Report", icon: FileText, roles: ["superadmin", "admin", "tutor", "counselor", "viewer"] },
  { href: "/import", label: "Import/Export", icon: Upload, roles: ["superadmin", "admin"] },
  { href: "/utenti", label: "Utenti", icon: Shield, roles: ["superadmin"] },
  { href: "/strumenti", label: "Strumenti", icon: Wrench, roles: ["superadmin"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [logoUrl, setLogoUrl] = useState<string>("/logo.png");

  useEffect(() => {
    setLogoUrl(configApi.logoUrl());
  }, []);

  const toggleMenu = (href: string) => {
    setExpandedMenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

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
              <img src={logoUrl} alt="FAMI INTEGRA" className="w-full h-full rounded-[6px] object-contain bg-white" />
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
            const hasActiveChild = (item as any).children?.some((c: any) => pathname === c.href || pathname?.startsWith(c.href + "/"));
            const isMatching = item.href === "/matching";
            if (isMatching) {
              return (
                <React.Fragment key={item.href}>
                  <div className="pt-2 pb-1">
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                  </div>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-200"
                        : "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 hover:from-green-100 hover:to-emerald-100 hover:shadow-md hover:shadow-green-100 border border-green-200/60"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                      isActive ? "bg-white/20" : "bg-green-600/10"
                    )}>
                      <item.icon size={16} className={isActive ? "text-white" : "text-green-700"} />
                    </div>
                    {item.label}
                    <span className={cn(
                      "ml-auto w-2 h-2 rounded-full animate-pulse",
                      isActive ? "bg-white/70" : "bg-green-500"
                    )} />
                  </Link>
                  <div className="pt-1 pb-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                  </div>
                </React.Fragment>
              );
            }
            const children = (item as any).children?.filter((c: any) => c.roles.includes(user.ruolo)) || [];
            const isExpanded = expandedMenus[item.href] || hasActiveChild;
            return (
              <React.Fragment key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => { if (children.length > 0) toggleMenu(item.href); setOpen(false); }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive || hasActiveChild
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                  {children.length > 0 && (
                    <span className="ml-auto text-gray-400">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  )}
                </Link>
                {children.length > 0 && isExpanded && children.map((child: any) => {
                  const childActive = pathname === child.href || pathname?.startsWith(child.href + "/");
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 ml-5 pl-4 py-2 rounded-lg text-sm font-medium transition-colors border-l-2",
                        childActive
                          ? "bg-green-50 text-green-700 border-green-500"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 border-gray-200"
                      )}
                    >
                      <child.icon size={16} />
                      {child.label}
                    </Link>
                  );
                })}
              </React.Fragment>
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
          <a
            href="https://github.com/paki81/fami-integra"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            Codice sorgente (AGPL v3)
          </a>
        </div>
      </aside>
    </>
  );
}
