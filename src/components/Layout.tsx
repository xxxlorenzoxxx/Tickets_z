import { useState, type ReactNode } from 'react';
import { LayoutDashboard, Upload, FileSpreadsheet, Moon, Sun, Menu, X, FileText, ChevronRight, LogOut, UserCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

type Page = 'dashboard' | 'upload' | 'tickets';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload' as Page, label: 'Cargar Tickets', icon: Upload },
  { id: 'tickets' as Page, label: 'Mis Tickets', icon: FileSpreadsheet },
];

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { darkMode, toggleDarkMode, user, signOut } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userEmail = user?.email ?? 'Usuario';
  const userInitial = userEmail.slice(0, 1).toUpperCase();

  return (
    <div className={cn('min-h-screen flex', darkMode ? 'dark' : '')}>
      {/* Sidebar overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-30 h-full w-64 flex flex-col transition-transform duration-300',
          'bg-slate-900 dark:bg-slate-950 border-r border-slate-800',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-semibold text-sm leading-tight block">TicketZ</span>
            <span className="text-slate-400 text-xs">Gestión Fiscal Argentina</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider px-3 mb-3">Principal</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onNavigate(id); setSidebarOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                currentPage === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {currentPage === id && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-lg px-3 py-3 flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-slate-300 text-xs font-medium truncate" title={userEmail}>{userEmail}</p>
              <p className="text-slate-500 text-xs mt-0.5">Sesión iniciada</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 h-16 flex items-center gap-4 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-slate-800 dark:text-white font-semibold text-base">
              {navItems.find((n) => n.id === currentPage)?.label}
            </h1>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={signOut}
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold" title={userEmail}>
            {userInitial}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
