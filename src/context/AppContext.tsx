import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Ticket } from '../lib/types';
import { supabase } from '../lib/supabase';

interface AppContextValue {
  tickets: Ticket[];
  setTickets: (tickets: Ticket[]) => void;
  addTickets: (tickets: Ticket[]) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);

  // Cargar tickets de Supabase al montar
  useEffect(() => {
    const loadTickets = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error cargando tickets:', error);
          setTickets([]);
        } else {
          setTickets(data || []);
        }
      } catch (err) {
        console.error('Error en loadTickets:', err);
        setTickets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const addTickets = async (newTickets: Ticket[]) => {
    try {
      // Preparar datos para insertar (sin id ni timestamps que genera BD)
      const toInsert = newTickets.map(({ id, created_at, updated_at, ...rest }) => ({
        ...rest,
      }));

      const { data, error } = await supabase
        .from('tickets')
        .insert(toInsert)
        .select();

      if (error) {
        console.error('Error insertando tickets:', error);
        // Aún así actualizar el estado local para que la app sea responsive
        setTickets((prev) => [...newTickets, ...prev]);
      } else if (data) {
        // Actualizar con los datos de la BD (que incluyen id, timestamps reales)
        setTickets((prev) => [...data, ...prev]);
      }
    } catch (err) {
      console.error('Error en addTickets:', err);
      setTickets((prev) => [...newTickets, ...prev]);
    }
  };

  const updateTicket = async (id: string, updates: Partial<Ticket>) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error actualizando ticket:', error);
      } else {
        // Actualizar el estado local
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
        );
      }
    } catch (err) {
      console.error('Error en updateTicket:', err);
    }
  };

  const deleteTicket = async (id: string) => {
    try {
      const ticket = tickets.find((t) => t.id === id);
      if (ticket?.imagen_url) {
        try {
          const bucket = 'tickets-uploads';
          const publicPrefix = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
          const url = new URL(ticket.imagen_url);
          let path = '';

          if (ticket.imagen_url.startsWith(publicPrefix)) {
            path = ticket.imagen_url.replace(publicPrefix, '');
          } else if (url.pathname.includes(`/storage/v1/object/public/${bucket}/`)) {
            path = url.pathname.split(`/storage/v1/object/public/${bucket}/`)[1];
          }

          if (path) {
            const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
            if (storageError) {
              console.error('Error borrando imagen de Storage:', storageError);
            }
          }
        } catch (storageErr) {
          console.error('Error parseando imagen_url para borrar de Storage:', storageErr);
        }
      }

      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando ticket:', error);
      } else {
        setTickets((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error('Error en deleteTicket:', err);
    }
  };

  const toggleDarkMode = () => setDarkMode((v) => !v);

  return (
    <AppContext.Provider
      value={{ tickets, setTickets, addTickets, updateTicket, deleteTicket, darkMode, toggleDarkMode, isLoading, setIsLoading }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
