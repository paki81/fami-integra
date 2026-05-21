export type ConsultazioneStatus = "bozza" | "finalizzata";

export interface ConsultazioneItem {
  categoria: string;
  titolo: string;
  contenuto: string;
  fonte: string | null;
}

export interface Consultazione {
  id: number;
  beneficiario_id: number;
  operatore_id: number;
  nome: string;
  cognome: string;
  codice_fiscale: string | null;
  data_consulto: string;
  note: string | null;
  items: ConsultazioneItem[];
  status: ConsultazioneStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  operatore_nome?: string | null;
  operatore_cognome?: string | null;
  operatore_email?: string | null;
  beneficiario_codice_id?: string | null;
}

export interface ConsultazioneListResponse {
  data: Consultazione[];
  total: number;
  page: number;
  limit: number;
}

export interface ConsultazionePayload {
  beneficiario_id: number;
  nome: string;
  cognome: string;
  codice_fiscale?: string | null;
  data_consulto: string;
  note?: string | null;
  items: ConsultazioneItem[];
  status?: ConsultazioneStatus;
}
