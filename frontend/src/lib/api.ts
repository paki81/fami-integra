import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("fami_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("fami_token");
      localStorage.removeItem("fami_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
  changePassword: (oldPassword: string, newPassword: string) => api.post("/auth/change-password", { oldPassword, newPassword }),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) => api.post("/auth/reset-password", { token, newPassword }),
  verifyResetToken: (token: string) => api.get(`/auth/verify-reset-token/${token}`),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
  beneficiariPerComune: () => api.get("/dashboard/beneficiari-per-comune"),
  usciteProssime: () => api.get("/dashboard/uscite-prossime"),
  matchingRecenti: () => api.get("/dashboard/matching-recenti"),
};

// Beneficiari
export const beneficiariApi = {
  list: (params?: Record<string, any>) => api.get("/beneficiari", { params }),
  get: (id: number) => api.get(`/beneficiari/${id}`),
  create: (data: any) => api.post("/beneficiari", data),
  update: (id: number, data: any) => api.put(`/beneficiari/${id}`, data),
  delete: (id: number) => api.delete(`/beneficiari/${id}`),
  comuni: () => api.get("/beneficiari/comuni"),
};

// Alloggi
export const alloggiApi = {
  list: (params?: Record<string, any>) => api.get("/alloggi", { params }),
  get: (id: number) => api.get(`/alloggi/${id}`),
  create: (data: any) => api.post("/alloggi", data),
  update: (id: number, data: any) => api.put(`/alloggi/${id}`, data),
  delete: (id: number) => api.delete(`/alloggi/${id}`),
  comuni: () => api.get("/alloggi/comuni"),
};

// Aziende
export const aziendeApi = {
  list: (params?: Record<string, any>) => api.get("/aziende", { params }),
  get: (id: number) => api.get(`/aziende/${id}`),
  create: (data: any) => api.post("/aziende", data),
  update: (id: number, data: any) => api.put(`/aziende/${id}`, data),
  delete: (id: number) => api.delete(`/aziende/${id}`),
  comuni: () => api.get("/aziende/comuni"),
  settori: () => api.get("/aziende/settori"),
};

// Matching
export const matchingApi = {
  suggerisciAlloggi: (idBen: number) => api.get(`/matching/suggerisci-alloggi/${idBen}`),
  suggerisciAziende: (idBen: number) => api.get(`/matching/suggerisci-aziende/${idBen}`),
  creaMatchAlloggio: (data: any) => api.post("/matching/alloggi", data),
  creaMatchLavoro: (data: any) => api.post("/matching/lavoro", data),
  listaMatchAlloggi: (params?: Record<string, any>) => api.get("/matching/alloggi", { params }),
  listaMatchLavoro: (params?: Record<string, any>) => api.get("/matching/lavoro", { params }),
  updateMatchAlloggio: (id: number, data: any) => api.put(`/matching/alloggi/${id}`, data),
  updateMatchLavoro: (id: number, data: any) => api.put(`/matching/lavoro/${id}`, data),
  annullaMatchAlloggio: (id: number) => api.patch(`/matching/alloggi/${id}/annulla`),
  annullaMatchLavoro: (id: number) => api.patch(`/matching/lavoro/${id}/annulla`),
  deleteMatchAlloggio: (id: number) => api.delete(`/matching/alloggi/${id}`),
  deleteMatchLavoro: (id: number) => api.delete(`/matching/lavoro/${id}`),
};

// Utenti
export const utentiApi = {
  list: () => api.get("/utenti"),
  create: (data: any) => api.post("/utenti", data),
  update: (id: number, data: any) => api.put(`/utenti/${id}`, data),
  delete: (id: number) => api.delete(`/utenti/${id}`),
};

