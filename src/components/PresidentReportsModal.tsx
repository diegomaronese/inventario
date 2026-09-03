import React, { useState, useMemo } from 'react';
import { InventoryItem, ExtraItem, UserProfile } from '../types';
import { reportService, LocationProgress, ServerPerformance, DivergenceRecord } from '../services/reportService';
import {
  FileText,
  Download,
  X,
  Building2,
  MapPin,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Layers,
  FileCheck2,
} from 'lucide-react';

interface PresidentReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  items: InventoryItem[];
  extraItems: ExtraItem[];
}

type ReportTab = 'GERAL' | 'PENDENCIAS' | 'ANDAMENTO' | 'DIVERGENCIAS';

export const PresidentReportsModal: React.FC<PresidentReportsModalProps> = ({
  isOpen,
  onClose,
  user,
  items,
  extraItems,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('GERAL');
  const [selectedBlocoFilter, setSelectedBlocoFilter] = useState<string>('TODOS');
  const [selectedAmbienteFilter, setSelectedAmbienteFilter] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Get distinct blocks from items and extras
  const distinctBlocos = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.bloco && set.add(i.bloco));
    extraItems.forEach((e) => e.bloco && set.add(e.bloco));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [items, extraItems]);

  // Distinct rooms for selected block
  const distinctAmbientes = useMemo(() => {
    const set = new Set<string>();
    const pool = selectedBlocoFilter === 'TODOS'
      ? items
      : items.filter((i) => i.bloco === selectedBlocoFilter);
    pool.forEach((i) => i.ambiente && set.add(i.ambiente));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [items, selectedBlocoFilter]);

  // Aggregated data
  const locationsProgress: LocationProgress[] = useMemo(() => {
    return reportService.calculateLocationsProgress(items, extraItems);
  }, [items, extraItems]);

  const serversPerformance: ServerPerformance[] = useMemo(() => {
    return reportService.calculateServersPerformance(items, extraItems);
  }, [items, extraItems]);

  const divergences: DivergenceRecord[] = useMemo(() => {
    return reportService.gatherDivergences(items, extraItems);
  }, [items, extraItems]);

  // Overall metrics
  const totalBens = items.length;
  const totalConfirmados = items.filter((i) => i.status === 'LOCALIZADO').length;
  const totalNaoLocalizados = items.filter((i) => i.status === 'NAO_LOCALIZADO').length;
  const totalDivergentes = items.filter((i) => i.status === 'DIVERGENCIA_LOCAL').length;
  const totalPendentes = items.filter((i) => i.status === 'PENDENTE').length;
  const totalExtras = extraItems.length;
  const percentualGeral = totalBens > 0 ? Math.round(((totalConfirmados + totalNaoLocalizados + totalDivergentes) / totalBens) * 100) : 0;

  if (!isOpen) return null;

  // Handlers for exporting PDF
  const handleExportPDF = (tab: ReportTab) => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        if (tab === 'GERAL') {
          reportService.exportGeneralReport(
            items,
            extraItems,
            user,
            selectedBlocoFilter !== 'TODOS' ? selectedBlocoFilter : undefined,
            selectedAmbienteFilter !== 'TODOS' ? selectedAmbienteFilter : undefined
          );
        } else if (tab === 'PENDENCIAS') {
          reportService.exportPendenciesReport(
            items,
            user,
            selectedBlocoFilter !== 'TODOS' ? selectedBlocoFilter : undefined
          );
        } else if (tab === 'ANDAMENTO') {
          reportService.exportProgressReport(items, extraItems, user);
        } else if (tab === 'DIVERGENCIAS') {
          reportService.exportDivergencesReport(items, extraItems, user);
        }
      } catch (err) {
        console.error('Erro ao gerar PDF:', err);
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/80 dark:bg-zinc-950/60 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                  Central de Relatórios Executivos
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                  Presidência da Comissão
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                Gere e exporte relatórios oficiais em PDF com dados consolidados do inventário patrimonial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global KPI Strip */}
        <div className="px-4 sm:px-6 py-3 bg-zinc-100/60 dark:bg-zinc-950/40 border-b border-zinc-200/80 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs flex-shrink-0">
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total de Bens</div>
            <div className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">{totalBens}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Confirmados</div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{totalConfirmados}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Não Localizados</div>
            <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">{totalNaoLocalizados}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pendentes</div>
            <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{totalPendentes}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Itens Extras</div>
            <div className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">+{totalExtras}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Conclusão Geral</div>
            <div className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 font-mono mt-0.5">{percentualGeral}%</div>
          </div>
        </div>

        {/* 4 Tabs Selector Navigation */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar flex-shrink-0 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              type="button"
              onClick={() => setActiveTab('GERAL')}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'GERAL'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>1. Geral (Locais & Bens)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PENDENCIAS')}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'PENDENCIAS'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>2. Pendências ({totalPendentes + totalNaoLocalizados})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ANDAMENTO')}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'ANDAMENTO'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>3. Andamento & Servidores</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DIVERGENCIAS')}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'DIVERGENCIAS'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>4. Divergências ({divergences.length})</span>
            </button>
          </div>

          {/* Direct PDF Export Action Button for Active Tab */}
          <button
            type="button"
            onClick={() => handleExportPDF(activeTab)}
            disabled={isExporting}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition active:scale-98 flex-shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>{isExporting ? 'Gerando PDF...' : 'Baixar PDF'}</span>
          </button>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: RELATÓRIO GERAL */}
          {activeTab === 'GERAL' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Bloco Filter */}
                  <select
                    value={selectedBlocoFilter}
                    onChange={(e) => {
                      setSelectedBlocoFilter(e.target.value);
                      setSelectedAmbienteFilter('TODOS');
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="TODOS">Todos os Blocos</option>
                    {distinctBlocos.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>

                  {/* Ambiente Filter */}
                  <select
                    value={selectedAmbienteFilter}
                    onChange={(e) => setSelectedAmbienteFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="TODOS">Todos os Locais</option>
                    {distinctAmbientes.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por tombo ou descrição..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Items Preview Table */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-xs">
                <div className="overflow-x-auto max-h-[480px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                      <tr>
                        <th className="p-2.5">Bloco / Local</th>
                        <th className="p-2.5">Tombo</th>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5">Situação</th>
                        <th className="p-2.5">Conferente</th>
                        <th className="p-2.5">Data/Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                      {items
                        .filter((item) => {
                          if (selectedBlocoFilter !== 'TODOS' && item.bloco !== selectedBlocoFilter) return false;
                          if (selectedAmbienteFilter !== 'TODOS' && item.ambiente !== selectedAmbienteFilter) return false;
                          if (searchQuery.trim()) {
                            const q = searchQuery.toLowerCase();
                            const matchP = item.patrimonio.toLowerCase().includes(q);
                            const matchD = item.descricao.toLowerCase().includes(q);
                            return matchP || matchD;
                          }
                          return true;
                        })
                        .slice(0, 100)
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50">
                            <td className="p-2.5 font-medium text-zinc-700 dark:text-zinc-300">
                              <span className="font-bold">{item.bloco}</span> - {item.ambiente}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-amber-700 dark:text-amber-400">
                              {item.patrimonio}
                            </td>
                            <td className="p-2.5 text-zinc-800 dark:text-zinc-200 max-w-[280px] truncate">
                              {item.descricao}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold">
                                {item.estadoConservacao || 'N/I'}
                              </span>
                            </td>
                            <td className="p-2.5">
                              {item.status === 'LOCALIZADO' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] border border-emerald-200 dark:border-emerald-900/50">
                                  <CheckCircle2 className="w-3 h-3" /> Confirmado
                                </span>
                              ) : item.status === 'NAO_LOCALIZADO' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold text-[11px] border border-rose-200 dark:border-rose-900/50">
                                  <XCircle className="w-3 h-3" /> Não Localizado
                                </span>
                              ) : item.status === 'DIVERGENCIA_LOCAL' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 font-bold text-[11px] border border-purple-200 dark:border-purple-900/50">
                                  <AlertTriangle className="w-3 h-3" /> Divergente
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold text-[11px] border border-amber-200 dark:border-amber-900/50">
                                  <Clock className="w-3 h-3" /> Pendente
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-zinc-600 dark:text-zinc-400 text-[11px]">
                              {item.verificadoPorNome || item.verificadoPor || '-'}
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                              {item.verificadoEm || '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>Mostrando primeiros 100 itens na prévia (o PDF conterá todos os registros selecionados)</span>
                  <button
                    type="button"
                    onClick={() => handleExportPDF('GERAL')}
                    className="font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar PDF Completo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PENDÊNCIAS */}
          {activeTab === 'PENDENCIAS' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-amber-900 dark:text-amber-300">
                    {totalPendentes + totalNaoLocalizados} Bens Requerem Verificação
                  </div>
                  <div className="text-amber-700 dark:text-amber-400/90 mt-0.5">
                    Este relatório lista especificamente os bens patrimoniais que ainda não foram marcados como localizados ou que constam como não localizados no campus.
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-xs">
                <div className="overflow-x-auto max-h-[480px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                      <tr>
                        <th className="p-2.5">Bloco / Local Previsto</th>
                        <th className="p-2.5">Tombo</th>
                        <th className="p-2.5">Nº Antigo</th>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5">Situação</th>
                        <th className="p-2.5">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                      {items
                        .filter((i) => i.status === 'PENDENTE' || i.status === 'NAO_LOCALIZADO')
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50">
                            <td className="p-2.5 font-medium text-zinc-800 dark:text-zinc-200">
                              <span className="font-bold">{item.bloco}</span> - {item.ambiente}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-amber-700 dark:text-amber-400">
                              {item.patrimonio}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                              {item.patrimonioAntigo || '-'}
                            </td>
                            <td className="p-2.5 text-zinc-800 dark:text-zinc-200 max-w-[280px]">
                              {item.descricao}
                            </td>
                            <td className="p-2.5">
                              {item.status === 'NAO_LOCALIZADO' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[11px]">
                                  Não Localizado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
                              {item.observacoes || '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANDAMENTO POR LOCAL & SERVIDOR */}
          {activeTab === 'ANDAMENTO' && (
            <div className="space-y-6">
              {/* Part 1: Locations Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Progresso Físico por Local / Setor ({locationsProgress.length} locais)</span>
                  </h3>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-xs">
                  <div className="overflow-x-auto max-h-[360px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                        <tr>
                          <th className="p-2.5">Bloco</th>
                          <th className="p-2.5">Local / Ambiente</th>
                          <th className="p-2.5 text-center">Previsto</th>
                          <th className="p-2.5 text-center">Confirmado</th>
                          <th className="p-2.5 text-center">Não Loc.</th>
                          <th className="p-2.5 text-center">Pendente</th>
                          <th className="p-2.5 text-center">Extras</th>
                          <th className="p-2.5 text-center">Progresso</th>
                          <th className="p-2.5">Situação</th>
                          <th className="p-2.5">Servidores no Local</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                        {locationsProgress.map((loc, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50">
                            <td className="p-2.5 font-bold text-zinc-800 dark:text-zinc-200">{loc.bloco}</td>
                            <td className="p-2.5 font-medium text-zinc-900 dark:text-zinc-100">{loc.ambiente}</td>
                            <td className="p-2.5 text-center font-mono font-semibold">{loc.total}</td>
                            <td className="p-2.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{loc.localizados}</td>
                            <td className="p-2.5 text-center font-mono text-rose-600 dark:text-rose-400 font-semibold">{loc.naoLocalizados}</td>
                            <td className="p-2.5 text-center font-mono text-amber-600 dark:text-amber-400 font-semibold">{loc.pendentes}</td>
                            <td className="p-2.5 text-center font-mono text-purple-600 dark:text-purple-400 font-semibold">{loc.extras > 0 ? `+${loc.extras}` : '0'}</td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5 font-mono font-bold text-xs">
                                <span>{loc.percentual}%</span>
                              </div>
                            </td>
                            <td className="p-2.5">
                              {loc.status === 'CONCLUIDO' ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                                  Concluído
                                </span>
                              ) : loc.status === 'EM_ANDAMENTO' ? (
                                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                                  Em Andamento
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold text-[10px]">
                                  Não Iniciado
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 truncate max-w-[220px]">
                              {loc.servidores.length > 0 ? loc.servidores.join(', ') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Part 2: Servers Table */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Produtividade por Servidor Conferente ({serversPerformance.length} servidores ativos)</span>
                </h3>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-xs">
                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Servidor Conferente</th>
                          <th className="p-2.5 text-center">Bens Verificados</th>
                          <th className="p-2.5 text-center">Qtd Locais</th>
                          <th className="p-2.5">Locais em que Atuou</th>
                          <th className="p-2.5">Última Atividade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                        {serversPerformance.map((serv, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50">
                            <td className="p-2.5 font-bold text-zinc-400 text-center">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">{serv.nome}</td>
                            <td className="p-2.5 text-center font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                              {serv.totalItensVerificados}
                            </td>
                            <td className="p-2.5 text-center font-mono font-semibold">{serv.locaisAtuados.length}</td>
                            <td className="p-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 max-w-[280px] truncate">
                              {serv.locaisAtuados.join(', ') || '-'}
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                              {serv.ultimaAtividade || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DIVERGÊNCIAS */}
          {activeTab === 'DIVERGENCIAS' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-purple-900 dark:text-purple-300">
                    {divergences.length} Ocorrências e Divergências Registradas
                  </div>
                  <div className="text-purple-700 dark:text-purple-400/90 mt-0.5">
                    Reúne itens encontrados em locais divergentes do cadastro, itens extras identificados sem registro prévio na base, itens não localizados e sugestões de baixa ou manutenção.
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-xs">
                <div className="overflow-x-auto max-h-[480px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                      <tr>
                        <th className="p-2.5">Tipo de Ocorrência</th>
                        <th className="p-2.5">Tombo</th>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5">Local Previsto</th>
                        <th className="p-2.5">Local Constatado</th>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5">Conferente</th>
                        <th className="p-2.5">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                      {divergences.map((div, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50">
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                              {div.tipoDescricao}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-amber-700 dark:text-amber-400">
                            {div.patrimonio}
                          </td>
                          <td className="p-2.5 text-zinc-800 dark:text-zinc-200 max-w-[240px] truncate">
                            {div.descricao}
                          </td>
                          <td className="p-2.5 text-zinc-600 dark:text-zinc-400">
                            {div.localOriginal || '-'}
                          </td>
                          <td className="p-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                            {div.localEncontrado || '-'}
                          </td>
                          <td className="p-2.5 text-[10px]">
                            {div.estadoConservacao || 'N/I'}
                          </td>
                          <td className="p-2.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                            {div.servidor || '-'}
                          </td>
                          <td className="p-2.5 text-zinc-500 text-[11px]">
                            {div.observacoes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs flex-shrink-0">
          <div className="text-zinc-500 dark:text-zinc-400">
            Documentos emitidos com timbre oficial da UTFPR Campus Apucarana e identificação do signatário.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold cursor-pointer transition"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => handleExportPDF(activeTab)}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Gerando...' : 'Exportar Relatório Atual (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
