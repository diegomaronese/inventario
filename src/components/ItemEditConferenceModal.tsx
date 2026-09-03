import React, { useState, useEffect } from 'react';
import { InventoryItem, ItemCondition, ItemStatus, UserProfile } from '../types';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  Check,
  Building2,
  MapPin,
  Tag,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface ItemEditConferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  currentAmbiente: string;
  user: UserProfile;
  onSave: (
    itemId: string,
    status: ItemStatus,
    condition: ItemCondition,
    notes: string,
    realAmbiente?: string
  ) => void;
}

export const ItemEditConferenceModal: React.FC<ItemEditConferenceModalProps> = ({
  isOpen,
  onClose,
  item,
  currentAmbiente,
  user,
  onSave,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus>('LOCALIZADO');
  const [selectedCondition, setSelectedCondition] = useState<ItemCondition>('BOM');
  const [notes, setNotes] = useState<string>('');
  const [customAmbiente, setCustomAmbiente] = useState<string>('');

  useEffect(() => {
    if (item) {
      setSelectedStatus(item.status === 'PENDENTE' ? 'LOCALIZADO' : item.status);
      setSelectedCondition(item.estadoConservacao || 'BOM');
      setNotes(item.observacoes || '');
      setCustomAmbiente(item.ambienteVerificado || item.ambiente || currentAmbiente);
    }
  }, [item, currentAmbiente]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    if (selectedStatus === 'PENDENTE') {
      soundService.playUndoBeep();
      onSave(item.id, 'PENDENTE', selectedCondition, notes.trim(), customAmbiente);
    } else if (selectedStatus === 'LOCALIZADO') {
      soundService.playSuccessBeep();
      onSave(item.id, 'LOCALIZADO', selectedCondition, notes.trim(), currentAmbiente);
    } else if (selectedStatus === 'NAO_LOCALIZADO') {
      soundService.playErrorBeep();
      onSave(item.id, 'NAO_LOCALIZADO', selectedCondition, notes.trim() || 'Item não localizado durante conferência presencial no ambiente.');
    } else if (selectedStatus === 'DIVERGENCIA_LOCAL') {
      soundService.playWarningBeep();
      onSave(
        item.id,
        'DIVERGENCIA_LOCAL',
        selectedCondition,
        notes.trim() || `Item localizado em ${customAmbiente || currentAmbiente}`,
        customAmbiente || currentAmbiente
      );
    } else {
      onSave(item.id, selectedStatus, selectedCondition, notes.trim(), customAmbiente);
    }
    onClose();
  };

  const isVerified = item.status !== 'PENDENTE';

  return (
    <div
      id="modal-item-edit-conference"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] transition-colors duration-200">
        {/* Header */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Alterar Conferência do Item</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tombo: <strong className="text-amber-700 dark:text-amber-400 font-bold">{item.patrimonio}</strong>
                {item.patrimonioAntigo && ` • Antigo: ${item.patrimonioAntigo}`}
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

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs text-zinc-800 dark:text-zinc-200">
          {/* Item Quick Overview */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
              {item.descricao}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                {item.bloco}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                Local: <strong className="text-zinc-700 dark:text-zinc-300">{item.ambiente}</strong>
              </span>
            </div>

            {isVerified && (
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
                <span>
                  Conferido por: <strong className="text-zinc-600 dark:text-zinc-400">{item.verificadoPorNome || item.verificadoPor || 'Conferente'}</strong>
                </span>
                {item.verificadoEm && (
                  <span className="font-mono">
                    {item.verificadoEm.includes('/') ? item.verificadoEm : new Date(item.verificadoEm).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              1. Situação da Conferência:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option: Localizado */}
              <button
                type="button"
                onClick={() => setSelectedStatus('LOCALIZADO')}
                className={`p-3 rounded-xl text-left border transition flex items-start gap-2.5 cursor-pointer ${
                  selectedStatus === 'LOCALIZADO'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                    selectedStatus === 'LOCALIZADO'
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Confirmado no Local
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                    Item encontrado fisicamente neste ambiente
                  </div>
                </div>
              </button>

              {/* Option: Não Localizado */}
              <button
                type="button"
                onClick={() => setSelectedStatus('NAO_LOCALIZADO')}
                className={`p-3 rounded-xl text-left border transition flex items-start gap-2.5 cursor-pointer ${
                  selectedStatus === 'NAO_LOCALIZADO'
                    ? 'bg-rose-50 dark:bg-red-950/40 border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/20 shadow-xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                    selectedStatus === 'NAO_LOCALIZADO'
                      ? 'bg-rose-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  <X className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Não Localizado
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                    Bem ausente ou não encontrado no setor
                  </div>
                </div>
              </button>

              {/* Option: Divergência de Local */}
              <button
                type="button"
                onClick={() => setSelectedStatus('DIVERGENCIA_LOCAL')}
                className={`p-3 rounded-xl text-left border transition flex items-start gap-2.5 cursor-pointer ${
                  selectedStatus === 'DIVERGENCIA_LOCAL'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-600 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                    selectedStatus === 'DIVERGENCIA_LOCAL'
                      ? 'bg-amber-500 text-zinc-950 font-bold'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Divergência de Local
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                    Item alocado ou encontrado em outro setor
                  </div>
                </div>
              </button>

              {/* Option: Retornar para Pendente */}
              <button
                type="button"
                onClick={() => setSelectedStatus('PENDENTE')}
                className={`p-3 rounded-xl text-left border transition flex items-start gap-2.5 cursor-pointer ${
                  selectedStatus === 'PENDENTE'
                    ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 ring-2 ring-zinc-400/20 shadow-xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                    selectedStatus === 'PENDENTE'
                      ? 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-950'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                    Desmarcar (Pendente)
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                    Remover marcação para conferir novamente
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Estado de Conservação */}
          {selectedStatus !== 'PENDENTE' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                2. Estado de Conservação:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {(['BOM', 'REGULAR', 'RUIM', 'OCIOSO', 'RECUPERAVEL', 'ANTIECONOMICO', 'INSERVIVEL'] as ItemCondition[]).map(
                  (cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setSelectedCondition(cond)}
                      className={`py-2 px-1.5 rounded-xl text-[11px] font-semibold border text-center transition cursor-pointer active:scale-95 ${
                        selectedCondition === cond
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-xs'
                          : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {cond}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span>3. Observações / Justificativa:</span>
              <span className="text-[10px] font-normal text-zinc-400">Opcional</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Item com desgaste natural no assento, etiqueta legível na lateral, transferido temporariamente..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:border-amber-500 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none shadow-xs"
            />

            {/* Quick shortcuts */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {[
                'Em perfeito estado',
                'Etiqueta desgastada',
                'Sem etiqueta física',
                'Na bancada central',
                'Avariado / Danificado',
              ].map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => setNotes((prev) => (prev ? `${prev}. ${phrase}` : phrase))}
                  className="text-[10px] px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 transition cursor-pointer"
                >
                  + {phrase}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
            Ao salvar a alteração, os dados deste bem serão corrigidos no aplicativo. Se a conferência deste local já foi transmitida anteriormente, você poderá reenviar os dados para atualizar a planilha oficial.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="btn-save-item-edit-conference"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alteração</span>
          </button>
        </div>
      </div>
    </div>
  );
};
