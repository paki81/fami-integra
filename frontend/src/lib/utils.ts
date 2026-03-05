import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  if (score >= 40) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
}

export function getStatoColor(stato: string): string {
  switch (stato) {
    case "In Corso": return "bg-blue-100 text-blue-800";
    case "Abbinato Alloggio": return "bg-purple-100 text-purple-800";
    case "Abbinato Lavoro": return "bg-indigo-100 text-indigo-800";
    case "Abbinato Entrambi": return "bg-green-100 text-green-800";
    case "Completato": return "bg-emerald-100 text-emerald-800";
    case "Annullato": return "bg-red-100 text-red-800";
    case "Disponibile": return "bg-green-100 text-green-800";
    case "Occupato": return "bg-red-100 text-red-800";
    case "In trattativa": return "bg-yellow-100 text-yellow-800";
    default: return "bg-gray-100 text-gray-800";
  }
}
