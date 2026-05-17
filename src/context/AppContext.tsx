import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Ticket } from '../lib/types';
import { mockTickets } from '../lib/mockData';

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
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const addTickets = (newTickets: Ticket[]) => {
    setTickets((prev) => [...newTickets, ...prev]);
  };

  const updateTicket = (id: string, updates: Partial<Ticket>) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    );
  };

  const deleteTicket = (id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
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
