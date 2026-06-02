import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn, Mail, UserPlus, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'register' | 'reset' | 'update-password';

export default function Auth() {
  const { darkMode, toggleDarkMode, signIn, signUp, resetPassword } = useApp();
  const [mode, setMode] = useState<AuthMode>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'update-password' ? 'update-password' : 'login';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const result = await signIn(email.trim(), password);
        if (result.error) setError(result.error);
      } else if (mode === 'register') {
        const result = await signUp(email.trim(), password);
        if (result.error) {
          setError(result.error);
        } else if ('needsConfirmation' in result && result.needsConfirmation) {
          setMessage('Registro creado. Revisá tu email para confirmar la cuenta antes de iniciar sesión.');
        }
      } else if (mode === 'reset') {
        const result = await resetPassword(email.trim());
        if (result.error) {
          setError(result.error);
        } else {
          setMessage('Email de recuperación enviado. Revisá tu inbox para cambiar tu contraseña.');
        }
      } else if (mode === 'update-password') {
        if (newPassword !== confirmPassword) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setError(error.message);
        } else {
          setMessage('Contraseña actualizada correctamente. Iniciando sesión...');
          setTimeout(() => window.location.href = '/', 2000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-8', darkMode ? 'dark' : '')}>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white">
            <LockKeyhole className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TicketZ</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'login'
              ? 'Ingresá para ver tus tickets'
              : mode === 'register'
              ? 'Creá tu cuenta para cargar tickets'
              : mode === 'reset'
              ? 'Recuperá tu contraseña'
              : 'Establecé una nueva contraseña'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
          {mode !== 'update-password' && (
            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-5">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={cn(
                  'h-9 rounded-md text-sm font-medium transition-colors',
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={cn(
                  'h-9 rounded-md text-sm font-medium transition-colors',
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                Registrarse
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            {mode !== 'update-password' && (
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="tu@email.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </label>
            )}

            {/* Password field (for login/register/reset) */}
            {(mode === 'login' || mode === 'register') && (
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña</span>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>
            )}

            {/* New password field (for update-password) */}
            {mode === 'update-password' && (
              <>
                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nueva contraseña</span>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((value) => !value)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar contraseña</span>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={6}
                      placeholder="Confirmar nueva contraseña"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </label>
              </>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-sm font-semibold transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : mode === 'register' ? (
                <UserPlus className="w-4 h-4" />
              ) : mode === 'reset' ? (
                <Mail className="w-4 h-4" />
              ) : (
                <LockKeyhole className="w-4 h-4" />
              )}
              {mode === 'login'
                ? 'Ingresar'
                : mode === 'register'
                ? 'Crear cuenta'
                : mode === 'reset'
                ? 'Enviar email'
                : 'Cambiar contraseña'}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between gap-3">
            {mode === 'update-password' ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Volver a iniciar sesión
              </button>
            ) : mode === 'reset' ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Volver al login
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {mode === 'login' ? 'Crear cuenta nueva' : 'Ya tengo cuenta'}
                </button>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {darkMode ? 'Modo claro' : 'Modo oscuro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
