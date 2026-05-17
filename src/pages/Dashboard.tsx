import { useMemo } from 'react';
import {
  FileText, TrendingUp, AlertCircle, CheckCircle2,
  Receipt, DollarSign, BarChart3, Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { tickets } = useApp();

  const stats = useMemo(() => {
    const total = tickets.length;
    const procesados = tickets.filter((t) => t.estado === 'procesado' || t.estado === 'revisado').length;
    const errores = tickets.filter((t) => t.estado === 'error').length;
    const pendientes = tickets.filter((t) => t.estado === 'pendiente').length;
    const totalIVA21 = tickets.reduce((s, t) => s + t.iva_21, 0);
    const totalIVA105 = tickets.reduce((s, t) => s + t.iva_105, 0);
    const totalBaseNeta21 = tickets.reduce((s, t) => s + t.base_neta_21, 0);
    const totalBaseNeta105 = tickets.reduce((s, t) => s + t.base_neta_105, 0);
    const totalGeneral = tickets.reduce((s, t) => s + t.total, 0);
    return { total, procesados, errores, pendientes, totalIVA21, totalIVA105, totalBaseNeta21, totalBaseNeta105, totalGeneral };
  }, [tickets]);

  const byMonth = useMemo(() => {
    const map: Record<string, { iva21: number; iva105: number; count: number }> = {};
    tickets.forEach((t) => {
      if (!t.fecha_ticket) return;
      const key = t.fecha_ticket.slice(0, 7);
      if (!map[key]) map[key] = { iva21: 0, iva105: 0, count: 0 };
      map[key].iva21 += t.iva_21;
      map[key].iva105 += t.iva_105;
      map[key].count += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([period, data]) => {
        const [year, month] = period.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        return {
          label: date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
          ...data,
        };
      });
  }, [tickets]);

  const maxIva = Math.max(...byMonth.map((m) => m.iva21 + m.iva105), 1);

  const recentTickets = tickets.slice(0, 5);

  const estadoColor: Record<string, string> = {
    revisado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    procesado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Resumen General</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Tickets Totales"
          value={stats.total.toString()}
          icon={FileText}
          color="blue"
          sub={`${stats.procesados} procesados`}
        />
        <KPICard
          label="IVA 21% Acumulado"
          value={formatCurrency(stats.totalIVA21)}
          icon={DollarSign}
          color="emerald"
          sub={`Base: ${formatCurrency(stats.totalBaseNeta21)}`}
        />
        <KPICard
          label="IVA 10.5% Acumulado"
          value={formatCurrency(stats.totalIVA105)}
          icon={TrendingUp}
          color="teal"
          sub={`Base: ${formatCurrency(stats.totalBaseNeta105)}`}
        />
        <KPICard
          label="Total General"
          value={formatCurrency(stats.totalGeneral)}
          icon={Receipt}
          color="slate"
          sub={`${stats.errores} con errores`}
        />
      </div>

      {/* Status row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusBadge icon={CheckCircle2} label="Revisados" count={tickets.filter(t => t.estado === 'revisado').length} color="emerald" />
        <StatusBadge icon={BarChart3} label="Procesados" count={tickets.filter(t => t.estado === 'procesado').length} color="blue" />
        <StatusBadge icon={Clock} label="Pendientes" count={stats.pendientes} color="amber" />
        <StatusBadge icon={AlertCircle} label="Con errores" count={stats.errores} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-slate-800 dark:text-white font-semibold mb-1">IVA por Mes</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-5">Últimos 6 meses</p>
          {byMonth.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Sin datos</div>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {byMonth.map((m) => {
                const total = m.iva21 + m.iva105;
                const h21 = (m.iva21 / maxIva) * 100;
                const h105 = (m.iva105 / maxIva) * 100;
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '120px' }}>
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all duration-500"
                        style={{ height: `${h21}%` }}
                        title={`IVA 21%: ${formatCurrency(m.iva21)}`}
                      />
                      <div
                        className="w-full bg-teal-400 rounded-t transition-all duration-500"
                        style={{ height: `${h105}%` }}
                        title={`IVA 10.5%: ${formatCurrency(m.iva105)}`}
                      />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">{m.label}</span>
                    <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{m.count}t</span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs hidden lg:block">
                      {formatCurrency(total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-slate-500 dark:text-slate-400 text-xs">IVA 21%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-teal-400" />
              <span className="text-slate-500 dark:text-slate-400 text-xs">IVA 10.5%</span>
            </div>
          </div>
        </div>

        {/* Fiscal summary */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="text-slate-800 dark:text-white font-semibold mb-4">Resumen Fiscal</h3>
          <div className="space-y-4">
            <FiscalRow label="Base Neta 21%" value={stats.totalBaseNeta21} highlight={false} />
            <FiscalRow label="IVA 21%" value={stats.totalIVA21} highlight color="blue" />
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
              <FiscalRow label="Base Neta 10.5%" value={stats.totalBaseNeta105} highlight={false} />
              <FiscalRow label="IVA 10.5%" value={stats.totalIVA105} highlight color="teal" />
            </div>
            <div className="border-t-2 border-slate-200 dark:border-slate-600 pt-3">
              <FiscalRow label="TOTAL IVA" value={stats.totalIVA21 + stats.totalIVA105} highlight color="slate" bold />
              <FiscalRow label="TOTAL GENERAL" value={stats.totalGeneral} highlight color="slate" bold />
            </div>
          </div>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-slate-800 dark:text-white font-semibold">Tickets Recientes</h3>
          <span className="text-slate-500 dark:text-slate-400 text-xs">{tickets.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-left">
                <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Comercio</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider text-right">IVA 21%</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider text-right">IVA 10.5%</th>
                <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider text-right">Total</th>
                <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentTickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{t.razon_social || '-'}</div>
                    <div className="text-slate-400 text-xs">{t.cuit || 'Sin CUIT'}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {t.fecha_ticket ? new Date(t.fecha_ticket + 'T00:00:00').toLocaleDateString('es-AR') : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300 font-mono text-xs">
                    {formatCurrency(t.iva_21)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-700 dark:text-slate-300 font-mono text-xs">
                    {formatCurrency(t.iva_105)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-100 font-mono text-xs">
                    {formatCurrency(t.total)}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', estadoColor[t.estado] || '')}>
                      {t.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; sub?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
    slate: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide leading-tight">{label}</p>
        <div className={cn('p-2 rounded-lg', colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      {sub && <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ icon: Icon, label, count, color }: {
  icon: React.ElementType; label: string; count: number; color: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400',
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400',
    amber: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400',
    red: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400',
  };
  return (
    <div className={cn('rounded-lg border px-4 py-3 flex items-center gap-3', colors[color])}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div>
        <div className="font-bold text-lg leading-none">{count}</div>
        <div className="text-xs opacity-70 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function FiscalRow({ label, value, highlight, color, bold }: {
  label: string; value: number; highlight: boolean; color?: string; bold?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    teal: 'text-teal-600 dark:text-teal-400',
    slate: 'text-slate-800 dark:text-slate-100',
  };
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={cn('text-sm', bold ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400')}>
        {label}
      </span>
      <span className={cn(
        'text-sm font-mono',
        bold ? 'font-bold text-base' : 'font-medium',
        highlight && color ? colorMap[color] : 'text-slate-700 dark:text-slate-300'
      )}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}
