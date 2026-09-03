import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { InventoryItem, ExtraItem, UserProfile, ItemStatus, ItemCondition } from '../types';
import {
  QrCode,
  Building2,
  MapPin,
  Search,
  Package,
  PackagePlus,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
  Clock,
  ChevronDown,
  Trash2,
  Lock,
  Edit3,
  FileText,
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { dataService } from '../services/dataService';
import { EnvironmentDonutChart } from './EnvironmentDonutChart';

interface ConferenceDashboardProps {
  user: UserProfile;
  items: InventoryItem[];
  extraItems: ExtraItem[];
  allBlocos: string[];
  selectedBloco: string;
  selectedAmbiente: string;
  onSelectBloco: (bloco: string) => void;
  onSelectAmbiente: (ambiente: string) => void;
  onOpenScanner: () => void;
  onOpenExtraModal: () => void;
  onOpenReviewModal: () => void;
  onQuickUpdateStatus: (itemId: string, status: ItemStatus, condition?: ItemCondition, notes?: string) => void;
  onDeleteExtraItem: (id: string) => void;
  onOpenReports?: () => void;
}

export const ConferenceDashboard: React.FC<ConferenceDashboardProps> = ({
  user,
  items,
  extraItems,
  allBlocos,
  selectedBloco,
  selectedAmbiente,
  onSelectBloco,
  onSelectAmbiente,
  onOpenScanner,
  onOpenExtraModal,
  onOpenReviewModal,
  onQuickUpdateStatus,
  onDeleteExtraItem,
  onOpenReports,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TODOS');
  const [editingNotesItemId, setEditingNotesItemId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');

  // Filter bar scroll preservation and sliding gesture handling
  const filterBarRef = useRef<HTMLDivElement>(null);
  const filterScrollPosRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragScrollLeftRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);

  const handleFilterScroll = () => {
    if (filterBarRef.current) {
      filterScrollPosRef.current = filterBarRef.current.scrollLeft;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!filterBarRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartXRef.current = e.pageX - filterBarRef.current.offsetLeft;
    dragScrollLeftRef.current = filterBarRef.current.scrollLeft;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !filterBarRef.current) return;
    const x = e.pageX - filterBarRef.current.offsetLeft;
    const walk = x - dragStartXRef.current;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    filterBarRef.current.scrollLeft = dragScrollLeftRef.current - walk;
    filterScrollPosRef.current = filterBarRef.current.scrollLeft;
  };

  const handlePointerUpOrLeave = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  const handleSelectFilterChip = (chipId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      return;
    }
    if (filterBarRef.current) {
      filterScrollPosRef.current = filterBarRef.current.scrollLeft;
    }
    // Remove focus so browser doesn't scroll to the focused button
    (e.currentTarget as HTMLElement).blur();
    setSelectedStatusFilter(chipId);

    // Maintain scroll offset
    requestAnimationFrame(() => {
      if (filterBarRef.current && filterScrollPosRef.current > 0) {
        filterBarRef.current.scrollLeft = filterScrollPosRef.current;
      }
    });
  };

  // Restore filter bar scroll position after state updates (such as selecting/marking an item or changing filters)
  useLayoutEffect(() => {
    if (filterBarRef.current && filterScrollPosRef.current > 0) {
      filterBarRef.current.scrollLeft = filterScrollPosRef.current;
    }
  });

  // Only reset filter bar scroll when switching to a different room or block
  useEffect(() => {
    filterScrollPosRef.current = 0;
    if (filterBarRef.current) {
      filterBarRef.current.scrollLeft = 0;
    }
  }, [selectedAmbiente, selectedBloco]);

  // Always reset scroll to the top when the conference screen mounts
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Available environments in the selected block restricted to user's assigned locations
  const ambientesInBloco = useMemo(() => {
    return dataService.getAllowedAmbientesForUser(user, selectedBloco);
  }, [user, items, selectedBloco]);

  // Filtered items in the active environment
  const activeAmbienteItems = useMemo(() => {
    return items.filter((item) => item.ambiente === selectedAmbiente);
  }, [items, selectedAmbiente]);

  // Extra items in the active environment
  const activeAmbienteExtras = useMemo(() => {
    return extraItems.filter((ex) => ex.ambiente === selectedAmbiente);
  }, [extraItems, selectedAmbiente]);

  // Counts for active environment
  const totalInAmbiente = activeAmbienteItems.length;
  const localizadosCount = activeAmbienteItems.filter((i) => i.status === 'LOCALIZADO').length;
  const divergentesCount = activeAmbienteItems.filter((i) => i.status === 'DIVERGENCIA_LOCAL').length;
  const naoLocalizadosCount = activeAmbienteItems.filter((i) => i.status === 'NAO_LOCALIZADO').length;
  const pendentesCount = activeAmbienteItems.filter((i) => i.status === 'PENDENTE').length;

  const isEnvironmentComplete = pendentesCount === 0 && totalInAmbiente > 0;
  const completionPercent = totalInAmbiente > 0
    ? Math.round(((totalInAmbiente - pendentesCount) / totalInAmbiente) * 100)
    : 0;

  // Apply search and status filter
  const displayedItems = useMemo(() => {
    return activeAmbienteItems.filter((item) => {
      // Search term (Tombo, Tombo Antigo, Descrição, Observações)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchPatrimonio = item.patrimonio.toLowerCase().includes(query);
        const matchAntigo = (item.patrimonioAntigo || '').toLowerCase().includes(query);
        const matchDesc = item.descricao.toLowerCase().includes(query);
        const matchObs = (item.observacoes || '').toLowerCase().includes(query);
        if (!matchPatrimonio && !matchAntigo && !matchDesc && !matchObs) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'TODOS') {
        if (selectedStatusFilter === 'PENDENTES' && item.status !== 'PENDENTE') return false;
        if (selectedStatusFilter === 'LOCALIZADOS' && item.status !== 'LOCALIZADO') return false;
        if (selectedStatusFilter === 'DIVERGENTES' && item.status !== 'DIVERGENCIA_LOCAL') return false;
        if (selectedStatusFilter === 'NAO_LOCALIZADOS' && item.status !== 'NAO_LOCALIZADO') return false;
      }

      return true;
    });
  }, [activeAmbienteItems, searchTerm, selectedStatusFilter]);

  // Role permissions check
  const isPresidenteOrVice = dataService.isPresidenteOrVice(user);

  const handleSaveInlineNote = (itemId: string) => {
    onQuickUpdateStatus(itemId, 'LOCALIZADO', undefined, noteInput.trim());
    setEditingNotesItemId(null);
    setNoteInput('');
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-32 sm:pb-28">
      {/* Top Location & Access Header Card */}
      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 tracking-tight flex items-center gap-2">
              <span>Conferência de Inventário</span>
            </h2>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-1.5 mt-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{isPresidenteOrVice ? 'Permissão:' : 'Locais Designados:'}</span>
              <strong className="text-zinc-700 dark:text-zinc-200">
                {isPresidenteOrVice
                  ? 'Acesso Geral (Todos os Blocos e Locais)'
                  : user.ambientesDesignados.length > 0
                  ? user.ambientesDesignados.join(', ')
                  : 'Nenhum local designado'}
              </strong>
              {user.cargo && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 uppercase">
                  {user.cargo}
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Badge - Responsive 3-columns grid on mobile */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 bg-zinc-50 dark:bg-zinc-950 p-1.5 sm:p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs w-full sm:w-auto">
            <div className="px-2 sm:px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-center shadow-xs">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase block font-bold leading-tight">No Local</span>
              <span className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-100">{totalInAmbiente}</span>
            </div>
            <div className="px-2 sm:px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 text-center">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase block font-bold leading-tight">Conferidos</span>
              <span className="text-sm sm:text-base font-bold text-emerald-800 dark:text-emerald-300">
                {totalInAmbiente - pendentesCount}
              </span>
            </div>
            <div className="px-2 sm:px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-center">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase block font-bold leading-tight">Faltam</span>
              <span className="text-sm sm:text-base font-bold text-amber-800 dark:text-amber-300">
                {pendentesCount}
              </span>
            </div>
          </div>
        </div>

        {/* Exclusive President / Vice-President Executive Reports Banner */}
        {isPresidenteOrVice && onOpenReports && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Painel Executivo da Presidência</span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950">
                    PDF Oficial
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                  Relatório geral, pendências, andamento por local/servidor e divergências
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenReports}
              id="btn-open-president-reports"
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap self-stretch sm:self-auto"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400 dark:text-zinc-950" />
              <span>Gerar Relatórios</span>
            </button>
          </div>
        )}

        {/* Location Selectors restricted to designated areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
          {/* Bloco Selector */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              {isPresidenteOrVice ? 'Bloco:' : 'Bloco / Prédio:'}
            </label>
            <div className="relative">
              <select
                id="select-bloco"
                value={selectedBloco}
                onChange={(e) => onSelectBloco(e.target.value)}
                className="w-full min-h-[44px] appearance-none px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:border-amber-500 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none cursor-pointer pr-10 shadow-xs"
              >
                {allBlocos.map((bloco) => (
                  <option key={bloco} value={bloco}>
                    {bloco}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Ambiente / Local Selector */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {isPresidenteOrVice ? 'Local / Setor:' : 'Local / Setor:'}
            </label>
            <div className="relative">
              <select
                id="select-ambiente"
                value={selectedAmbiente}
                onChange={(e) => onSelectAmbiente(e.target.value)}
                className="w-full min-h-[44px] appearance-none px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:border-amber-500 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none cursor-pointer pr-10 shadow-xs"
              >
                {ambientesInBloco.map((amb) => (
                  <option key={amb} value={amb}>
                    {amb}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Room Progress Donut Chart & Analytics */}
      <EnvironmentDonutChart
        ambiente={selectedAmbiente}
        bloco={selectedBloco}
        total={totalInAmbiente}
        conferidos={totalInAmbiente - pendentesCount}
        pendentes={pendentesCount}
        localizados={localizadosCount}
        divergentes={divergentesCount}
        naoLocalizados={naoLocalizadosCount}
        extraItemsCount={activeAmbienteExtras.length}
        onFilterStatus={(status) => setSelectedStatusFilter(status)}
      />

      {/* Search & Fast Filters */}
      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs transition-colors duration-200">
        {/* Instant Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            id="input-search-items"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por tombo, nº antigo ou descrição..."
            className="w-full min-h-[44px] pl-10 pr-9 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:border-amber-500 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs (Horizontally slidable, position preserved on selection) */}
        <div
          ref={filterBarRef}
          onScroll={handleFilterScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrLeave}
          onPointerLeave={handlePointerUpOrLeave}
          className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar touch-pan-x select-none cursor-grab active:cursor-grabbing overscroll-x-contain scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {[
            { id: 'TODOS', label: 'Todos', count: totalInAmbiente },
            { id: 'PENDENTES', label: 'Pendentes', count: pendentesCount },
            { id: 'LOCALIZADOS', label: 'Localizados', count: localizadosCount },
            { id: 'DIVERGENTES', label: 'Divergências', count: divergentesCount },
            { id: 'NAO_LOCALIZADOS', label: 'Não Localizados', count: naoLocalizadosCount },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={(e) => handleSelectFilterChip(chip.id, e)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap text-xs border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 flex-shrink-0 ${
                selectedStatusFilter === chip.id
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <span>{chip.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  selectedStatusFilter === chip.id
                    ? 'bg-black/20 text-zinc-950 font-bold'
                    : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Extra items list */}
      {activeAmbienteExtras.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <PackagePlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Itens Não Cadastrados Encontrados neste Local ({activeAmbienteExtras.length}):
            </span>
          </div>

          <div className="space-y-2">
            {activeAmbienteExtras.map((ex) => (
              <div
                key={ex.id}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-950/90 border border-amber-200/90 dark:border-amber-700/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-amber-200 dark:border-zinc-800">
                      {ex.patrimonio}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{ex.descricao}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60">
                      {ex.estadoConservacao || 'BOM'}
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
                    <span>
                      Local: <strong className="text-zinc-700 dark:text-zinc-300">{ex.ambiente}</strong> ({ex.bloco})
                    </span>
                    <span>•</span>
                    <span>
                      Registrado por: <strong className="text-zinc-700 dark:text-zinc-300">{ex.cadastradoPorNome || ex.cadastradoPor}</strong>
                    </span>
                    <span>•</span>
                    <span className="font-mono text-zinc-400 dark:text-zinc-500 text-[10px]">
                      {ex.cadastradoEm ? (ex.cadastradoEm.includes('/') ? ex.cadastradoEm : new Date(ex.cadastradoEm).toLocaleString('pt-BR')) : ''}
                    </span>
                  </div>

                  {ex.observacoes && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-300/90 italic pt-0.5">
                      Obs: {ex.observacoes}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteExtraItem(ex.id)}
                  className="self-end sm:self-center p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  title="Remover item extra"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streamlined Items List for High-Speed Conference */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Itens no Local ({displayedItems.length}):
          </span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Assinale as opções ou use o leitor (toque na opção para desmarcar)
          </span>
        </div>

        {displayedItems.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-2 shadow-xs">
            <Package className="w-8 h-8 mx-auto text-zinc-400 dark:text-zinc-600" />
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Nenhum item encontrado com os filtros atuais.</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Altere o termo de busca ou selecione outro status acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedItems.map((item) => {
              const isPendente = item.status === 'PENDENTE';
              const isLocalizado = item.status === 'LOCALIZADO';
              const isDivergente = item.status === 'DIVERGENCIA_LOCAL';
              const isNaoLocalizado = item.status === 'NAO_LOCALIZADO';

              return (
                <div
                  key={item.id}
                  id={`item-card-${item.patrimonio}`}
                  className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                    isLocalizado
                      ? 'bg-emerald-50/40 dark:bg-zinc-900/95 border-emerald-300/80 dark:border-emerald-700/60 shadow-xs'
                      : isDivergente
                      ? 'bg-amber-50/40 dark:bg-zinc-900/95 border-amber-300/80 dark:border-amber-700/60 shadow-xs'
                      : isNaoLocalizado
                      ? 'bg-rose-50/40 dark:bg-zinc-900/95 border-rose-300/80 dark:border-rose-800/60'
                      : 'bg-white dark:bg-zinc-900/70 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs'
                  }`}
                >
                  {/* Top Line: Tags & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-950 text-amber-700 dark:text-amber-400 border border-zinc-200/80 dark:border-zinc-800">
                        Tombo: {item.patrimonio}
                      </span>
                      {item.patrimonioAntigo && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800">
                          Antigo: {item.patrimonioAntigo}
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div className="flex-shrink-0">
                      {isLocalizado && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmado
                        </span>
                      )}
                      {isDivergente && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Divergente
                        </span>
                      )}
                      {isNaoLocalizado && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700">
                          <X className="w-3.5 h-3.5" />
                          Não Localizado
                        </span>
                      )}
                      {isPendente && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700/80">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description & Condition */}
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                      {item.descricao}
                    </h4>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-between">
                      <span>
                        Estado: <strong className="text-zinc-700 dark:text-zinc-300">{item.estadoConservacao || 'BOM'}</strong>
                      </span>
                      {item.verificadoEm && (
                        <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">
                          Conferido: {new Date(item.verificadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes / Observation if present */}
                  {item.observacoes && (
                    <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-amber-700 dark:text-amber-300/90 italic">
                      Obs: {item.observacoes}
                    </div>
                  )}

                  {/* Inline Note Editor */}
                  {editingNotesItemId === item.id && (
                    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 space-y-2">
                      <input
                        type="text"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Adicionar observação (ex: estofado rasgado, na bancada 2)..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingNotesItemId(null)}
                          className="px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineNote(item.id)}
                          className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons: Confirmado / Não Localizado / Desmarcar / Observação */}
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    {/* Option 1: Confirmado */}
                    <button
                      type="button"
                      id={`btn-confirm-${item.patrimonio}`}
                      onClick={() => {
                        if (isLocalizado) {
                          soundService.playUndoBeep();
                          onQuickUpdateStatus(item.id, 'PENDENTE');
                        } else {
                          soundService.playSuccessBeep();
                          onQuickUpdateStatus(item.id, 'LOCALIZADO');
                        }
                      }}
                      className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                        isLocalizado
                          ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 font-bold shadow-xs ring-2 ring-emerald-500/30'
                          : 'bg-zinc-50 hover:bg-emerald-50/70 dark:bg-zinc-950 dark:hover:bg-emerald-950/30 text-zinc-700 hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-300 border border-zinc-200/80 hover:border-emerald-300 dark:border-zinc-800 dark:hover:border-emerald-700'
                      }`}
                      title={isLocalizado ? 'Opção assinalada: toque novamente para desmarcar' : 'Assinalar como Confirmado no local (toque novamente para desmarcar)'}
                    >
                      <Check className={`w-4 h-4 ${isLocalizado ? 'text-white dark:text-zinc-950 stroke-[2.5]' : 'text-zinc-400 dark:text-zinc-500'}`} />
                      <span>{isLocalizado ? 'Confirmado' : 'Confirmado'}</span>
                    </button>

                    {/* Option 2: Não Localizado */}
                    <button
                      type="button"
                      id={`btn-nao-localizado-${item.patrimonio}`}
                      onClick={() => {
                        if (isNaoLocalizado) {
                          soundService.playUndoBeep();
                          onQuickUpdateStatus(item.id, 'PENDENTE');
                        } else {
                          soundService.playErrorBeep();
                          onQuickUpdateStatus(item.id, 'NAO_LOCALIZADO');
                        }
                      }}
                      className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                        isNaoLocalizado
                          ? 'bg-rose-600 text-white font-bold shadow-xs ring-2 ring-rose-500/30'
                          : 'bg-zinc-50 hover:bg-rose-50/70 dark:bg-zinc-950 dark:hover:bg-rose-950/30 text-zinc-600 hover:text-rose-700 dark:text-zinc-400 dark:hover:text-rose-300 border border-zinc-200/80 hover:border-rose-300 dark:border-zinc-800 dark:hover:border-rose-800'
                      }`}
                      title={isNaoLocalizado ? 'Opção assinalada: toque novamente para desmarcar' : 'Assinalar como Não Localizado (toque novamente para desmarcar)'}
                    >
                      <X className={`w-4 h-4 ${isNaoLocalizado ? 'text-white stroke-[2.5]' : 'text-zinc-400 dark:text-zinc-500'}`} />
                      <span>{isNaoLocalizado ? 'Não Localizado' : 'Não Localizado'}</span>
                    </button>

                    {/* Observation note */}
                    <button
                      type="button"
                      id={`btn-notes-${item.patrimonio}`}
                      onClick={() => {
                        setEditingNotesItemId(item.id);
                        setNoteInput(item.observacoes || '');
                      }}
                      className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800 transition cursor-pointer flex items-center justify-center active:scale-95"
                      title="Adicionar ou editar observação"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Action Bar for Fast Field Operation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800 p-2.5 sm:p-3 shadow-lg transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Add Extra item button */}
          <button
            type="button"
            id="btn-bottom-add-extra"
            onClick={onOpenExtraModal}
            className="flex-1 sm:flex-initial min-h-[46px] py-2.5 px-2 sm:px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <PackagePlus className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="truncate">+ Item</span>
          </button>

          {/* Primary Barcode Scanner Trigger Button */}
          <button
            type="button"
            id="btn-bottom-open-scanner"
            onClick={onOpenScanner}
            className="flex-[1.6] sm:flex-initial min-h-[48px] py-2.5 px-3 sm:px-8 rounded-xl sm:rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <QrCode className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Ler Código</span>
          </button>

          {/* Review Data and Submit Button */}
          <button
            type="button"
            id="btn-bottom-review-data"
            onClick={onOpenReviewModal}
            className={`flex-1 sm:flex-initial min-h-[46px] py-2.5 px-2 sm:px-5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
              isEnvironmentComplete
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isEnvironmentComplete ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
            <div className="text-left leading-tight truncate">
              <span className="block truncate">Conferir</span>
              <span className="text-[10px] font-mono opacity-80">
                ({totalInAmbiente - pendentesCount}/{totalInAmbiente})
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
