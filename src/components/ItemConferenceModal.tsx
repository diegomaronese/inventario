import React, { useState } from 'react';
import { InventoryItem, ItemCondition, ItemStatus, UserProfile } from '../types';
import { CheckCircle2, AlertTriangle, MapPin, Check, X, ShieldAlert } from 'lucide-react';
import { soundService } from '../services/soundService';

interface ItemConferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedCode: string;
  matchedItem: InventoryItem | null;
  currentAmbiente: string;
  user: UserProfile;
  onConfirmItem: (itemId: string, status: ItemStatus, condition: ItemCondition, notes: string, realAmbiente?: string) => void;
  onOpenExtraItemForm: (scannedCode: string, item?: InventoryItem | null) => void;
}

export const ItemConferenceModal: React.FC<ItemConferenceModalProps> = ({
  isOpen,
  onClose,
  scannedCode,
  matchedItem,
  currentAmbiente,
  user,
  onConfirmItem,
  onOpenExtraItemForm,
}) => {
  const [condition, setCondition] = useState<ItemCondition>(matchedItem?.estadoConservacao || 'BOM');
  const [notes, setNotes] = useState(matchedItem?.observacoes || '');
  const [transferToCurrent, setTransferToCurrent] = useState(true);

  if (!isOpen) return null;

  // Determine scenario
  const isFoundInCurrentAmbiente = matchedItem && matchedItem.ambiente.toLowerCase() === currentAmbiente.toLowerCase();
  const isFoundInAnotherAmbiente = matchedItem && matchedItem.ambiente.toLowerCase() !== currentAmbiente.toLowerCase();
  const isNotFoundAtAll = !matchedItem;

  const handleConfirmVerified = () => {
    if (!matchedItem) return;
    soundService.playSuccessBeep();
    onConfirmItem(matchedItem.id, 'LOCALIZADO', condition, notes, currentAmbiente);
    onClose();
  };

  const handleConfirmDivergent = () => {
    if (!matchedItem) return;
    soundService.playWarningBeep();
    const finalAmbiente = transferToCurrent ? currentAmbiente : matchedItem.ambiente;
    const finalNotes = notes || (transferToCurrent ? `Item transferido fisicamente para ${currentAmbiente}` : `Item divergente localizado em ${currentAmbiente}`);
    onConfirmItem(matchedItem.id, 'DIVERGENCIA_LOCAL', condition, finalNotes, finalAmbiente);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors duration-200">
        {/* Modal Header according to scenario */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isFoundInCurrentAmbiente
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
              : isFoundInAnotherAmbiente
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-red-950/60 border-rose-200/80 dark:border-red-800/80 text-rose-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isFoundInCurrentAmbiente
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40'
                  : isFoundInAnotherAmbiente
                  ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40'
                  : 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40'
              }`}
            >
              {isFoundInCurrentAmbiente && <CheckCircle2 className="w-6 h-6" />}
              {isFoundInAnotherAmbiente && <AlertTriangle className="w-6 h-6" />}
              {isNotFoundAtAll && <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                {isFoundInCurrentAmbiente && 'Item Localizado na Lista do Ambiente'}
                {isFoundInAnotherAmbiente && 'Atenção: Item Alocado em Outro Ambiente'}
                {isNotFoundAtAll && 'Código Não Localizado no Inventário'}
              </h3>
              <p className="text-xs opacity-85">
                Código Lido: <span className="font-bold">{scannedCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-sm text-zinc-800 dark:text-zinc-200">
          {/* SCENARIO 1: Item matches current room */}
          {isFoundInCurrentAmbiente && matchedItem && (
            <div className="space-y-4">
              {/* Item Card Details */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {matchedItem.descricao}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-zinc-800">
                      Tombo: {matchedItem.patrimonio}
                    </span>
                    {matchedItem.patrimonioAntigo && (
                      <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                        Antigo: {matchedItem.patrimonioAntigo}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-900 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Local: {matchedItem.ambiente} ({matchedItem.bloco})</span>
                </div>
              </div>

              {/* State of Conservation */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Estado de Conservação do Bem:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['BOM', 'REGULAR', 'RUIM', 'OCIOSO', 'RECUPERAVEL', 'INSERVIVEL'] as ItemCondition[]).map(
                    (cond) => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setCondition(cond)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer active:scale-95 ${
                          condition === cond
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950 border-emerald-600 dark:border-emerald-400 font-bold shadow-xs'
                            : 'bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        {cond}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Observações (opcional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Em perfeito estado, etiqueta legível."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmVerified}
                  id="btn-confirm-item-verified"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <Check className="w-5 h-5" />
                  <span>Confirmar Localização do Bem</span>
                </button>
              </div>
            </div>
          )}

          {/* SCENARIO 2: Item registered in another room (Divergence) */}
          {isFoundInAnotherAmbiente && matchedItem && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Divergência de Localização Detectada
                </p>
                <p className="leading-relaxed">
                  Este bem está cadastrado originalmente no setor <strong>{matchedItem.ambiente}</strong> ({matchedItem.bloco}).
                </p>
                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block uppercase font-bold">Local no Cadastro:</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{matchedItem.ambiente}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-100/70 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/60">
                    <span className="text-[10px] text-amber-800 dark:text-amber-400 block uppercase font-bold">Local Atual da Leitura:</span>
                    <span className="text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {currentAmbiente}
                    </span>
                  </div>
                </div>
              </div>

              {/* Item Summary */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">{matchedItem.descricao}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Tombo: <strong className="text-amber-700 dark:text-amber-400 font-bold">{matchedItem.patrimonio}</strong>
                  {matchedItem.patrimonioAntigo && <span> • Nº Antigo: {matchedItem.patrimonioAntigo}</span>}
                </div>
              </div>

              {/* Transfer toggle */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transferToCurrent}
                    onChange={(e) => setTransferToCurrent(e.target.checked)}
                    className="mt-1 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                      Registrar Transferência Física para este Ambiente ({currentAmbiente})
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                      Grava na planilha que o bem foi remanejado para o local atual da conferência.
                    </span>
                  </div>
                </label>
              </div>

              {/* Justification note */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Justificativa / Motivo da Divergência:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Equipamento transferido de setor para uso contínuo."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmDivergent}
                  id="btn-confirm-divergent-item"
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Registrar Divergência com Justificativa</span>
                </button>
              </div>
            </div>
          )}

          {/* SCENARIO 3: Barcode not found in inventory */}
          {isNotFoundAtAll && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-red-950/40 border border-rose-200/80 dark:border-red-800/60 text-xs text-rose-900 dark:text-red-200 space-y-2">
                <p className="font-semibold text-rose-700 dark:text-red-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Item Não Localizado na Base do Campus
                </p>
                <p className="leading-relaxed">
                  O código lido (<strong className="font-bold">{scannedCode}</strong>) não consta cadastrado na planilha de inventário.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-2">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-200">Como você deseja proceder?</h4>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                  Você pode cadastrar este item como <strong>Sobra / Item Encontrado no Local</strong> para constar no relatório da comissão de inventário.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenExtraItemForm(scannedCode, matchedItem);
                  }}
                  id="btn-register-as-extra"
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Cadastrar como Item Encontrado (Sobra/Extra)</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs border border-zinc-200/80 dark:border-zinc-700 transition cursor-pointer"
                >
                  Cancelar e Voltar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
