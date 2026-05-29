import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Tickets from './pages/Tickets';
import Auth from './pages/Auth';
import { useApp } from './context/AppContext';
import { Loader2 } from 'lucide-react';

type Page = 'dashboard' | 'upload' | 'tickets';

function AppInner() {
  const { user, isAuthLoading } = useApp();
  const [page, setPage] = useState<Page>('dashboard');

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'upload' && <Upload onNavigate={setPage} />}
      {page === 'tickets' && <Tickets />}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