// Import/Export
export const importApi = {
  importBeneficiari: (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return api.post("/import/beneficiari", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  importAlloggi: (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return api.post("/import/alloggi", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  importAziende: (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return api.post("/import/aziende", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  exportExcel: (tabella: string) => api.get(`/import/export/${tabella}`, { responseType: "blob" }),
  exportCsv: (tabella: string) => api.get(`/import/export-csv/${tabella}`, { responseType: "blob" }),
};

// Audit
export const auditApi = {
  list: (params?: Record<string, any>) => api.get("/audit", { params }),
};

// Contratti
export const contrattiApi = {
  list: (params?: Record<string, any>) => api.get("/contratti", { params }),
  create: (data: any) => api.post("/contratti", data),
  update: (id: number, data: any) => api.put(`/contratti/${id}`, data),
  delete: (id: number) => api.delete(`/contratti/${id}`),
};

// Comuni italiani
export const comuniApi = {
  search: (q: string) => api.get("/comuni/search", { params: { q, limit: 15 } }),
};

// Comuni Progetto
export const comuniProgettoApi = {
  list: () => api.get("/comuni-progetto"),
  nomi: () => api.get("/comuni-progetto/nomi"),
  get: (id: number) => api.get(`/comuni-progetto/${id}`),
  create: (data: any) => api.post("/comuni-progetto", data),
  update: (id: number, data: any) => api.put(`/comuni-progetto/${id}`, data),
  delete: (id: number) => api.delete(`/comuni-progetto/${id}`),
};

// Geocoding & Mappa
export const geocodingApi = {
  geocodeAlloggio: (id: number) => api.post(`/geocoding/alloggi/${id}`),
  geocodeAzienda: (id: number) => api.post(`/geocoding/aziende/${id}`),
  geocodeTuttiAlloggi: () => api.post("/geocoding/alloggi-tutti"),
  geocodeTutteAziende: () => api.post("/geocoding/aziende-tutti"),
  mappaAlloggi: () => api.get("/geocoding/mappa/alloggi"),
  mappaAziende: () => api.get("/geocoding/mappa/aziende"),
};

// Foto Alloggi
export const fotoAlloggiApi = {
  list: (alloggioId: number) => api.get(`/foto-alloggi/${alloggioId}`),
  upload: (alloggioId: number, files: FileList, descrizione?: string) => {
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append("foto", f));
    if (descrizione) fd.append("descrizione", descrizione);
    return api.post(`/foto-alloggi/${alloggioId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  delete: (id: number) => api.delete(`/foto-alloggi/foto/${id}`),
};

// Registro Note
export const registroNoteApi = {
  list: (entita: string, entitaId: number) => api.get(`/registro-note/${entita}/${entitaId}`),
  create: (entita: string, entitaId: number, testo: string) => api.post(`/registro-note/${entita}/${entitaId}`, { testo }),
  update: (id: number, testo: string) => api.put(`/registro-note/${id}`, { testo }),
  delete: (id: number) => api.delete(`/registro-note/${id}`),
};

// Strumenti (solo superadmin)
export const strumentiApi = {
  conteggi: () => api.get('/strumenti/conteggi'),
  svuota: (tabella: string, conferma: string) => api.post(`/strumenti/svuota/${tabella}`, { conferma }),
  creaBackup: () => api.post('/strumenti/backup'),
  listaBackup: () => api.get('/strumenti/backup/lista'),
  downloadBackup: (filename: string) => `${api.defaults.baseURL}/strumenti/backup/download/${filename}`,
  eliminaBackup: (filename: string) => api.delete(`/strumenti/backup/${filename}`),
  ripristino: (data: FormData) => api.post('/strumenti/ripristino', data, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 }),
  ripristinoDaFile: (filename: string, conferma: string) => api.post('/strumenti/ripristino', { filename, conferma }),
};

// Servizi Welfare
export const serviziWelfareApi = {
  list: (params?: Record<string, any>) => api.get("/servizi-welfare", { params }),
  get: (id: number) => api.get(`/servizi-welfare/${id}`),
  create: (data: any) => api.post("/servizi-welfare", data),
  update: (id: number, data: any) => api.put(`/servizi-welfare/${id}`, data),
  delete: (id: number) => api.delete(`/servizi-welfare/${id}`),
  categorie: () => api.get("/servizi-welfare/categorie"),
  comuni: (params?: Record<string, any>) => api.get("/servizi-welfare/comuni", { params }),
  perComune: (comune: string, params?: Record<string, any>) => api.get(`/servizi-welfare/per-comune/${encodeURIComponent(comune)}`, { params }),
  mappa: () => api.get("/servizi-welfare/mappa"),
  importa: (file: File, modalita: string = 'aggiungi') => {
    const fd = new FormData(); fd.append("file", file); fd.append("modalita", modalita);
    return api.post("/servizi-welfare/importa", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

// Consultazioni Welfare
export const consultazioniWelfareApi = {
  list: (params?: Record<string, any>) => api.get("/welfare/consultazioni", { params }),
  get: (id: number) => api.get(`/welfare/consultazioni/${id}`),
  create: (data: any) => api.post("/welfare/consultazioni", data),
  update: (id: number, data: any) => api.put(`/welfare/consultazioni/${id}`, data),
  delete: (id: number) => api.delete(`/welfare/consultazioni/${id}`),
  pdf: (id: number) => api.get(`/welfare/consultazioni/${id}/pdf`, { responseType: "blob" }),
};

export default api;
