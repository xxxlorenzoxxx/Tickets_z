import { useState, useMemo } from 'react';
import { Search, Filter, Download, Trash2, CreditCard as Edit2, CheckCircle2, X, Save, AlertCircle, Clock, FileCheck, ChevronDown, Import as SortAsc } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Ticket, TicketEstado } from '../lib/types';
import { formatCurrency, formatDate, formatCUIT, validateCUIT, cn } from '../lib/utils';
import { exportToExcel } from '../lib/exportExcel';

type SortKey = 'fecha_ticket' | 'razon_social' | 'total' | 'estado' | 'created_at';
type SortDir = 'asc' | 'desc';

const ESTADO_CONFIG: Record<TicketEstado, { label: string; icon: React.ElementType; cls: string }> = {
  revisado: { label: 'Revisado', icon: FileCheck, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  procesado: { label: 'Procesado', icon: CheckCircle2, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  error: { label: 'Error OCR', icon: AlertCircle, cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  pendiente: { label: 'Pendiente', icon: Clock, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
};

export default function Tickets() {
  const { tickets, updateTicket, deleteTicket } = useApp();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<TicketEstado | 'todos'>('todos');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Ticket>>({});
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...tickets];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.razon_social.toLowerCase().includes(q) ||
          t.cuit.includes(q) ||
          t.numero_ticket.includes(q) ||
          t.numero_z.includes(q)
      );
    }
    if (filterEstado !== 'todos') {
      result = result.filter((t) => t.estado === filterEstado);
    }
    result.sort((a, b) => {
      let va: string | number = a[sortKey] as string | number ?? '';
      let vb: string | number = b[sortKey] as string | number ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [tickets, search, filterEstado, sortKey, sortDir]);

  const totals = useMemo(() => ({
    iva21: filtered.reduce((s, t) => s + t.iva_21, 0),
    iva105: filtered.reduce((s, t) => s + t.iva_105, 0),
    total: filtered.reduce((s, t) => s + t.total, 0),
  }), [filtered]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const startEdit = (ticket: Ticket) => {
    setEditingId(ticket.id);
    setEditValues({ ...ticket });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateTicket(editingId, { ...editValues, estado: 'revisado' });
    setEditingId(null);
    setEditValues({});
  };

  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const handleExport = async () => {
    setExporting(true);
    const toExport = selected.size > 0 ? filtered.filter((t) => selected.has(t.id)) : filtered;
    await exportToExcel(toExport);
    setExporting(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  };

  const cuitValid = (cuit: string) => !cuit || validateCUIT(cuit);

  return (
    <div className="space-y-5 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Mis Tickets</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{tickets.length} tickets en total</p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
              filtered.length === 0
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md active:scale-95'
            )}
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exportando...' : `Exportar Excel${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por comercio, CUIT, N° ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as TicketEstado | 'todos')}
            className="pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="todos">Todos los estados</option>
            <option value="revisado">Revisado</option>
            <option value="procesado">Procesado</option>
            <option value="pendiente">Pendiente</option>
            <option value="error">Error OCR</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Totals bar */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-4 py-2.5">
            <p className="text-blue-600 dark:text-blue-400 text-xs font-medium">IVA 21% ({filtered.length} tickets)</p>
            <p className="text-blue-800 dark:text-blue-200 font-bold text-sm mt-0.5 font-mono">{formatCurrency(totals.iva21)}</p>
          </div>
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-lg px-4 py-2.5">
            <p className="text-teal-600 dark:text-teal-400 text-xs font-medium">IVA 10.5%</p>
            <p className="text-teal-800 dark:text-teal-200 font-bold text-sm mt-0.5 font-mono">{formatCurrency(totals.iva105)}</p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5">
            <p className="text-slate-600 dark:text-slate-300 text-xs font-medium">Total General</p>
            <p className="text-slate-800 dark:text-slate-100 font-bold text-sm mt-0.5 font-mono">{formatCurrency(totals.total)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <SortTh label="Fecha" sortKey="fecha_ticket" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Comercio / CUIT" sortKey="razon_social" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-3 py-3 text-left text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">N° Ticket / Z</th>
                <th className="px-3 py-3 text-right text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Base 21%</th>
                <th className="px-3 py-3 text-right text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">IVA 21%</th>
                <th className="px-3 py-3 text-right text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">Base 10.5%</th>
                <th className="px-3 py-3 text-right text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">IVA 10.5%</th>
                <SortTh label="Total" sortKey="total" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                <SortTh label="Estado" sortKey="estado" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider">OCR</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    No hay tickets que coincidan con la búsqueda
                  </td>
                </tr>
              )}
              {filtered.map((ticket) => {
                const isEditing = editingId === ticket.id;
                const ev = editValues;
                const cfg = ESTADO_CONFIG[ticket.estado];
                const IconE = cfg.icon;

                return (
                  <tr
                    key={ticket.id}
                    className={cn(
                      'transition-colors',
                      selected.has(ticket.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20',
                      isEditing ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(ticket.id)}
                        onChange={() => toggleSelect(ticket.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Fecha */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="date"
                          value={ev.fecha_ticket || ''}
                          onChange={(e) => setEditValues({ ...ev, fecha_ticket: e.target.value })}
                          className="w-32 px-2 py-1 text-xs border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300">{formatDate(ticket.fecha_ticket)}</span>
                      )}
                    </td>

                    {/* Comercio */}
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={ev.razon_social || ''}
                            onChange={(e) => setEditValues({ ...ev, razon_social: e.target.value })}
                            placeholder="Razón social"
                            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="relative">
                            <input
                              type="text"
                              value={ev.cuit || ''}
                              onChange={(e) => setEditValues({ ...ev, cuit: e.target.value })}
                              placeholder="CUIT XX-XXXXXXXX-X"
                              className={cn(
                                'w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500',
                                ev.cuit && !cuitValid(ev.cuit)
                                  ? 'border-red-400 dark:border-red-500'
                                  : 'border-slate-300 dark:border-slate-500'
                              )}
                            />
                            {ev.cuit && !cuitValid(ev.cuit) && (
                              <span className="text-red-500 text-xs absolute -bottom-4 left-0">CUIT inválido</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]" title={ticket.razon_social}>
                            {ticket.razon_social || <span className="text-slate-400">Sin nombre</span>}
                          </p>
                          <p className={cn('text-xs', ticket.cuit && !validateCUIT(ticket.cuit) ? 'text-red-500' : 'text-slate-400')}>
                            {ticket.cuit ? formatCUIT(ticket.cuit) : 'Sin CUIT'}
                            {ticket.cuit && !validateCUIT(ticket.cuit) && ' ⚠'}
                          </p>
                        </div>
                      )}
                    </td>

                    {/* Nro */}
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            value={ev.numero_ticket || ''}
                            onChange={(e) => setEditValues({ ...ev, numero_ticket: e.target.value })}
                            placeholder="N° Ticket"
                            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            value={ev.numero_z || ''}
                            onChange={(e) => setEditValues({ ...ev, numero_z: e.target.value })}
                            placeholder="N° Z"
                            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-slate-600 dark:text-slate-300 font-mono text-xs">{ticket.numero_ticket || '-'}</p>
                          <p className="text-slate-400 font-mono text-xs">{ticket.numero_z || '-'}</p>
                        </div>
                      )}
                    </td>

                    {/* Base 21 */}
                    <td className="px-3 py-3 text-right">
                      {isEditing ? (
                        <NumInput value={ev.base_neta_21 ?? 0} onChange={(v) => setEditValues({ ...ev, base_neta_21: v })} />
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">{formatCurrency(ticket.base_neta_21)}</span>
                      )}
                    </td>

                    {/* IVA 21 */}
                    <td className="px-3 py-3 text-right">
                      {isEditing ? (
                        <NumInput value={ev.iva_21 ?? 0} onChange={(v) => setEditValues({ ...ev, iva_21: v })} />
                      ) : (
                        <span className="text-blue-700 dark:text-blue-400 font-mono text-xs font-medium">{formatCurrency(ticket.iva_21)}</span>
                      )}
                    </td>

                    {/* Base 10.5 */}
                    <td className="px-3 py-3 text-right">
                      {isEditing ? (
                        <NumInput value={ev.base_neta_105 ?? 0} onChange={(v) => setEditValues({ ...ev, base_neta_105: v })} />
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">{formatCurrency(ticket.base_neta_105)}</span>
                      )}
                    </td>

                    {/* IVA 10.5 */}
                    <td className="px-3 py-3 text-right">
                      {isEditing ? (
                        <NumInput value={ev.iva_105 ?? 0} onChange={(v) => setEditValues({ ...ev, iva_105: v })} />
                      ) : (
                        <span className="text-teal-700 dark:text-teal-400 font-mono text-xs font-medium">{formatCurrency(ticket.iva_105)}</span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="px-3 py-3 text-right">
                      {isEditing ? (
                        <NumInput value={ev.total ?? 0} onChange={(v) => setEditValues({ ...ev, total: v })} />
                      ) : (
                        <span className="font-bold text-slate-800 dark:text-slate-100 font-mono text-xs">{formatCurrency(ticket.total)}</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <select
                          value={ev.estado || ticket.estado}
                          onChange={(e) => setEditValues({ ...ev, estado: e.target.value as TicketEstado })}
                          className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="revisado">Revisado</option>
                          <option value="procesado">Procesado</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="error">Error OCR</option>
                        </select>
                      ) : (
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.cls)}>
                          <IconE className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      )}
                    </td>

                    {/* OCR confidence */}
                    <td className="px-4 py-3 text-center">
                      {ticket.confianza_ocr > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', ticket.confianza_ocr >= 80 ? 'bg-emerald-500' : ticket.confianza_ocr >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                              style={{ width: `${ticket.confianza_ocr}%` }}
                            />
                          </div>
                          <span className="text-slate-400 text-xs">{ticket.confianza_ocr}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Guardar">
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Cancelar">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(ticket)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {showDeleteConfirm === ticket.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => { deleteTicket(ticket.id); setShowDeleteConfirm(null); }} className="p-1 rounded text-xs bg-red-500 text-white hover:bg-red-600 transition-colors px-2">
                                  Si
                                </button>
                                <button onClick={() => setShowDeleteConfirm(null)} className="p-1 rounded text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors px-2">
                                  No
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setShowDeleteConfirm(ticket.id)} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer totals */}
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-t-2 border-slate-200 dark:border-slate-600 font-semibold">
                  <td colSpan={4} className="px-3 py-3 text-slate-600 dark:text-slate-300 text-sm">
                    Total ({filtered.length} tickets)
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-700 dark:text-slate-200">
                    {formatCurrency(filtered.reduce((s, t) => s + t.base_neta_21, 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-blue-700 dark:text-blue-400 font-bold">
                    {formatCurrency(totals.iva21)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-slate-700 dark:text-slate-200">
                    {formatCurrency(filtered.reduce((s, t) => s + t.base_neta_105, 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-teal-700 dark:text-teal-400 font-bold">
                    {formatCurrency(totals.iva105)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm text-slate-900 dark:text-white font-bold">
                    {formatCurrency(totals.total)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function SortTh({ label, sortKey, current, dir, onSort, align }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void; align?: 'right';
}) {
  const active = current === sortKey;
  return (
    <th
      className={cn(
        'px-3 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none',
        align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortAsc className={cn('w-3 h-3 transition-transform', active ? 'opacity-100' : 'opacity-30', active && dir === 'desc' ? 'rotate-180' : '')} />
      </span>
    </th>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step="0.01"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-24 px-2 py-1 text-xs text-right border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
    />
  );
}
