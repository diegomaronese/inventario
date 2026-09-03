import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, ExtraItem, UserProfile, ItemStatus, ItemCondition, SyncReport } from '../types';
import { dataService } from '../services/dataService';
import { soundService } from '../services/soundService';
import confetti from 'canvas-confetti';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  X,
  Download,
  Copy,
  Package,
  Zap,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Clock,
  UserCheck,
  ArrowRight,
  ListFilter,
} from 'lucide-react';
import { ItemEditConferenceModal } from './ItemEditConferenceModal';

interface DataReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ambiente: string;
  items: InventoryItem[];
  extraItems: ExtraItem[];
  user: UserProfile;
  onQuickUpdateStatus: (
    itemId: string,
    status: ItemStatus,
    condition?: ItemCondition,
    notes?: string,
    realAmbiente?: string
  ) => void;
  onSendToSheets: () => Promise<SyncReport | null>;
  isSending: boolean;
}

export const DataReviewModal: React.FC<DataReviewModalProps> = ({
  isOpen,
  onClose,
  ambiente,
  items,
  extraItems,
  user,
  onQuickUpdateStatus,
  onSendToSheets,
  isSending,
}) => {
  const [sentSuccessReport, setSentSuccessReport] = useState<SyncReport | null>(null);
  const [isCopiedTSV, setIsCopiedTSV] = useState(false);
  const [isCopiedExtrasTSV, setIsCopiedExtrasTSV] = useState(false);
  const [showResendConfirmModal, setShowResendConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumo' | 'itens'>('resumo');
  const [itemStatusFilter, setItemStatusFilter] = useState<'TODOS' | 'ALTERADOS' | ItemStatus>('TODOS');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [justifyingItemId, setJustifyingItemId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');

  // Staged items state: changes are kept in local staged state until user confirms re-send
  const [stagedItems, setStagedItems] = useState<InventoryItem[]>([]);

  const config = dataService.getSheetConfig();
  const ambientItems = useMemo(() => items.filter((it) => it.ambiente === ambiente), [items, ambiente]);
  const ambientExtras = useMemo(() => extraItems.filter((ex) => ex.ambiente === ambiente), [extraItems, ambiente]);

  // Synchronize staged items whenever modal opens or ambient changes
  useEffect(() => {
    if (isOpen) {
      setStagedItems(items.filter((it) => it.ambiente === ambiente).map((it) => ({ ...it })));
      setActiveTab('resumo');
      setItemStatusFilter('TODOS');
    }
  }, [isOpen, ambiente, items]);

  // Track which items have been altered in this review session
  const changedItemsMap = useMemo(() => {
    const map = new Map<string, { original: InventoryItem; staged: InventoryItem }>();
    stagedItems.forEach((staged) => {
      const orig = ambientItems.find((it) => it.id === staged.id);
      if (!orig) return;
      const isDiff =
        orig.status !== staged.status ||
        (orig.estadoConservacao || '') !== (staged.estadoConservacao || '') ||
        (orig.observacoes || '') !== (staged.observacoes || '') ||
        (orig.ambienteVerificado || '') !== (staged.ambienteVerificado || '');
      if (isDiff) {
        map.set(staged.id, { original: orig, staged });
      }
    });
    return map;
  }, [stagedItems, ambientItems]);

  const changedItemsCount = changedItemsMap.size;

  const localizados = useMemo(() => stagedItems.filter((it) => it.status === 'LOCALIZADO'), [stagedItems]);
  const naoLocalizados = useMemo(() => stagedItems.filter((it) => it.status === 'NAO_LOCALIZADO'), [stagedItems]);
  const divergentes = useMemo(() => stagedItems.filter((it) => it.status === 'DIVERGENCIA_LOCAL'), [stagedItems]);
  const pendentes = useMemo(() => stagedItems.filter((it) => it.status === 'PENDENTE'), [stagedItems]);

  const previousSync = useMemo(() => {
    return dataService.getLastSyncForAmbiente(ambiente);
  }, [ambiente, items]);

  const isComplete = pendentes.length === 0 && stagedItems.length > 0;
  const progressPercent =
    stagedItems.length > 0
      ? Math.round(((stagedItems.length - pendentes.length) / stagedItems.length) * 100)
      : 100;

  const filteredItems = useMemo(() => {
    if (itemStatusFilter === 'TODOS') return stagedItems;
    if (itemStatusFilter === 'ALTERADOS') {
      return stagedItems.filter((it) => changedItemsMap.has(it.id));
    }
    return stagedItems.filter((it) => it.status === itemStatusFilter);
  }, [stagedItems, itemStatusFilter, changedItemsMap]);

  // Stage updates locally inside modal until resubmission confirmation
  const handleStageUpdateStatus = (
    itemId: string,
    status: ItemStatus,
    condition?: ItemCondition,
    notes?: string,
    realAmbiente?: string
  ) => {
    setStagedItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          status,
          estadoConservacao: condition !== undefined ? condition : item.estadoConservacao || 'BOM',
          observacoes: notes !== undefined ? notes : item.observacoes,
          ambienteVerificado: realAmbiente || item.ambienteVerificado || ambiente,
          verificadoEm: new Date().toISOString(),
          verificadoPor: user?.email,
          verificadoPorNome: user?.name,
        };
      })
    );
  };

  if (!isOpen) return null;

  // Trigger sending after user confirmation (or directly if never sent)
  const executeSend = async () => {
    setShowResendConfirmModal(false);

    // Commit any staged changes to dataService so syncToGoogleSheets sends the latest data
    stagedItems.forEach((staged) => {
      if (changedItemsMap.has(staged.id)) {
        dataService.updateItem(staged.id, {
          status: staged.status,
          estadoConservacao: staged.estadoConservacao,
          observacoes: staged.observacoes,
          ambienteVerificado: staged.ambienteVerificado,
          verificadoEm: staged.verificadoEm || new Date().toISOString(),
          verificadoPor: staged.verificadoPor || user?.email,
          verificadoPorNome: staged.verificadoPorNome || user?.name,
        });
      }
    });

    const report = await onSendToSheets();
    if (report) {
      setSentSuccessReport(report);
      soundService.playCompletionChime();
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F2BA00', '#10B981', '#3B82F6', '#FFFFFF'],
        });
      } catch {
        // Confetti fallback
      }
    }
  };

  const handleSendClick = () => {
    if (!isComplete || isSending) return;
    // If the location has already been submitted previously, prompt for explicit confirmation
    if (previousSync) {
      setShowResendConfirmModal(true);
    } else {
      executeSend();
    }
  };

  const handleCopyTSV = () => {
    const tsv = dataService.exportTSVForClipboard(ambiente);
    navigator.clipboard.writeText(tsv);
    setIsCopiedTSV(true);
    soundService.playSuccessBeep();
    setTimeout(() => setIsCopiedTSV(false), 3000);
  };

  const handleCopyExtrasTSV = () => {
    const tsv = dataService.exportExtrasTSVForClipboard(ambiente);
    navigator.clipboard.writeText(tsv);
    setIsCopiedExtrasTSV(true);
    soundService.playSuccessBeep();
    setTimeout(() => setIsCopiedExtrasTSV(false), 3000);
  };

  const handleDownloadCSV = () => {
    const csvContent = dataService.exportCSV(ambiente);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `UTFPR_Conferencia_${ambiente.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveJustification = (itemId: string) => {
    handleStageUpdateStatus(
      itemId,
      'NAO_LOCALIZADO',
      undefined,
      justificationText.trim() || 'Item não localizado durante conferência presencial no ambiente.'
    );
    setJustifyingItemId(null);
    setJustificationText('');
  };

  return (
    <>
      <div
        id="modal-data-review"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      >
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] transition-colors duration-200">
          {/* Header */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Conferência de Inventário</span>
                  {previousSync && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-semibold">
                      Já Enviado
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs sm:max-w-md">
                  Ambiente: <strong className="text-amber-600 dark:text-amber-400">{ambiente}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-300 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Previous Sync Banner (if already sent previously) */}
          {!sentSuccessReport && previousSync && (
            <div className="px-4 py-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>
                  Conferência deste local já enviada em <strong>{previousSync.timestamp}</strong> por{' '}
                  <strong>{previousSync.servidor}</strong>.
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded flex-shrink-0">
                Pronto para Reenvio
              </span>
            </div>
          )}

          {/* Navigation Tabs (Resumo vs Itens para Alteração) */}
          {!sentSuccessReport && (
            <div className="flex border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('resumo')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'resumo'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Resumo Geral
              </button>
              <button
                type="button"
                id="btn-tab-review-items"
                onClick={() => setActiveTab('itens')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'itens'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <span>Conferir & Alterar Itens</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
                  {ambientItems.length}
                </span>
                {changedItemsCount > 0 && (
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500 text-zinc-950 font-bold">
                    {changedItemsCount} alterado{changedItemsCount > 1 ? 's' : ''}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Modal Body */}
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs text-zinc-800 dark:text-zinc-200">
            {sentSuccessReport ? (
              /* Success confirmation screen */
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-2 border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {previousSync
                      ? 'Dados Reenviados com Sucesso!'
                      : sentSuccessReport.status === 'SUCESSO'
                      ? 'Conferência Concluída!'
                      : 'Conferência Salva com Sucesso!'}
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 max-w-md mx-auto leading-relaxed">
                    {sentSuccessReport.mensagem}
                  </p>
                  {previousSync && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold mt-1 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      As informações atualizadas foram salvas na planilha oficial e refletidas imediatamente nos cards dos itens na tela de conferência.
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 max-w-md mx-auto text-left space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-900 pb-1.5">
                    <span className="text-zinc-500">Data/Hora:</span>
                    <span className="text-zinc-800 dark:text-zinc-300 font-semibold">
                      {sentSuccessReport.timestamp}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-900 pb-1.5">
                    <span className="text-zinc-500">Servidor Conferente:</span>
                    <span className="text-zinc-800 dark:text-zinc-300 font-semibold">
                      {sentSuccessReport.servidor}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-900 pb-1.5">
                    <span className="text-zinc-500">Itens Localizados:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {sentSuccessReport.localizados}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-900 pb-1.5">
                    <span className="text-zinc-500">Não Localizados:</span>
                    <span className="text-rose-600 dark:text-red-400 font-bold">
                      {sentSuccessReport.naoLocalizados}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-900 pb-1.5">
                    <span className="text-zinc-500">Divergências Registradas:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {sentSuccessReport.divergentes}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Itens Extras (Sobras):</span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">{sentSuccessReport.extras}</span>
                  </div>
                </div>

                {/* Action buttons on completion */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={handleCopyTSV}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                    title="Copiar dados dos bens conferidos para a área de transferência"
                  >
                    <Copy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>{isCopiedTSV ? 'Copiado (Bens)!' : 'Copiar Bens (Ctrl+V)'}</span>
                  </button>

                  {ambientExtras.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyExtrasTSV}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                      title="Copiar dados dos itens extras para a área de transferência"
                    >
                      <Copy className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>{isCopiedExtrasTSV ? 'Copiado (Extras)!' : 'Copiar Extras (Ctrl+V)'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Baixar CSV</span>
                  </button>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSentSuccessReport(null);
                      setActiveTab('itens');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                    <span>Alterar Conferência ou Reenviar Novamente</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    Retornar ao Painel do Inventário
                  </button>
                </div>
              </div>
            ) : activeTab === 'itens' ? (
              /* TAB: View & Alter All Items in Location */
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <ListFilter className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Filtrar Itens por Situação:</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(['TODOS', 'LOCALIZADO', 'NAO_LOCALIZADO', 'DIVERGENCIA_LOCAL', 'PENDENTE'] as const).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setItemStatusFilter(st)}
                          className={`text-[10px] px-2 py-1 rounded-md font-semibold transition cursor-pointer ${
                            itemStatusFilter === st
                              ? 'bg-amber-500 text-zinc-950 font-bold'
                              : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {st === 'TODOS'
                            ? `Todos (${ambientItems.length})`
                            : st === 'LOCALIZADO'
                            ? `Localizados (${localizados.length})`
                            : st === 'NAO_LOCALIZADO'
                            ? `Não Localizados (${naoLocalizados.length})`
                            : st === 'DIVERGENCIA_LOCAL'
                            ? `Divergentes (${divergentes.length})`
                            : `Pendentes (${pendentes.length})`}
                        </button>
                      )
                    )}
                    {changedItemsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setItemStatusFilter('ALTERADOS')}
                        className={`text-[10px] px-2 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1 ${
                          itemStatusFilter === 'ALTERADOS'
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        }`}
                      >
                        <span>Alterados ({changedItemsCount})</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>
                    Mostrando <strong>{filteredItems.length}</strong> de {ambientItems.length} itens. Toque em{' '}
                    <strong>Alterar</strong> para corrigir status, estado de conservação ou observação de qualquer bem.
                  </span>
                </div>

                {/* Items List for Correction */}
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {filteredItems.map((item) => {
                    const isLoc = item.status === 'LOCALIZADO';
                    const isNaoLoc = item.status === 'NAO_LOCALIZADO';
                    const isDiv = item.status === 'DIVERGENCIA_LOCAL';
                    const isPend = item.status === 'PENDENTE';
                    const isAltered = changedItemsMap.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border text-xs space-y-2 transition ${
                          isAltered
                            ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80 shadow-2xs'
                            : isLoc
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                            : isNaoLoc
                            ? 'bg-rose-50/40 dark:bg-red-950/20 border-rose-200/80 dark:border-rose-800/40'
                            : isDiv
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40'
                            : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <span>{item.descricao}</span>
                              {isAltered && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500 text-zinc-950 uppercase shadow-2xs">
                                  Alterado
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span>
                                Tombo: <strong className="text-amber-700 dark:text-amber-400">{item.patrimonio}</strong>
                              </span>
                              {item.patrimonioAntigo && <span>• Antigo: {item.patrimonioAntigo}</span>}
                              {item.estadoConservacao && (
                                <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                                  Conservação: {item.estadoConservacao}
                                </span>
                              )}
                            </div>
                            {item.observacoes && (
                              <div className="text-[10px] text-zinc-600 dark:text-zinc-400 italic mt-1 bg-zinc-100/70 dark:bg-zinc-900 px-2 py-0.5 rounded">
                                Obs: {item.observacoes}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                isLoc
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : isNaoLoc
                                  ? 'bg-rose-100 text-rose-800 dark:bg-red-950 dark:text-red-300'
                                  : isDiv
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {isLoc
                                ? 'Confirmado'
                                : isNaoLoc
                                ? 'Não Localizado'
                                : isDiv
                                ? 'Divergência'
                                : 'Pendente'}
                            </span>
                          </div>
                        </div>

                        {/* Quick Action & Full Alter Button */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/80">
                          <button
                            type="button"
                            onClick={() => handleStageUpdateStatus(item.id, 'LOCALIZADO')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                              isLoc
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'bg-zinc-100 hover:bg-emerald-50 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-emerald-950 dark:text-zinc-300'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirmado</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStageUpdateStatus(item.id, 'NAO_LOCALIZADO')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                              isNaoLoc
                                ? 'bg-rose-600 text-white font-bold'
                                : 'bg-zinc-100 hover:bg-rose-50 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-red-950 dark:text-zinc-300'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Não Localizado</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                            title="Alterar dados completos da conferência (condição, situação, observação)"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Alterar Detalhes</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* TAB: Resumo Geral */
              <>
                {/* Progress and status metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">
                      Total do Local
                    </span>
                    <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      {ambientItems.length}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                      Localizados
                    </span>
                    <span className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                      {localizados.length}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40">
                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                      Divergências
                    </span>
                    <span className="text-xl font-bold text-amber-800 dark:text-amber-300">
                      {divergentes.length}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-red-950/30 border border-rose-200/80 dark:border-red-800/40">
                    <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-red-400 block">
                      Não Localizados
                    </span>
                    <span className="text-xl font-bold text-rose-800 dark:text-red-300">
                      {naoLocalizados.length}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Status Geral da Conferência:
                    </span>
                    <span
                      className={`font-bold ${
                        isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {progressPercent}% ({ambientItems.length - pendentes.length} de {ambientItems.length} itens conferidos)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Alteration Callout for Resubmission */}
                {previousSync && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                        <span className="font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-100">
                          Alterar Informações dos Itens para Reenvio
                        </span>
                        {changedItemsCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 shadow-2xs">
                            {changedItemsCount} item(ns) alterado(s)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                        Caso tenha errado alguma indicação no local, você pode alterar status, estado de conservação ou observações na aba de itens antes de reenviar à planilha oficial.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('itens')}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer whitespace-nowrap self-start sm:self-auto active:scale-95"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>Conferir & Alterar Itens</span>
                    </button>
                  </div>
                )}

                {/* Incomplete warning OR 100% Ready message */}
                {!isComplete ? (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-red-950/50 border border-rose-200 dark:border-red-800 text-rose-900 dark:text-red-200 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-red-300 text-sm">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>
                        Conferência Incompleta ({pendentes.length} pendente
                        {pendentes.length > 1 ? 's' : ''})
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-rose-800 dark:text-red-200">
                      <strong>Não é permitido o envio dos dados</strong> sem que a situação atual de todos os itens designados para sua conferência esteja registrada.
                    </p>

                    <div className="pt-2 space-y-2">
                      <p className="text-[11px] uppercase font-bold text-rose-700 dark:text-red-300">
                        Itens que faltam informar localização ou justificativa:
                      </p>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {pendentes.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                  {item.descricao}
                                </div>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                  Patrimônio:{' '}
                                  <span className="text-amber-700 dark:text-amber-400 font-bold">
                                    {item.patrimonio}
                                  </span>{' '}
                                  • {item.tipoItem}
                                </div>
                              </div>
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] uppercase font-semibold">
                                Pendente
                              </span>
                            </div>

                            {/* Quick resolution actions */}
                            {justifyingItemId === item.id ? (
                              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                                <textarea
                                  value={justificationText}
                                  onChange={(e) => setJustificationText(e.target.value)}
                                  placeholder="Informe a justificativa (ex: item descartado / não encontrado no armário)..."
                                  rows={2}
                                  className="w-full p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveJustification(item.id)}
                                    className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                                  >
                                    Confirmar Não Localizado
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setJustifyingItemId(null)}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleStageUpdateStatus(item.id, 'LOCALIZADO')}
                                  className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Marcar Localizado</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setJustifyingItemId(item.id);
                                    setJustificationText('');
                                  }}
                                  className="flex-1 py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-red-950/80 dark:hover:bg-red-900 border border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-300 font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Não Localizado</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* All items verified message */
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      {previousSync ? 'Conferência Pronta para Reenvio!' : 'Conferência 100% Validada!'}
                    </h4>
                    <p className="text-xs text-emerald-800/90 dark:text-emerald-200/90 leading-relaxed max-w-md mx-auto">
                      {previousSync
                        ? `Todos os ${ambientItems.length} itens do local "${ambiente}" estão com status definido. Caso tenha alterado alguma indicação, clique em Reenviar para atualizar a planilha oficial.`
                        : `Todos os itens do ambiente "${ambiente}" tiveram sua situação conferida. Você já pode enviar as atualizações diretamente à planilha institucional.`}
                    </p>
                    {config.webhookUrl ? (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-700/60 font-semibold">
                        <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Webhook Google Apps Script Conectado para Gravação Instantânea</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-700/60 font-semibold">
                        <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Integração com a Planilha Oficial Ativa</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Extra items preview */}
                {ambientExtras.length > 0 && (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Itens Não Cadastrados Registrados ({ambientExtras.length}):
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {ambientExtras.map((ex) => (
                        <div
                          key={ex.id}
                          className="text-[11px] p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-2 shadow-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-700 dark:text-amber-400">{ex.patrimonio}</span>
                              <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{ex.descricao}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              Estado: <strong className="text-zinc-700 dark:text-zinc-300">{ex.estadoConservacao || 'BOM'}</strong> • Por: {ex.cadastradoPorNome || ex.cadastradoPor}
                            </div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono flex-shrink-0">
                            {ex.cadastradoEm
                              ? ex.cadastradoEm.includes('/')
                                ? ex.cadastradoEm.split(',')[0]
                                : new Date(ex.cadastradoEm).toLocaleDateString('pt-BR')
                              : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!sentSuccessReport && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs border border-zinc-200/80 dark:border-zinc-700 transition cursor-pointer"
              >
                Voltar à Listagem
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {activeTab === 'resumo' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('itens')}
                    className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Alterar Itens ({ambientItems.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-send-data-to-sheets"
                  onClick={handleSendClick}
                  disabled={!isComplete || isSending}
                  className={`w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
                    isComplete && !isSending
                      ? previousSync
                        ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 ring-2 ring-amber-400/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 opacity-60 cursor-not-allowed border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmitindo Dados à Planilha...</span>
                    </>
                  ) : previousSync ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Reenviar Dados para a Planilha</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirmar e Gravar na Planilha</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RE-SUBMISSION CONFIRMATION MODAL */}
      {showResendConfirmModal && previousSync && (
        <div
          id="modal-confirm-resend"
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-zinc-900 border-2 border-amber-500/80 dark:border-amber-500/60 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                  Confirmar Reenvio dos Dados
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Local: <strong className="text-amber-700 dark:text-amber-400">{ambiente}</strong>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Os dados deste local já foram enviados anteriormente:
              </p>
              <div className="bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-800/40 text-[11px] space-y-1 font-mono">
                <div>
                  • Data/Hora: <strong>{previousSync.timestamp}</strong>
                </div>
                <div>
                  • Servidor: <strong>{previousSync.servidor}</strong>
                </div>
              </div>
              {changedItemsCount > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>{changedItemsCount} item(ns) alterado(s)</strong> nesta revisão serão enviados à planilha oficial e atualizados nos cards de conferência.
                  </span>
                </div>
              )}
              <p className="leading-relaxed pt-1">
                Deseja realmente <strong>reenviar os dados da conferência deste local</strong>? As novas indicações e correções substituirão os dados na planilha oficial institucional.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
              <button
                type="button"
                id="btn-cancel-resend"
                onClick={() => setShowResendConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-resend"
                onClick={executeSend}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sim, Reenviar Dados do Local</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Conference Edit Modal (Accessible from items list inside review) */}
      <ItemEditConferenceModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        currentAmbiente={ambiente}
        user={user}
        onSave={(itemId, status, condition, notes, realAmbiente) => {
          handleStageUpdateStatus(itemId, status, condition, notes, realAmbiente);
          setEditingItem(null);
        }}
      />
    </>
  );
};
