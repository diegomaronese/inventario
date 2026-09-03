import React, { useState, useEffect } from 'react';
import { ItemCondition, InventoryItem, UserProfile } from '../types';
import { X, PackagePlus, Check, MapPin, AlertTriangle, Info } from 'lucide-react';
import { soundService } from '../services/soundService';

interface ExtraItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
  initialDescricao?: string;
  initialEstadoConservacao?: ItemCondition;
  initialObservacoes?: string;
  originalItem?: InventoryItem | null;
  currentBloco: string;
  currentAmbiente: string;
  user: UserProfile;
  onSaveExtraItem: (
    itemData: {
      patrimonio: string;
      descricao: string;
      bloco: string;
      ambiente: string;
      estadoConservacao: ItemCondition;
      observacoes: string;
    },
    originalItemId?: string
  ) => void;
}

export const ExtraItemModal: React.FC<ExtraItemModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
  initialDescricao = '',
  initialEstadoConservacao = 'BOM',
  initialObservacoes = '',
  originalItem = null,
  currentBloco,
  currentAmbiente,
  user,
  onSaveExtraItem,
}) => {
  const [patrimonio, setPatrimonio] = useState(initialCode);
  const [descricao, setDescricao] = useState(initialDescricao);
  const [estadoConservacao, setEstadoConservacao] = useState<ItemCondition>(initialEstadoConservacao);
  const [observacoes, setObservacoes] = useState(initialObservacoes);

  useEffect(() => {
    if (isOpen) {
      setPatrimonio(initialCode || originalItem?.patrimonio || '');
      setDescricao(initialDescricao || originalItem?.descricao || '');
      setEstadoConservacao(initialEstadoConservacao || originalItem?.estadoConservacao || 'BOM');
      setObservacoes(
        initialObservacoes ||
          (originalItem
            ? `Cadastrado originalmente em: ${originalItem.ambiente} (${originalItem.bloco})`
            : '')
      );
    }
  }, [isOpen, initialCode, initialDescricao, initialEstadoConservacao, initialObservacoes, originalItem]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return;

    soundService.playSuccessBeep();
    onSaveExtraItem(
      {
        patrimonio: patrimonio.trim() || `S/N-${Date.now().toString().slice(-4)}`,
        descricao: descricao.trim(),
        bloco: currentBloco,
        ambiente: currentAmbiente,
        estadoConservacao,
        observacoes: observacoes.trim(),
      },
      originalItem?.id
    );
    onClose();
  };

  const isDivergentFromOtherRoom = Boolean(
    originalItem && originalItem.ambiente.toLowerCase() !== currentAmbiente.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] transition-colors duration-200">
        {/* Modal Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDivergentFromOtherRoom
              ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200/80 dark:border-amber-500/30'
              : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isDivergentFromOtherRoom
                  ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40'
                  : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
              }`}
            >
              {isDivergentFromOtherRoom ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <PackagePlus className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isDivergentFromOtherRoom
                  ? 'Item de Outro Local (Pré-Preenchido)'
                  : 'Registrar Item no Local / Sobra'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isDivergentFromOtherRoom
                  ? 'Confirme os dados e o estado de conservação do bem'
                  : 'Item físico encontrado durante a conferência'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative banner if item exists in another room */}
        {isDivergentFromOtherRoom && originalItem && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Item Consta no Cadastro do Campus</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90">
              Este item foi localizado na base no setor <strong>{originalItem.ambiente}</strong> ({originalItem.bloco}). As informações já foram carregadas abaixo para registrar a presença neste local (<strong>{currentAmbiente}</strong>) e seu estado de conservação.
            </p>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs text-zinc-800 dark:text-zinc-200">
          {/* Current Location */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">Local Atual da Conferência:</span>
              <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {currentAmbiente}
              </span>
            </div>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800">
              {currentBloco}
            </span>
          </div>

          {/* Barcode/Patrimonio */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Número do Tombo (Patrimônio):
            </label>
            <input
              type="text"
              value={patrimonio}
              onChange={(e) => setPatrimonio(e.target.value)}
              placeholder="Ex: 096552 ou deixe em branco se não houver tombo"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
            {originalItem?.patrimonioAntigo && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Tombo Antigo na base: {originalItem.patrimonioAntigo}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Descrição do Bem: <span className="text-amber-600 dark:text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Cadeira giratória estofada preta"
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* State of conservation */}
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Estado de Conservação: <span className="text-amber-600 dark:text-amber-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['BOM', 'REGULAR', 'RUIM', 'OCIOSO', 'RECUPERAVEL', 'INSERVIVEL'] as ItemCondition[]).map(
                (cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setEstadoConservacao(cond)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer active:scale-95 ${
                      estadoConservacao === cond
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-xs'
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
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Observações / Justificativa:
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Equipamento transferido fisicamente para este setor."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-save-extra-item"
              disabled={!descricao.trim()}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-5 h-5" />
              <span>Salvar e Registrar Localização</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
