import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload as UploadIcon, X, FileImage, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Ticket, OCRResult } from '../lib/types';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface FileEntry {
  id: string;
  file: File;
  preview: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  result?: Partial<Ticket>;
  error?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function processFileOCR(file: File): Promise<OCRResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const mimeType = file.type || 'image/jpeg';

        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token || SUPABASE_ANON_KEY;

        const res = await fetch(`${SUPABASE_URL}/functions/v1/ocr-ticket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error en OCR');
        }

        const data: OCRResult = await res.json();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsDataURL(file);
  });
}

async function uploadFileToStorage(file: File): Promise<string> {
  const bucket = 'tickets-uploads';
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user.id ?? 'public';
  const filename = `${crypto.randomUUID()}-${file.name}`;
  const path = `tickets/${userId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('Error subiendo archivo a Storage:', uploadError.message || uploadError);
    throw uploadError;
  }

  const { data: publicUrlData, error: publicUrlError } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  if (publicUrlError) {
    console.error('Error obteniendo URL pública:', publicUrlError.message || publicUrlError);
    throw publicUrlError;
  }

  return publicUrlData.publicUrl;
}

export default function Upload({ onNavigate }: { onNavigate: (page: 'dashboard' | 'upload' | 'tickets') => void }) {
  const { addTickets, user } = useApp();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter((f) =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    const entries: FileEntry[] = valid.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      status: 'idle',
    }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const processAll = async () => {
    if (files.length === 0) return;
    setProcessing(true);

    const results: Array<Omit<Ticket, 'id' | 'created_at' | 'updated_at'>> = [];

    for (const entry of files) {
      setFiles((prev) =>
        prev.map((f) => f.id === entry.id ? { ...f, status: 'processing' } : f)
      );

      try {
        const ocr = await processFileOCR(entry.file);

        let imageUrl: string;
        try {
          imageUrl = await uploadFileToStorage(entry.file);
        } catch (storageError) {
          console.error('Error subiendo imagen a Storage:', storageError);
          throw new Error('No se pudo subir la imagen a Storage. Revisa la consola y configura permisos del bucket.');
        }

        // Crear datos para insertar en Supabase (sin id ni timestamps)
        const ticketData: Omit<Ticket, 'id' | 'created_at' | 'updated_at'> = {
          sesion_id: null,
          user_id: user?.id ?? null,
          fecha_ticket: ocr.fecha_ticket || null,
          numero_ticket: ocr.numero_ticket || '',
          numero_z: ocr.numero_z || '',
          cuit: ocr.cuit || '',
          razon_social: ocr.razon_social || entry.file.name.replace(/\.[^.]+$/, ''),
          tipo_comprobante: ocr.tipo_comprobante || 'Ticket Z',
          base_neta_21: ocr.base_neta_21 || 0,
          iva_21: ocr.iva_21 || 0,
          base_neta_105: ocr.base_neta_105 || 0,
          iva_105: ocr.iva_105 || 0,
          otros_impuestos: ocr.otros_impuestos || 0,
          total: ocr.total || 0,
          imagen_url: imageUrl,
          estado: (ocr.confianza_ocr || 0) < 50 ? 'error' : 'procesado',
          confianza_ocr: ocr.confianza_ocr || 0,
          datos_raw: { texto_raw: ocr.texto_raw },
          notas: (ocr.confianza_ocr || 0) < 50 ? 'Baja confianza OCR - verificar manualmente' : '',
        };

        // Crear un ticket temporal para mostrar en la UI
        const tempTicket: Ticket = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...ticketData,
        };

        results.push(ticketData);
        setFiles((prev) =>
          prev.map((f) => f.id === entry.id ? { ...f, status: 'done', result: tempTicket } : f)
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Error' }
              : f
          )
        );
      }
    }

    if (results.length > 0) {
      addTickets(results as Ticket[]);
    }

    setProcessing(false);
    setProcessed(true);
  };

  const reset = () => {
    setFiles([]);
    setProcessed(false);
  };

  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cargar Tickets</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Subí fotos o PDFs de tickets Z para extracción automática con IA
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-800 dark:text-blue-300 text-sm font-medium">Procesamiento con IA</p>
          <p className="text-blue-600 dark:text-blue-400 text-xs mt-0.5">
            El sistema extrae automáticamente fecha, CUIT, razón social, IVA 21%, IVA 10.5%, bases netas y totales de tickets argentinos.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      {!processed && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200',
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={onInputChange}
          />
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors',
            isDragging ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-700'
          )}>
            <UploadIcon className={cn('w-8 h-8', isDragging ? 'text-blue-600' : 'text-slate-400')} />
          </div>
          <p className="text-slate-700 dark:text-slate-200 font-semibold text-lg">
            {isDragging ? 'Soltá los archivos aquí' : 'Arrastrá tus tickets aquí'}
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
            o hacé clic para seleccionar archivos
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-3">
            JPG, PNG, WEBP, PDF — hasta 10MB por archivo
          </p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-white text-sm">
              {files.length} archivo{files.length !== 1 ? 's' : ''} seleccionado{files.length !== 1 ? 's' : ''}
            </span>
            {!processing && !processed && (
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="text-slate-400 hover:text-red-500 text-xs transition-colors"
              >
                Limpiar todo
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-72 overflow-y-auto">
            {files.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 px-5 py-3">
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                  {entry.preview ? (
                    <img src={entry.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 dark:text-slate-200 text-sm font-medium truncate">{entry.file.name}</p>
                  <p className="text-slate-400 text-xs">
                    {(entry.file.size / 1024).toFixed(0)} KB
                    {entry.result?.razon_social && ` · ${entry.result.razon_social}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {entry.status === 'idle' && (
                    <span className="text-slate-400 text-xs">Listo</span>
                  )}
                  {entry.status === 'processing' && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {entry.status === 'done' && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">{entry.result?.confianza_ocr}%</span>
                    </div>
                  )}
                  {entry.status === 'error' && (
                    <div className="flex items-center gap-1 text-red-500" title={entry.error}>
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs">Error</span>
                    </div>
                  )}

                  {!processing && entry.status !== 'processing' && (
                    <button
                      onClick={() => removeFile(entry.id)}
                      className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results summary */}
      {processed && (
        <div className={cn(
          'rounded-xl border p-5 flex items-start gap-4',
          errorCount === 0
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        )}>
          <CheckCircle2 className={cn('w-5 h-5 mt-0.5 flex-shrink-0', errorCount === 0 ? 'text-emerald-600' : 'text-amber-600')} />
          <div>
            <p className={cn('font-semibold', errorCount === 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300')}>
              {doneCount} ticket{doneCount !== 1 ? 's' : ''} procesado{doneCount !== 1 ? 's' : ''} correctamente
            </p>
            {errorCount > 0 && (
              <p className="text-amber-600 dark:text-amber-400 text-sm mt-0.5">
                {errorCount} con errores — podés corregirlos manualmente en "Mis Tickets"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!processed ? (
          <>
            <button
              onClick={processAll}
              disabled={files.length === 0 || processing}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150',
                files.length === 0 || processing
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md active:scale-95'
              )}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Procesar con IA
                </>
              )}
            </button>
            {files.length > 0 && !processing && (
              <button
                onClick={() => inputRef.current?.click()}
                className="px-4 py-2.5 rounded-lg font-medium text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Agregar más
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => onNavigate('tickets')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
            >
              Ver y editar tickets
            </button>
            <button
              onClick={reset}
              className="px-4 py-2.5 rounded-lg font-medium text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cargar más tickets
            </button>
          </>
        )}
      </div>
    </div>
  );
}
