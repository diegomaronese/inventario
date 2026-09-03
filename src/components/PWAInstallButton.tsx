import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'banner' | 'header' | 'menu';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [guideType, setGuideType] = useState<'ios' | 'android-manual'>('ios');

  // If the app is already installed and opened in standalone mode, suppress the button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        // User dismissed or browser didn't open prompt
      }
    } else if (isIOS) {
      setGuideType('ios');
      setShowGuide(true);
    } else {
      setGuideType('android-manual');
      setShowGuide(true);
    }
  };

  return (
    <>
      {/* Header Variant (desktop navbar) */}
      {variant === 'header' && (
        <button
          type="button"
          id="btn-pwa-install-header"
          onClick={handleClick}
          className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-500/30 transition-all active:scale-95 cursor-pointer shadow-xs ${className}`}
          title="Instalar aplicativo na tela de início"
        >
          <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Instalar App</span>
        </button>
      )}

      {/* Menu Variant (mobile drawer item) */}
      {variant === 'menu' && (
        <button
          type="button"
          id="btn-pwa-install-menu"
          onClick={handleClick}
          className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm flex items-center justify-between border border-amber-500/30 transition cursor-pointer active:scale-98 ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Instalar App na Tela Inicial</span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300">
            {isIOS ? 'iOS / Safari' : 'Instalar'}
          </span>
        </button>
      )}

      {/* Compact Variant (top-right next to theme switch) */}
      {variant === 'compact' && (
        <button
          type="button"
          id="btn-pwa-install-compact"
          onClick={handleClick}
          className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-semibold border border-amber-500/30 transition-all active:scale-95 cursor-pointer shadow-xs ${className}`}
          title="Instalar aplicativo no seu celular ou computador"
        >
          <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Instalar App</span>
        </button>
      )}

      {/* Banner Variant (rich callout on login or bottom screen) */}
      {variant === 'banner' && (
        <div
          className={`p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-zinc-100/50 dark:to-zinc-900/50 border border-amber-500/25 flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug truncate">
                Instale o App do Inventário
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                Acesse rápido direto da sua tela inicial
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-pwa-install-banner"
            onClick={handleClick}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-extrabold shadow-sm active:scale-95 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>
        </div>
      )}

      {/* Guide Modal for iOS / Browser Manual installation */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {guideType === 'ios' ? 'Instalar no iPhone / iPad' : 'Instalar Aplicativo'}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Passo a passo para a tela de início
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {guideType === 'ios' ? (
              <div className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                    1
                  </span>
                  <p className="flex-1 leading-relaxed">
                    Abra este link no navegador <strong>Safari</strong> e toque no botão de{' '}
                    <strong>Compartilhar</strong> (<Share className="w-3.5 h-3.5 inline mx-0.5 text-amber-600 dark:text-amber-400" />) na barra inferior.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                    2
                  </span>
                  <p className="flex-1 leading-relaxed">
                    Role a lista de opções para baixo e selecione{' '}
                    <strong>Adicionar à Tela de Início</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-amber-600 dark:text-amber-400" />).
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                    3
                  </span>
                  <p className="flex-1 leading-relaxed">
                    No canto superior direito, toque em <strong>Adicionar</strong>. O ícone oficial do Inventário UTFPR aparecerá na sua tela!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                    1
                  </span>
                  <p className="flex-1 leading-relaxed">
                    No seu navegador (Chrome, Edge ou Samsung Internet), toque no menu de <strong>três pontos (⋮)</strong> no canto superior ou inferior.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                    2
                  </span>
                  <p className="flex-1 leading-relaxed">
                    Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <p className="flex-1 leading-relaxed text-zinc-600 dark:text-zinc-400">
                    O aplicativo funcionará em tela cheia como um app nativo, com leitor de código de barras e sincronização direta.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
