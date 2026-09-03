import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Flashlight, Keyboard, AlertCircle } from 'lucide-react';
import { soundService } from '../services/soundService';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
  currentAmbienteName: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onCodeScanned,
  currentAmbienteName,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'utfpr-barcode-scanner-viewport';

  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopScanner();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError(null);
        setIsScanning(true);

        // Allow DOM element to mount
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (!isMounted) return;

        const scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });

        html5QrCodeRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (decodedText && isMounted) {
              soundService.playSuccessBeep();
              onCodeScanned(decodedText.trim());
              onClose();
            }
          },
          () => {
            // Ignore scan parse frame drops
          }
        );
      } catch (err: unknown) {
        console.warn('Erro ao inicializar câmera do leitor:', err);
        if (isMounted) {
          setCameraError(
            'Não foi possível acessar a câmera do dispositivo. Verifique as permissões de câmera ou utilize a digitação manual do código patrimonial.'
          );
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, activeTab]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Erro ao parar scanner:', e);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    soundService.playSuccessBeep();
    onCodeScanned(manualCode.trim());
    setManualCode('');
    onClose();
  };

  const handleToggleTorch = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities?.();
        if (capabilities && capabilities.torchFeature?.().isSupported()) {
          const next = !torchOn;
          await html5QrCodeRef.current.applyVideoConstraints({
            advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
          });
          setTorchOn(next);
        }
      }
    } catch (e) {
      console.warn('Lanterna não suportada:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] transition-colors duration-200">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Leitor de Código de Barras
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[240px] sm:max-w-xs">
                Ambiente ativo: <strong className="text-amber-600 dark:text-amber-400">{currentAmbienteName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-scanner"
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: Camera vs Manual Input */}
        <div className="flex border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 p-1">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Câmera do Celular</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Digitar Patrimônio</span>
          </button>
        </div>

        {/* Viewport Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-zinc-800 dark:text-zinc-200">
          {activeTab === 'camera' ? (
            <div className="space-y-3">
              {/* Camera Scanner Viewport */}
              <div className="relative w-full aspect-video sm:aspect-[4/3] bg-zinc-950 rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-inner">
                <div id={scannerContainerId} className="w-full h-full object-cover"></div>

                {/* Laser animation line */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-scan-laser absolute left-0"></div>
                    <div className="w-full h-full border-2 border-dashed border-amber-400/50 rounded-xl"></div>
                  </div>
                )}

                {/* Camera error state */}
                {cameraError && (
                  <div className="p-4 text-center text-rose-700 dark:text-red-300 text-xs space-y-2 bg-rose-50 dark:bg-red-950/90 m-4 rounded-xl border border-rose-200 dark:border-red-800">
                    <AlertCircle className="w-6 h-6 mx-auto text-rose-500 dark:text-red-400" />
                    <p className="font-semibold">Acesso à câmera indisponível</p>
                    <p className="text-[11px] text-rose-600 dark:text-red-200">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition cursor-pointer"
                    >
                      Utilizar Entrada Manual
                    </button>
                  </div>
                )}
              </div>

              {/* Torch button & Help instructions */}
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Aponte a câmera para a etiqueta patrimonial
                </span>
                <button
                  onClick={handleToggleTorch}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 text-xs transition cursor-pointer"
                >
                  <Flashlight className={`w-3.5 h-3.5 ${torchOn ? 'text-amber-500' : ''}`} />
                  <span>{torchOn ? 'Desligar Luz' : 'Lanterna'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Manual Barcode Entry */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Número do Patrimônio / Código do Tombo:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Ex: 045101"
                    autoFocus
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    Buscar
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200/80 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 transition cursor-pointer"
          >
            Fechar Leitor
          </button>
        </div>
      </div>
    </div>
  );
};
