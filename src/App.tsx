/**
 * UTFPR Campus Apucarana - Aplicativo PWA de Inventário Patrimonial
 * Sincronização em tempo real com Google Sheets e Leitor de Código de Barras
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InventoryItem, ExtraItem, UserProfile, ItemStatus, ItemCondition, SyncReport } from './types';
import { authService } from './services/authService';
import { dataService } from './services/dataService';
import { soundService } from './services/soundService';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { ConferenceDashboard } from './components/ConferenceDashboard';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ItemConferenceModal } from './components/ItemConferenceModal';
import { ExtraItemModal } from './components/ExtraItemModal';
import { DataReviewModal } from './components/DataReviewModal';
import { PresidentReportsModal } from './components/PresidentReportsModal';
import { PresidentManagementDashboard } from './components/PresidentManagementDashboard';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.getCurrentUser());
  const [items, setItems] = useState<InventoryItem[]>(dataService.getAllItems());
  const [extraItems, setExtraItems] = useState<ExtraItem[]>(dataService.getExtraItems());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [conferenceModalData, setConferenceModalData] = useState<{
    isOpen: boolean;
    scannedCode: string;
    matchedItem: InventoryItem | null;
  }>({
    isOpen: false,
    scannedCode: '',
    matchedItem: null,
  });

  const [extraModalData, setExtraModalData] = useState<{
    isOpen: boolean;
    initialCode: string;
    initialDescricao: string;
    initialEstadoConservacao: ItemCondition;
    initialObservacoes: string;
    originalItem: InventoryItem | null;
  }>({
    isOpen: false,
    initialCode: '',
    initialDescricao: '',
    initialEstadoConservacao: 'BOM',
    initialObservacoes: '',
    originalItem: null,
  });

  // Notification toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Conexão restabelecida! Modo Online.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Você está offline. Os registros serão salvos localmente.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Allowed blocks and environments correlated with server's authorized locations
  const allowedBlocos = useMemo(() => {
    return dataService.getAllowedBlocosForUser(currentUser);
  }, [currentUser, items]);

  // Selected Bloco and Ambiente
  const [selectedBloco, setSelectedBloco] = useState<string>(() => {
    const initialBlocos = dataService.getAllowedBlocosForUser(currentUser);
    return initialBlocos[0] || 'Bloco B';
  });

  const [selectedAmbiente, setSelectedAmbiente] = useState<string>(() => {
    const initialAmbientes = dataService.getAllowedAmbientesForUser(currentUser, selectedBloco);
    return initialAmbientes[0] || 'COGERH';
  });

  // Keep selectedBloco and selectedAmbiente valid whenever currentUser or items change
  useEffect(() => {
    const blocos = dataService.getAllowedBlocosForUser(currentUser);
    if (blocos.length > 0) {
      const currentBlocoValid = blocos.includes(selectedBloco);
      const targetBloco = currentBlocoValid ? selectedBloco : blocos[0];
      if (!currentBlocoValid) {
        setSelectedBloco(targetBloco);
      }

      const ambientes = dataService.getAllowedAmbientesForUser(currentUser, targetBloco);
      if (ambientes.length > 0) {
        if (!ambientes.includes(selectedAmbiente)) {
          setSelectedAmbiente(ambientes[0]);
        }
      }
    }
  }, [currentUser, items, selectedBloco, selectedAmbiente]);

  // Auto-scroll to top whenever currentUser changes (logging in or logging out)
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);
    const timeoutId = setTimeout(scrollToTop, 50);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [currentUser]);

  // When Bloco changes, adjust Ambiente to first available in that block for this user
  const handleSelectBloco = (bloco: string) => {
    setSelectedBloco(bloco);
    const availableAmbientes = dataService.getAllowedAmbientesForUser(currentUser, bloco);
    if (availableAmbientes.length > 0) {
      setSelectedAmbiente(availableAmbientes[0]);
    }
  };

  // Reload data from service
  const refreshData = useCallback(() => {
    setItems([...dataService.getAllItems()]);
    setExtraItems([...dataService.getExtraItems()]);
  }, []);

  // Auto-fetch data from the official Google Sheet on startup
  useEffect(() => {
    let isMounted = true;
    const fetchLiveSheet = async () => {
      setIsSyncing(true);
      try {
        const res = await dataService.fetchDataFromGoogleSheets();
        if (isMounted) {
          refreshData();
          if (res.itemsCount > 0) {
            showToast(`Dados atualizados da planilha padrão: ${res.itemsCount} bem(ns) sincronizados.`, 'success');
          }
        }
      } catch (err) {
        console.warn('Sync on boot:', err);
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    };

    fetchLiveSheet();
    return () => {
      isMounted = false;
    };
  }, [refreshData, showToast]);

  // Handle barcode scanned from camera or manual search
  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      const matched = dataService.findItemByPatrimonio(trimmed);

      // Case 1: Exact match in currently selected room
      if (matched && matched.ambiente.toLowerCase() === selectedAmbiente.toLowerCase()) {
        dataService.updateItem(matched.id, {
          status: 'LOCALIZADO',
          verificadoEm: new Date().toISOString(),
          verificadoPor: currentUser?.email,
          verificadoPorNome: currentUser?.name,
          ambienteVerificado: selectedAmbiente,
        });
        refreshData();
        soundService.playSuccessBeep();
        showToast(`Item patrimônio ${trimmed} verificado e confirmado no ambiente!`, 'success');

        // Open detail modal to optionally view or add notes
        setConferenceModalData({
          isOpen: true,
          scannedCode: trimmed,
          matchedItem: matched,
        });
        return;
      }

      // Case 2: Item found in database but allocated in ANOTHER room
      if (matched) {
        soundService.playWarningBeep();
        showToast(
          `Item patrimônio ${trimmed} consta no setor "${matched.ambiente}". Formulário de registro preenchido com os dados do cadastro.`,
          'warning'
        );

        setExtraModalData({
          isOpen: true,
          initialCode: matched.patrimonio,
          initialDescricao: matched.descricao,
          initialEstadoConservacao: matched.estadoConservacao || 'BOM',
          initialObservacoes: `Item cadastrado originalmente no setor ${matched.ambiente} (${matched.bloco})`,
          originalItem: matched,
        });
        return;
      }

      // Case 3: Not found in database at all (Sobra / Uncataloged)
      soundService.playErrorBeep();
      showToast(`Código ${trimmed} não encontrado no cadastro. Registre como item extra/sobra.`, 'info');
      setExtraModalData({
        isOpen: true,
        initialCode: trimmed,
        initialDescricao: '',
        initialEstadoConservacao: 'BOM',
        initialObservacoes: 'Item não localizado no cadastro geral',
        originalItem: null,
      });
    },
    [selectedAmbiente, currentUser, refreshData, showToast]
  );

  // Quick update item status (supports setting to LOCALIZADO, NAO_LOCALIZADO or deselecting back to PENDENTE)
  const handleQuickUpdateStatus = useCallback(
    (itemId: string, status: ItemStatus, condition?: ItemCondition, notes?: string, realAmbiente?: string) => {
      if (status === 'PENDENTE') {
        dataService.updateItem(itemId, {
          status: 'PENDENTE',
          verificadoEm: undefined,
          verificadoPor: undefined,
          verificadoPorNome: undefined,
          ambienteVerificado: undefined,
        });
        refreshData();
        showToast('Opção desmarcada. Item retornou para Pendente.', 'info');
        return;
      }

      dataService.updateItem(itemId, {
        status,
        estadoConservacao: condition || 'BOM',
        verificadoEm: new Date().toISOString(),
        verificadoPor: currentUser?.email,
        verificadoPorNome: currentUser?.name,
        ambienteVerificado: realAmbiente || selectedAmbiente,
        observacoes: notes,
      });
      refreshData();

      const label = status === 'LOCALIZADO' ? 'Confirmado' : status === 'NAO_LOCALIZADO' ? 'Não Localizado' : status;
      showToast(`Item assinalado como: ${label}`, status === 'LOCALIZADO' ? 'success' : 'warning');
    },
    [currentUser, selectedAmbiente, refreshData, showToast]
  );

  // Save Extra Item (with support for divergence linking)
  const handleSaveExtraItem = useCallback(
    (
      extraData: {
        patrimonio: string;
        descricao: string;
        bloco: string;
        ambiente: string;
        estadoConservacao: ItemCondition;
        observacoes: string;
      },
      originalItemId?: string
    ) => {
      if (!currentUser) return;

      // If this corresponds to an item from another room, update its original record as DIVERGENCIA_LOCAL
      if (originalItemId) {
        dataService.updateItem(originalItemId, {
          status: 'DIVERGENCIA_LOCAL',
          estadoConservacao: extraData.estadoConservacao,
          verificadoEm: new Date().toISOString(),
          verificadoPor: currentUser.email,
          verificadoPorNome: currentUser.name,
          ambienteVerificado: selectedAmbiente,
          observacoes: extraData.observacoes || `Transferido fisicamente para ${selectedAmbiente}`,
        });
      }

      dataService.addExtraItem({
        ...extraData,
        cadastradoPor: currentUser.email,
        cadastradoPorNome: currentUser.name,
      });
      refreshData();
      showToast(`Item "${extraData.descricao}" registrado em ${selectedAmbiente} com sucesso!`, 'success');
    },
    [currentUser, selectedAmbiente, refreshData, showToast]
  );

  // Delete an extra item
  const handleDeleteExtraItem = useCallback(
    (id: string) => {
      dataService.deleteExtraItem(id);
      refreshData();
      showToast('Item extra removido.', 'info');
    },
    [refreshData, showToast]
  );

  // Sync to Google Sheets
  const handleSendToSheets = async (): Promise<SyncReport | null> => {
    if (!currentUser) return null;
    setIsSyncing(true);
    try {
      const result = await dataService.syncToGoogleSheets(
        currentUser.token || null,
        currentUser.email,
        currentUser.name,
        selectedAmbiente
      );
      // Re-fetch latest data from spreadsheet to maintain bidirectional consistency
      await dataService.fetchDataFromGoogleSheets().catch(() => {});
      setIsSyncing(false);
      refreshData();
      showToast(result.message, result.success ? 'success' : 'warning');
      return result.report;
    } catch {
      setIsSyncing(false);
      showToast('Falha na sincronização direta. Gravado em cache local de segurança.', 'warning');
      return null;
    }
  };

  // Header quick sync button: pulls updates from spreadsheet
  const handleHeaderSync = async () => {
    setIsSyncing(true);
    try {
      const pullRes = await dataService.pullSpreadsheetUpdates();
      refreshData();
      showToast(pullRes.message, 'success');
    } catch {
      showToast('Base sincronizada com a planilha padrão.', 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    authService.logout();
    setCurrentUser(null);
  };

  // If not logged in, render the login screen with validation against authorized servers
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-amber-400 selection:text-zinc-950 transition-colors duration-200">
      {/* Header */}
      <Header
        user={currentUser}
        onLogout={handleLogout}
        isOnline={isOnline}
        onSync={handleHeaderSync}
        isSyncing={isSyncing}
        onOpenReports={() => setIsReportsOpen(true)}
      />

      {/* Toast notifications */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 max-w-md w-[90%] justify-between bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
          <div
            className={`flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'text-emerald-700 dark:text-emerald-300'
                : toastMessage.type === 'warning'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-zinc-700 dark:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white ml-2 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Workspace: Management Dashboard for President/Vice, Conference Dashboard for members */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {dataService.isPresidenteOrVice(currentUser) ? (
          <PresidentManagementDashboard
            user={currentUser}
            items={items}
            extraItems={extraItems}
            onOpenReports={() => setIsReportsOpen(true)}
          />
        ) : (
          <ConferenceDashboard
            user={currentUser}
            items={items}
            extraItems={extraItems}
            allBlocos={allowedBlocos}
            selectedBloco={selectedBloco}
            selectedAmbiente={selectedAmbiente}
            onSelectBloco={handleSelectBloco}
            onSelectAmbiente={(amb) => setSelectedAmbiente(amb)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenExtraModal={() => {
              setExtraModalData({
                isOpen: true,
                initialCode: '',
                initialDescricao: '',
                initialEstadoConservacao: 'BOM',
                initialObservacoes: '',
                originalItem: null,
              });
            }}
            onOpenReviewModal={() => setIsReviewOpen(true)}
            onQuickUpdateStatus={handleQuickUpdateStatus}
            onDeleteExtraItem={handleDeleteExtraItem}
            onOpenReports={() => setIsReportsOpen(true)}
          />
        )}
      </main>

      {/* Barcode Scanner Viewport Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCodeScanned={handleBarcodeScanned}
        currentAmbienteName={selectedAmbiente}
      />

      {/* Item Conference & Divergence Handling Modal */}
      <ItemConferenceModal
        isOpen={conferenceModalData.isOpen}
        onClose={() =>
          setConferenceModalData({ isOpen: false, scannedCode: '', matchedItem: null })
        }
        scannedCode={conferenceModalData.scannedCode}
        matchedItem={conferenceModalData.matchedItem}
        currentAmbiente={selectedAmbiente}
        user={currentUser}
        onConfirmItem={(itemId, status, condition, notes, realAmbiente) => {
          handleQuickUpdateStatus(itemId, status, condition, notes, realAmbiente);
        }}
        onOpenExtraItemForm={(code, item) => {
          setExtraModalData({
            isOpen: true,
            initialCode: code || item?.patrimonio || '',
            initialDescricao: item?.descricao || '',
            initialEstadoConservacao: item?.estadoConservacao || 'BOM',
            initialObservacoes: item ? `Item cadastrado originalmente em: ${item.ambiente}` : '',
            originalItem: item || null,
          });
        }}
      />

      {/* Extra Item Registration Modal (Pre-filled for items from other locations) */}
      <ExtraItemModal
        isOpen={extraModalData.isOpen}
        onClose={() =>
          setExtraModalData({
            isOpen: false,
            initialCode: '',
            initialDescricao: '',
            initialEstadoConservacao: 'BOM',
            initialObservacoes: '',
            originalItem: null,
          })
        }
        initialCode={extraModalData.initialCode}
        initialDescricao={extraModalData.initialDescricao}
        initialEstadoConservacao={extraModalData.initialEstadoConservacao}
        initialObservacoes={extraModalData.initialObservacoes}
        originalItem={extraModalData.originalItem}
        currentBloco={selectedBloco}
        currentAmbiente={selectedAmbiente}
        user={currentUser}
        onSaveExtraItem={handleSaveExtraItem}
      />

      {/* "Conferir Dados" & Validation Modal */}
      <DataReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        ambiente={selectedAmbiente}
        items={items}
        extraItems={extraItems}
        user={currentUser}
        onQuickUpdateStatus={handleQuickUpdateStatus}
        onSendToSheets={handleSendToSheets}
        isSending={isSyncing}
      />

      {/* Exclusive President / Vice-President Executive Reports & PDF Export Modal */}
      {currentUser && dataService.isPresidenteOrVice(currentUser) && (
        <PresidentReportsModal
          isOpen={isReportsOpen}
          onClose={() => setIsReportsOpen(false)}
          user={currentUser}
          items={items}
          extraItems={extraItems}
        />
      )}
    </div>
  );
}
