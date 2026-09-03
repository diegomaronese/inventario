import React, { useState } from 'react';
import { InventoryItem, ExtraItem, UserProfile, ItemStatus, SyncReport } from '../types';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Send,
  Package,
  X,
  Check,
  RefreshCw,
  FileSpreadsheet,
  Copy,
  Download,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundService } from '../services/soundService';
import { dataService } from '../services/dataService';

interface DataReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ambiente: string;
  items: InventoryItem[];
  extraItems: ExtraItem[];
  user: UserProfile;
  onQuickUpdateStatus: (itemId: string, status: ItemStatus, notes?: string) => void;
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
  const [justifyingItemId, setJustifyingItemId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [sentSuccessReport, setSentSuccessReport] = useState<SyncReport | null>(null);
  const [isCopiedTSV, setIsCopiedTSV] = useState(false);
  const [isCopiedExtrasTSV, setIsCopiedExtrasTSV] = useState(false);

  if (!isOpen) return null;

  const config = dataService.getSheetConfig();
  const ambientItems = items.filter((it) => it.ambiente === ambiente);
  const ambientExtras = extraItems.filter((ex) => ex.ambiente === ambiente);

  const localizados = ambientItems.filter((it) => it.status === 'LOCALIZADO');
  const naoLocalizados = ambientItems.filter((it) => it.status === 'NAO_LOCALIZADO');
  const divergentes = ambientItems.filter((it) => it.status === 'DIVERGENCIA_LOCAL');
  const pendentes = ambientItems.filter((it) => it.status === 'PENDENTE');

  const isComplete = pendentes.length === 0 && ambientItems.length > 0;
  const progressPercent = ambientItems.length > 0
    ? Math.round(((ambientItems.length - pendentes.length) / ambientItems.length) * 100)
    : 100;

  const handleSend = async () => {
    if (!isComplete) return;

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
    onQuickUpdateStatus(itemId, 'NAO_LOCALIZADO', justificationText.trim() || 'Item não localizado durante conferência presencial no ambiente.');
    setJustifyingItemId(null);
    setJustificationText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] transition-colors duration-200">
        {/* Header */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Conferência e Envio para Planilha
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs sm:max-w-md">
                Ambiente: <strong className="text-amber-600 dark:text-amber-400">{ambiente}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs text-zinc-800 dark:text-zinc-200">
          {sentSuccessReport ? (
            /* Success confirmation screen */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-2 border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {sentSuccessReport.status === 'SUCESSO' ? 'Conferência Concluída!' : 'Conferência Salva com Sucesso!'}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 max-w-md mx-auto leading-relaxed">
                  {sentSuccessReport.mensagem}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 max-w-md mx-auto text-left space-y-2 font-mono text-[11px]">
                <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-900 pb-1.5">
                  <span className="text-zinc-500">Data/Hora:</span>
                  <span className="text-zinc-800 dark:text-zinc-300 font-semibold">{sentSuccessReport.timestamp}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-900 pb-1.5">
                  <span className="text-zinc-500">Servidor Conferente:</span>
                  <span className="text-zinc-800 dark:text-zinc-300 font-semibold">{sentSuccessReport.servidor}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-900 pb-1.5">
                  <span className="text-zinc-500">Itens Localizados:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{sentSuccessReport.localizados}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-900 pb-1.5">
                  <span className="text-zinc-500">Não Localizados:</span>
                  <span className="text-rose-600 dark:text-red-400 font-bold">{sentSuccessReport.naoLocalizados}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-900 pb-1.5">
                  <span className="text-zinc-500">Divergências Registradas:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{sentSuccessReport.divergentes}</span>
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

              <div className="pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-xs transition cursor-pointer"
                >
                  Retornar ao Painel do Inventário
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Progress and status metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">Total do Local</span>
                  <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{ambientItems.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Localizados</span>
                  <span className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{localizados.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40">
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">Divergências</span>
                  <span className="text-xl font-bold text-amber-800 dark:text-amber-300">{divergentes.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-red-950/30 border border-rose-200/80 dark:border-red-800/40">
                  <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-red-400 block">Não Localizados</span>
                  <span className="text-xl font-bold text-rose-800 dark:text-red-300">{naoLocalizados.length}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Status Geral da Conferência:</span>
                  <span className={`font-bold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {progressPercent}% ({ambientItems.length - pendentes.length} de {ambientItems.length} itens resolvidos)
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

              {/* Validation Warning if incomplete */}
              {!isComplete ? (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-red-950/50 border border-rose-200 dark:border-red-800 text-rose-900 dark:text-red-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-red-300 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Conferência Incompleta ({pendentes.length} pendente{pendentes.length > 1 ? 's' : ''})</span>
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
                              <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.descricao}</div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                Patrimônio: <span className="text-amber-700 dark:text-amber-400 font-bold">{item.patrimonio}</span> • {item.tipoItem}
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
                                placeholder="Informe a justificativa do não comparecimento (ex: item danificado descartado / não encontrado no armário)..."
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
                                onClick={() => onQuickUpdateStatus(item.id, 'LOCALIZADO')}
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
                    Conferência 100% Validada!
                  </h4>
                  <p className="text-xs text-emerald-800/90 dark:text-emerald-200/90 leading-relaxed max-w-md mx-auto">
                    Todos os itens do ambiente <strong>{ambiente}</strong> tiveram sua situação conferida. Você já pode enviar as atualizações diretamente à planilha institucional.
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
                      <div key={ex.id} className="text-[11px] p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-2 shadow-xs">
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
                          {ex.cadastradoEm ? (ex.cadastradoEm.includes('/') ? ex.cadastradoEm.split(',')[0] : new Date(ex.cadastradoEm).toLocaleDateString('pt-BR')) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs border border-zinc-200/80 dark:border-zinc-700 transition cursor-pointer"
                >
                  Voltar à Listagem
                </button>

                <button
                  type="button"
                  id="btn-send-data-to-sheets"
                  onClick={handleSend}
                  disabled={!isComplete || isSending}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
                    isComplete && !isSending
                      ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 opacity-60 cursor-not-allowed border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                      <span>Transmitindo Dados à Planilha...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirmar e Gravar na Planilha</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

