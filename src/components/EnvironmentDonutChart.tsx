import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle2, Clock, MapPin, AlertCircle, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface EnvironmentDonutChartProps {
  ambiente: string;
  bloco: string;
  total: number;
  conferidos: number;
  pendentes: number;
  localizados?: number;
  divergentes?: number;
  naoLocalizados?: number;
  extraItemsCount?: number;
  onFilterStatus?: (status: string) => void;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    percentage: number;
    color: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-zinc-900/95 dark:bg-zinc-950/95 border border-zinc-700/80 dark:border-zinc-800 text-white px-3 py-2 rounded-xl shadow-xl backdrop-blur-sm text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-bold text-zinc-100">{data.name}</span>
        </div>
        <div className="text-zinc-300 flex justify-between gap-4 font-mono">
          <span>{data.value} {data.value === 1 ? 'item' : 'itens'}</span>
          <span className="font-bold text-amber-400">{data.percentage}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const EnvironmentDonutChart: React.FC<EnvironmentDonutChartProps> = ({
  ambiente,
  bloco,
  total,
  conferidos,
  pendentes,
  localizados = 0,
  divergentes = 0,
  naoLocalizados = 0,
  extraItemsCount = 0,
  onFilterStatus,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const conferidosPercent = total > 0 ? Math.round((conferidos / total) * 100) : 0;
  const pendentesPercent = total > 0 ? 100 - conferidosPercent : 0;
  const isComplete = total > 0 && pendentes === 0;

  // Chart data setup
  const chartData = [
    {
      name: 'Conferidos',
      value: conferidos,
      percentage: conferidosPercent,
      color: '#10b981', // Emerald 500
    },
    {
      name: 'Pendentes',
      value: pendentes,
      percentage: pendentesPercent,
      color: isDark ? '#f59e0b' : '#d97706', // Amber 500/600
    },
  ];

  // Fallback slice for empty environment (0 items)
  const emptyData = [
    {
      name: 'Sem bens cadastrados',
      value: 1,
      percentage: 0,
      color: isDark ? '#3f3f46' : '#e4e4e7',
    },
  ];

  const displayData = total === 0 ? emptyData : chartData;

  return (
    <div
      id="environment-donut-card"
      className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-colors duration-200"
    >
      {/* Header with Title and Room Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">{ambiente}</span>
            </h3>
            {isComplete && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3 h-3" />
                100% Concluído
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {bloco} • <strong>{total} bens</strong> registrados no ambiente
          </p>
        </div>

        {/* Quick percentage badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline">Progresso:</span>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border ${
              isComplete
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            }`}
          >
            {conferidosPercent}% validado
          </span>
        </div>
      </div>

      {/* Main Content: Donut Chart + Statistics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-3.5">
        {/* Recharts Donut Chart Container (5 cols on desktop) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-[220px] h-[190px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={displayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={total > 0 && conferidos > 0 && pendentes > 0 ? 4 : 0}
                  dataKey="value"
                  strokeWidth={2}
                  stroke={isDark ? '#18181b' : '#ffffff'}
                  animationDuration={800}
                >
                  {displayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                {total > 0 && <Tooltip content={<CustomTooltip />} />}
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Percentage and Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {total > 0 ? (
                <>
                  <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50 font-mono tracking-tight leading-none">
                    {conferidosPercent}%
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-1">
                    {isComplete ? 'Concluído' : 'Conferido'}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {conferidos}/{total}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase">
                    Sem Itens
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600">0 bens</span>
                </>
              )}
            </div>
          </div>

          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 text-center">
            Passe o mouse ou toque no gráfico para ver detalhes
          </span>
        </div>

        {/* Breakdown Metric Cards (7 cols on desktop) */}
        <div className="md:col-span-7 space-y-2.5">
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {/* Card: Conferidos */}
            <div
              onClick={() => onFilterStatus?.('LOCALIZADOS')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                onFilterStatus ? 'hover:scale-[1.02] active:scale-[0.99]' : ''
              } bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-800/60 shadow-xs`}
              title="Clique para filtrar itens localizados"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Conferidos
                </span>
                <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                  {conferidosPercent}%
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100 font-mono">
                  {conferidos}
                </span>
                <span className="text-xs text-emerald-700/80 dark:text-emerald-400">
                  de {total} bens
                </span>
              </div>
              {/* Detail pills */}
              <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[10px] text-emerald-800/90 dark:text-emerald-300/90 space-y-0.5 font-medium">
                <div className="flex justify-between">
                  <span>No local correto:</span>
                  <strong className="font-mono">{localizados}</strong>
                </div>
                {divergentes > 0 && (
                  <div className="flex justify-between text-blue-700 dark:text-blue-300">
                    <span>Em outro local:</span>
                    <strong className="font-mono">{divergentes}</strong>
                  </div>
                )}
                {naoLocalizados > 0 && (
                  <div className="flex justify-between text-rose-700 dark:text-rose-300">
                    <span>Não localizados:</span>
                    <strong className="font-mono">{naoLocalizados}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Card: Pendentes */}
            <div
              onClick={() => onFilterStatus?.('PENDENTES')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                onFilterStatus ? 'hover:scale-[1.02] active:scale-[0.99]' : ''
              } bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-800/60 shadow-xs`}
              title="Clique para filtrar itens pendentes"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  Pendentes
                </span>
                <span className="text-xs font-mono font-black text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">
                  {pendentesPercent}%
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-100 font-mono">
                  {pendentes}
                </span>
                <span className="text-xs text-amber-700/80 dark:text-amber-400">
                  restantes
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/40 text-[10px] text-amber-800/90 dark:text-amber-300/90 space-y-0.5 font-medium">
                <div className="flex justify-between">
                  <span>Aguardando auditoria:</span>
                  <strong className="font-mono">{pendentes}</strong>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Status atual:</span>
                  <span>{isComplete ? 'Finalizado' : 'Em andamento'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Extra non-cataloged items badge if any */}
          {extraItemsCount > 0 && (
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50 flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>
                  <strong>{extraItemsCount}</strong> {extraItemsCount === 1 ? 'item excedente/sem tombo' : 'itens excedentes/sem tombo'} catalogados neste local
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-800 dark:text-purple-200">
                Extra
              </span>
            </div>
          )}

          {/* Linear Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              <span>Barra de Conclusão do Ambiente</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                {conferidos} / {total} ({conferidosPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden border border-zinc-200/60 dark:border-zinc-800">
              <div
                className={`h-full transition-all duration-500 ${
                  isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                }`}
                style={{ width: `${conferidosPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
