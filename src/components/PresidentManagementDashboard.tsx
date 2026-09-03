import React, { useState, useMemo } from 'react';
import { InventoryItem, ExtraItem, UserProfile } from '../types';
import { reportService, LocationProgress, ServerPerformance, DivergenceRecord } from '../services/reportService';
import { useTheme } from '../context/ThemeContext';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ShieldCheck,
  Building2,
  Users,
  AlertTriangle,
  FileText,
  Download,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  MapPin,
  Sparkles,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface PresidentManagementDashboardProps {
  user: UserProfile;
  items: InventoryItem[];
  extraItems: ExtraItem[];
  onOpenReports: () => void;
}

export const PresidentManagementDashboard: React.FC<PresidentManagementDashboardProps> = ({
  user,
  items,
  extraItems,
  onOpenReports,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EQUIPE' | 'LOCAIS' | 'DIVERGENCIAS'>('OVERVIEW');
  const [selectedBlocoFilter, setSelectedBlocoFilter] = useState<string>('TODOS');
  const [searchServerTerm, setSearchServerTerm] = useState<string>('');
  const [searchLocationTerm, setSearchLocationTerm] = useState<string>('');
  const [searchDivergenceTerm, setSearchDivergenceTerm] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Distinct blocks
  const distinctBlocos = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.bloco && set.add(i.bloco));
    extraItems.forEach((e) => e.bloco && set.add(e.bloco));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [items, extraItems]);

  // Overall Campus Metrics
  const campusMetrics = useMemo(() => {
    const totalBens = items.length;
    const localizados = items.filter((i) => i.status === 'LOCALIZADO').length;
    const naoLocalizados = items.filter((i) => i.status === 'NAO_LOCALIZADO').length;
    const divergentes = items.filter((i) => i.status === 'DIVERGENCIA_LOCAL').length;
    const pendentes = items.filter((i) => i.status === 'PENDENTE').length;
    const totalConferidos = localizados + naoLocalizados + divergentes;
    const extras = extraItems.length;
    const percentualConclusao = totalBens > 0 ? Math.round((totalConferidos / totalBens) * 100) : 0;

    return {
      totalBens,
      localizados,
      naoLocalizados,
      divergentes,
      pendentes,
      totalConferidos,
      extras,
      percentualConclusao,
    };
  }, [items, extraItems]);

  // Progress by locations
  const locationsProgress: LocationProgress[] = useMemo(() => {
    return reportService.calculateLocationsProgress(items, extraItems);
  }, [items, extraItems]);

  // Server performance metrics
  const serversPerformance: ServerPerformance[] = useMemo(() => {
    return reportService.calculateServersPerformance(items, extraItems);
  }, [items, extraItems]);

  // Divergences list
  const divergences: DivergenceRecord[] = useMemo(() => {
    return reportService.gatherDivergences(items, extraItems);
  }, [items, extraItems]);

  // Campus Donut Chart Data
  const donutData = useMemo(() => {
    return [
      { name: 'Confirmados no Local', value: campusMetrics.localizados, color: '#10b981' }, // emerald-500
      { name: 'Em Outro Local (Divergente)', value: campusMetrics.divergentes, color: '#3b82f6' }, // blue-500
      { name: 'Não Localizados', value: campusMetrics.naoLocalizados, color: '#f43f5e' }, // rose-500
      { name: 'Pendentes de Auditoria', value: campusMetrics.pendentes, color: isDark ? '#f59e0b' : '#d97706' }, // amber-500
    ].filter((d) => d.value > 0);
  }, [campusMetrics, isDark]);

  // Progress by Block Chart Data
  const blockChartData = useMemo(() => {
    const blocoMap = new Map<string, { total: number; conferidos: number; pendentes: number }>();

    items.forEach((item) => {
      const b = item.bloco || 'Outros';
      if (!blocoMap.has(b)) {
        blocoMap.set(b, { total: 0, conferidos: 0, pendentes: 0 });
      }
      const rec = blocoMap.get(b)!;
      rec.total++;
      if (item.status === 'PENDENTE') {
        rec.pendentes++;
      } else {
        rec.conferidos++;
      }
    });

    const result: Array<{ bloco: string; conferidos: number; pendentes: number; percentual: number }> = [];
    blocoMap.forEach((val, blocoKey) => {
      const pct = val.total > 0 ? Math.round((val.conferidos / val.total) * 100) : 0;
      result.push({
        bloco: blocoKey,
        conferidos: val.conferidos,
        pendentes: val.pendentes,
        percentual: pct,
      });
    });

    return result.sort((a, b) => a.bloco.localeCompare(b.bloco, 'pt-BR'));
  }, [items]);

  // Top active conferentes for bar chart
  const topConferentesData = useMemo(() => {
    return serversPerformance
      .slice(0, 7)
      .map((s) => ({
        nome: s.nome.length > 15 ? s.nome.substring(0, 14) + '…' : s.nome,
        nomeCompleto: s.nome,
        itens: s.totalItensVerificados,
        locais: s.locaisAtuados.length,
      }));
  }, [serversPerformance]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locationsProgress.filter((loc) => {
      if (selectedBlocoFilter !== 'TODOS' && loc.bloco !== selectedBlocoFilter) {
        return false;
      }
      if (searchLocationTerm.trim()) {
        const q = searchLocationTerm.toLowerCase().trim();
        const matchBloco = loc.bloco.toLowerCase().includes(q);
        const matchAmb = loc.ambiente.toLowerCase().includes(q);
        const matchServ = loc.servidores.some((s) => s.toLowerCase().includes(q));
        if (!matchBloco && !matchAmb && !matchServ) return false;
      }
      return true;
    });
  }, [locationsProgress, selectedBlocoFilter, searchLocationTerm]);

  // Filtered servers
  const filteredServers = useMemo(() => {
    return serversPerformance.filter((s) => {
      if (searchServerTerm.trim()) {
        const q = searchServerTerm.toLowerCase().trim();
        const matchNome = s.nome.toLowerCase().includes(q);
        const matchLoc = s.locaisAtuados.some((l) => l.toLowerCase().includes(q));
        if (!matchNome && !matchLoc) return false;
      }
      return true;
    });
  }, [serversPerformance, searchServerTerm]);

  // Filtered divergences
  const filteredDivergences = useMemo(() => {
    return divergences.filter((d) => {
      if (searchDivergenceTerm.trim()) {
        const q = searchDivergenceTerm.toLowerCase().trim();
        const matchPatr = d.patrimonio.toLowerCase().includes(q);
        const matchDesc = d.descricao.toLowerCase().includes(q);
        const matchLoc = (d.localOriginal || '').toLowerCase().includes(q) || (d.localEncontrado || '').toLowerCase().includes(q);
        const matchServ = (d.servidor || '').toLowerCase().includes(q);
        if (!matchPatr && !matchDesc && !matchLoc && !matchServ) return false;
      }
      return true;
    });
  }, [divergences, searchDivergenceTerm]);

  // Locations summary
  const locationsSummary = useMemo(() => {
    const totalLocais = locationsProgress.length;
    const concluidos = locationsProgress.filter((l) => l.status === 'CONCLUIDO').length;
    const emAndamento = locationsProgress.filter((l) => l.status === 'EM_ANDAMENTO').length;
    const naoIniciados = locationsProgress.filter((l) => l.status === 'NAO_INICIADO').length;
    return { totalLocais, concluidos, emAndamento, naoIniciados };
  }, [locationsProgress]);

  const handleExportPDF = (type: 'GERAL' | 'PENDENCIAS' | 'ANDAMENTO' | 'DIVERGENCIAS') => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        if (type === 'GERAL') {
          reportService.exportGeneralReport(items, extraItems, user);
        } else if (type === 'PENDENCIAS') {
          reportService.exportPendenciesReport(items, user);
        } else if (type === 'ANDAMENTO') {
          reportService.exportProgressReport(items, extraItems, user);
        } else if (type === 'DIVERGENCIAS') {
          reportService.exportDivergencesReport(items, extraItems, user);
        }
      } catch (err) {
        console.error('Erro ao gerar relatório em PDF:', err);
      } finally {
        setIsExporting(false);
      }
    }, 150);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Institutional Presidential Management Header Card */}
      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                Painel de Gestão do Inventário
              </h1>
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 shadow-xs">
                {user.cargo || 'Presidência'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Acompanhamento global do inventário patrimonial
            </p>
          </div>

          {/* Quick PDF Export Hub for the President / Vice */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-president-open-reports"
              onClick={onOpenReports}
              disabled={isExporting}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
              title="Central Completa de Relatórios e Exportação em PDF"
            >
              <FileText className="w-4 h-4 text-amber-400 dark:text-zinc-950" />
              <span>Central de Relatórios (PDF)</span>
            </button>

            <button
              type="button"
              id="btn-quick-export-general"
              onClick={() => handleExportPDF('GERAL')}
              disabled={isExporting}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Exportar Relatório Geral do Campus em PDF"
            >
              <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Exportar PDF Geral</span>
            </button>
          </div>
        </div>

        {/* Executive Info Strip: Server Responsibilities Notice */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              Modo Executivo da Presidência / Vice-presidência Ativado:
            </p>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Esta tela é dedicada exclusivamente à gestão dos trabalhos e extração de relatórios. A conferência e o registro direto de itens permanecem restritos aos <strong>Membros da Comissão</strong>.
            </p>
          </div>
        </div>

        {/* Primary Campus Big KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 pt-1">
          {/* Card 1: Total Bens */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Bens Cadastrados
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono">
                {campusMetrics.totalBens}
              </span>
              <span className="text-[10px] text-zinc-400">total</span>
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 block">
              Base oficial UTFPR
            </span>
          </div>

          {/* Card 2: Percentual Conclusão */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
              Progresso Geral
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {campusMetrics.percentualConclusao}%
              </span>
            </div>
            <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 mt-1 block">
              {campusMetrics.totalConferidos} de {campusMetrics.totalBens} auditados
            </span>
          </div>

          {/* Card 3: Confirmados */}
          <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Confirmados no Local
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-200 font-mono">
                {campusMetrics.localizados}
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">
              {campusMetrics.totalBens > 0 ? Math.round((campusMetrics.localizados / campusMetrics.totalBens) * 100) : 0}% do acervo
            </span>
          </div>

          {/* Card 4: Pendentes */}
          <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
              Pendentes
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-amber-800 dark:text-amber-200 font-mono">
                {campusMetrics.pendentes}
              </span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
              Aguardando equipe
            </span>
          </div>

          {/* Card 5: Divergências & Não Localizados */}
          <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/50">
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
              Inconsistências
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-rose-800 dark:text-rose-200 font-mono">
                {campusMetrics.naoLocalizados + campusMetrics.divergentes}
              </span>
            </div>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 block">
              {campusMetrics.naoLocalizados} extraviados • {campusMetrics.divergentes} transferidos
            </span>
          </div>

          {/* Card 6: Itens Extras */}
          <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/50">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">
              Itens Não Catalogados
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-purple-800 dark:text-purple-200 font-mono">
                {campusMetrics.extras}
              </span>
            </div>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 block">
              Identificados em campo
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <span>Andamento Global do Inventário do Campus</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100">
              {campusMetrics.totalConferidos} de {campusMetrics.totalBens} ({campusMetrics.percentualConclusao}%)
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200/80 dark:border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 transition-all duration-700"
              style={{ width: `${campusMetrics.percentualConclusao}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs for President's Hub */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-x-auto shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Visão Geral & Gráficos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('EQUIPE')}
          className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'EQUIPE'
              ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Equipe de Conferentes ({serversPerformance.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOCAIS')}
          className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'LOCAIS'
              ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Ambientes & Setores ({locationsProgress.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DIVERGENCIAS')}
          className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'DIVERGENCIAS'
              ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Divergências & Extras ({divergences.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & RECHARTS ANALYTICS */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Donut Chart: Campus Status Distribution */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Status do Acervo Patrimonial
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Proporção geral de conferidos vs. pendentes do campus
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  {campusMetrics.totalBens} itens
                </span>
              </div>

              {/* Donut Chart Recharts */}
              <div className="relative h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={2}
                      stroke={isDark ? '#18181b' : '#ffffff'}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`donut-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} bens (${Math.round((val / campusMetrics.totalBens) * 100)}%)`, 'Quantidade']}
                      contentStyle={{
                        backgroundColor: isDark ? '#09090b' : '#ffffff',
                        borderColor: isDark ? '#27272a' : '#e4e4e7',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100">
                    {campusMetrics.percentualConclusao}%
                  </span>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">
                    Concluído
                  </span>
                </div>
              </div>

              {/* Legend with direct counts */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Confirmados: <strong className="font-mono">{campusMetrics.localizados}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Pendentes: <strong className="font-mono">{campusMetrics.pendentes}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span>Divergentes: <strong className="font-mono">{campusMetrics.divergentes}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span>Extraviados: <strong className="font-mono">{campusMetrics.naoLocalizados}</strong></span>
                </div>
              </div>
            </div>

            {/* Bar Chart: Progress per Block */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Conferência por Bloco / Edifício
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Distribuição de bens conferidos e pendentes por bloco
                  </p>
                </div>
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  {blockChartData.length} blocos
                </span>
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={blockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="bloco"
                      tick={{ fontSize: 11, fill: isDark ? '#a1a1aa' : '#71717a' }}
                      axisLine={{ stroke: isDark ? '#27272a' : '#e4e4e7' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: isDark ? '#a1a1aa' : '#71717a' }}
                      axisLine={{ stroke: isDark ? '#27272a' : '#e4e4e7' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#09090b' : '#ffffff',
                        borderColor: isDark ? '#27272a' : '#e4e4e7',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      iconType="circle"
                    />
                    <Bar dataKey="conferidos" name="Auditados" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="pendentes" name="Pendentes" fill={isDark ? '#f59e0b' : '#d97706'} radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Fast Block percentage overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
                {blockChartData.slice(0, 4).map((b) => (
                  <div key={b.bloco} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block truncate">{b.bloco}</span>
                    <div className="flex justify-between items-baseline mt-0.5">
                      <span className="text-[10px] text-zinc-500 font-mono">{b.conferidos}/{b.conferidos + b.pendentes}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{b.percentual}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Second Row: Top Team Conferentes and Environments Status Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Team Performance Bar Chart */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>Produtividade dos Servidores Conferentes</span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Bens auditados e registrados por cada membro da equipe
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('EQUIPE')}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todos</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {topConferentesData.length > 0 ? (
                <div className="h-[210px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topConferentesData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <XAxis type="number" tick={{ fontSize: 11, fill: isDark ? '#a1a1aa' : '#71717a' }} />
                      <YAxis
                        dataKey="nome"
                        type="category"
                        width={90}
                        tick={{ fontSize: 11, fill: isDark ? '#a1a1aa' : '#71717a' }}
                      />
                      <Tooltip
                        formatter={(val: number) => [`${val} itens auditados`, 'Produtividade']}
                        contentStyle={{
                          backgroundColor: isDark ? '#09090b' : '#ffffff',
                          borderColor: isDark ? '#27272a' : '#e4e4e7',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="itens" name="Bens Verificados" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-400 dark:text-zinc-600 text-xs">
                  Nenhum registro de conferência associado aos conferentes no momento.
                </div>
              )}
            </div>

            {/* Locations Global Status Card */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    <span>Status dos Ambientes ({locationsSummary.totalLocais})</span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Salas e setores finalizados vs pendentes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('LOCAIS')}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Detalhes</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* Concluídos */}
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                        Ambientes Concluídos
                      </span>
                      <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                        Todos os bens foram auditados
                      </span>
                    </div>
                  </div>
                  <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300">
                    {locationsSummary.concluidos}
                  </span>
                </div>

                {/* Em Andamento */}
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                        Ambientes em Andamento
                      </span>
                      <span className="text-[10px] text-amber-700/80 dark:text-amber-400">
                        Conferência iniciada pela equipe
                      </span>
                    </div>
                  </div>
                  <span className="text-base font-black font-mono text-amber-700 dark:text-amber-300">
                    {locationsSummary.emAndamento}
                  </span>
                </div>

                {/* Não Iniciados */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-zinc-500" />
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                        Ambientes Não Iniciados
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        Nenhum item auditado ainda
                      </span>
                    </div>
                  </div>
                  <span className="text-base font-black font-mono text-zinc-700 dark:text-zinc-300">
                    {locationsSummary.naoIniciados}
                  </span>
                </div>
              </div>

              {/* Fast Action: Export Progress PDF */}
              <button
                type="button"
                onClick={() => handleExportPDF('ANDAMENTO')}
                className="w-full min-h-[38px] py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Baixar Relatório de Andamento em PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EQUIPE DE CONFERENTES */}
      {activeTab === 'EQUIPE' && (
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <span>Desempenho da Equipe de Inventariantes</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Acompanhe o volume de itens conferidos por servidor e os ambientes em que atuaram
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar servidor ou local..."
                  value={searchServerTerm}
                  onChange={(e) => setSearchServerTerm(e.target.value)}
                  className="w-full min-h-[36px] pl-9 pr-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleExportPDF('ANDAMENTO')}
                className="min-h-[36px] px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>PDF Equipe</span>
              </button>
            </div>
          </div>

          {filteredServers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="p-3">Servidor Conferente</th>
                    <th className="p-3 text-center">Itens Auditados</th>
                    <th className="p-3">Locais Atuados</th>
                    <th className="p-3">Última Atividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredServers.map((serv, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-950/40 transition">
                      <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs">
                            {serv.nome.charAt(0)}
                          </div>
                          <div>
                            <div>{serv.nome}</div>
                            {serv.email && (
                              <div className="text-[10px] text-zinc-400 font-normal">{serv.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {serv.totalItensVerificados}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {serv.locaisAtuados.map((loc, lIdx) => (
                            <span
                              key={lIdx}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60"
                            >
                              {loc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">
                        {serv.ultimaAtividade
                          ? serv.ultimaAtividade.includes('/')
                            ? serv.ultimaAtividade
                            : new Date(serv.ultimaAtividade).toLocaleString('pt-BR')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
              Nenhum servidor conferente encontrado com os termos pesquisados.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AMBIENTES & SETORES */}
      {activeTab === 'LOCAIS' && (
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                <span>Andamento por Bloco e Ambiente</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Acompanhe as salas com pendências e os servidores responsáveis
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter by Bloco */}
              <select
                value={selectedBlocoFilter}
                onChange={(e) => setSelectedBlocoFilter(e.target.value)}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="TODOS">Todos os Blocos</option>
                {distinctBlocos.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Search room */}
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrar ambiente..."
                  value={searchLocationTerm}
                  onChange={(e) => setSearchLocationTerm(e.target.value)}
                  className="w-full min-h-[36px] pl-9 pr-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleExportPDF('ANDAMENTO')}
                className="min-h-[36px] px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>PDF Locais</span>
              </button>
            </div>
          </div>

          {filteredLocations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="p-3">Bloco</th>
                    <th className="p-3">Ambiente / Setor</th>
                    <th className="p-3 text-center">Total</th>
                    <th className="p-3 text-center">Confirmados</th>
                    <th className="p-3 text-center">Pendentes</th>
                    <th className="p-3 text-center">Inconsistências</th>
                    <th className="p-3 text-center">Progresso</th>
                    <th className="p-3">Conferentes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredLocations.map((loc, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-950/40 transition">
                      <td className="p-3 font-semibold text-zinc-700 dark:text-zinc-300">
                        {loc.bloco}
                      </td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{loc.ambiente}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {loc.total}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {loc.localizados}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                        {loc.pendentes}
                      </td>
                      <td className="p-3 text-center font-mono text-zinc-600 dark:text-zinc-400">
                        {loc.naoLocalizados > 0 || loc.divergentes > 0 || loc.extras > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            {loc.naoLocalizados + loc.divergentes}
                            {loc.extras > 0 && ` (+${loc.extras} extras)`}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                loc.percentual >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${loc.percentual}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px] text-zinc-800 dark:text-zinc-200">
                            {loc.percentual}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          {loc.servidores.length > 0 ? loc.servidores.join(', ') : '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
              Nenhum ambiente encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DIVERGÊNCIAS & EXTRAS */}
      {activeTab === 'DIVERGENCIAS' && (
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Divergências, Extravios e Itens Não Catalogados ({divergences.length})</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Itens encontrados em outro local, não localizados pela equipe ou cadastrados como extras
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar patrimônio, descrição..."
                  value={searchDivergenceTerm}
                  onChange={(e) => setSearchDivergenceTerm(e.target.value)}
                  className="w-full min-h-[36px] pl-9 pr-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleExportPDF('DIVERGENCIAS')}
                className="min-h-[36px] px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-900 dark:text-rose-200 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>PDF Divergências</span>
              </button>
            </div>
          </div>

          {filteredDivergences.length > 0 ? (
            <div className="space-y-2.5">
              {filteredDivergences.map((div, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    div.tipo === 'LOCAL_DIVERGENTE'
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-800/50'
                      : div.tipo === 'NAO_LOCALIZADO'
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/50'
                      : 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        {div.patrimonio}
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {div.descricao}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        div.tipo === 'LOCAL_DIVERGENTE'
                          ? 'bg-blue-500 text-white'
                          : div.tipo === 'NAO_LOCALIZADO'
                          ? 'bg-rose-600 text-white'
                          : 'bg-purple-600 text-white'
                      }`}
                    >
                      {div.tipoDescricao}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <div>
                      <span className="text-zinc-400">Local Origem:</span>{' '}
                      <strong>{div.localOriginal || 'Não informado'}</strong>
                    </div>
                    {div.localEncontrado && (
                      <div>
                        <span className="text-zinc-400">Local Encontrado:</span>{' '}
                        <strong className="text-blue-700 dark:text-blue-300">{div.localEncontrado}</strong>
                      </div>
                    )}
                    <div>
                      <span className="text-zinc-400">Servidor:</span>{' '}
                      <strong>{div.servidor || '—'}</strong>
                    </div>
                  </div>

                  {div.observacoes && (
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-300 italic pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      Observação / Justificativa: {div.observacoes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
              Nenhuma inconsistência encontrada para os termos pesquisados.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
