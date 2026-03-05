"use client";

import { useState, useEffect, useRef } from "react";
import { fotoAlloggiApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Trash2, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface GalleriaFotoProps {
  alloggioId: number;
  canEdit?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function GalleriaFoto({ alloggioId, canEdit = false }: GalleriaFotoProps) {
  const [foto, setFoto] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const loadFoto = () => {
    fotoAlloggiApi.list(alloggioId).then(r => setFoto(r.data)).catch(console.error);
  };

  useEffect(() => { loadFoto(); }, [alloggioId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const res = await fotoAlloggiApi.upload(alloggioId, files);
      toast.success(`${res.data.foto.length} foto caricate con successo`);
      loadFoto();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Errore durante il caricamento delle foto");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const handleDelete = async (id: number) => {
    toast("Vuoi eliminare questa foto?", {
      action: { label: "Elimina", onClick: async () => {
        try {
          await fotoAlloggiApi.delete(id);
          setFoto(prev => prev.filter(f => f.id !== id));
          if (preview) setPreview(null);
          toast.success("Foto eliminata");
        } catch { toast.error("Impossibile eliminare la foto"); }
      }},
      cancel: { label: "Annulla", onClick: () => {} },
      duration: 8000,
    });
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleUpload(e.target.files)} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload size={14} className="mr-1.5" />{uploading ? "Caricamento..." : "Carica foto"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => cameraRef.current?.click()} disabled={uploading}>
            <Camera size={14} className="mr-1.5" />Scatta foto
          </Button>
        </div>
      )}

      {foto.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-300">
          <ImageIcon size={40} className="mb-2" />
          <p className="text-sm">Nessuna foto</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {foto.map(f => (
            <div key={f.id} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-[4/3]">
              <img
                src={`${API_BASE}${f.path}`}
                alt={f.descrizione || "Foto alloggio"}
                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => setPreview(`${API_BASE}${f.path}`)}
                loading="lazy"
              />
              {canEdit && (
                <button
                  onClick={() => handleDelete(f.id)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <Trash2 size={12} />
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white truncate">
                  {f.caricato_da_nome} {f.caricato_da_cognome}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2" onClick={() => setPreview(null)}>
            <X size={24} />
          </button>
          <img src={preview} alt="Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
