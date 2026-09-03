import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import utfprLogoDark from '../img/utfpr_logo.svg';
import utfprLogoLight from '../img/utfpr_logo_b.svg';
import { LogOut, RefreshCw, Sun, Moon, Menu, X, User, FileText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../services/dataService';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
  isOnline: boolean;
  onSync: () => void;
  isSyncing: boolean;
  onOpenReports?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  isOnline,
  onSync,
  isSyncing,
  onOpenReports,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentLogo = theme === 'light' ? utfprLogoLight : utfprLogoDark;
  const isPresidenteOrVice = dataService.isPresidenteOrVice(user);

  // Close mobile menu on screen resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('#btn-mobile-menu-toggle')
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand & Campus Info (always visible on the left) */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <img
            src={currentLogo}
            alt="UTFPR"
            className="h-8 sm:h-9 w-auto object-contain transition-opacity duration-150 flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight tracking-tight truncate">
                Inventário
              </h1>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 flex-shrink-0">
                2026
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
              Campus Apucarana
            </p>
          </div>
        </div>

        {/* Desktop View: Actions & User Info (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
          {/* PWA Install Button */}
          <PWAInstallButton variant="header" />

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            id="btn-toggle-theme"
            className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            aria-label="Alternar tema claro/escuro"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700 transition-transform duration-300 -rotate-12 hover:rotate-0" />
            )}
          </button>

          {/* Quick sync button */}
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            id="btn-header-sync"
            className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold border border-zinc-200/80 dark:border-zinc-700/80 transition-all active:scale-95 cursor-pointer"
            title="Sincronizar dados com a Planilha Padrão"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>

          {/* Exclusive President / Vice-President Reports Button */}
          {isPresidenteOrVice && onOpenReports && (
            <button
              type="button"
              onClick={onOpenReports}
              id="btn-header-reports"
              className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-500/30 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Central de Relatórios Executivos e Exportação em PDF"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Relatórios (PDF)</span>
            </button>
          )}

          {/* User profile info & logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
            <div className="text-right">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight truncate max-w-[150px]">
                {user.name}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                SIAPE: {user.matriculaSiape || 'UTFPR'}
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              id="btn-header-logout"
              className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800/80 dark:hover:bg-rose-950/40 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 border border-zinc-200/80 dark:border-zinc-700/80 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile View: Single Menu Toggle Button (Visible only on Mobile) */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            id="btn-mobile-menu-toggle"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Fechar menu de opções' : 'Abrir menu de opções'}
            className="min-h-[42px] min-w-[42px] p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-xs"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            ) : (
              <Menu className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Mobile Menu Drawer */}
      {isMenuOpen && (
        <>
          {/* Backdrop for closing */}
          <div
            className="fixed inset-0 top-[53px] bg-black/40 backdrop-blur-xs z-20 md:hidden"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Content */}
          <div
            ref={menuRef}
            className="relative z-30 md:hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-xl px-4 py-4 space-y-3.5 transition-all animate-in slide-in-from-top-2 duration-150"
          >
            {/* 1. Server info card (dados do servidor) */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {user.name}
                  </p>
                  {user.cargo && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 uppercase">
                      {user.cargo}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  SIAPE: {user.matriculaSiape || 'UTFPR'}
                </p>
                {user.email && (
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            {/* 2. Menu Action Buttons */}
            <div className="space-y-2">
              {/* Exclusive President / Vice-President Reports in Mobile Drawer */}
              {isPresidenteOrVice && onOpenReports && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenReports();
                  }}
                  id="btn-mobile-reports"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm flex items-center justify-between border border-amber-500/30 transition cursor-pointer active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Relatórios da Presidência (PDF)</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300">
                    Exportar
                  </span>
                </button>
              )}

              {/* Sincronizar */}
              <button
                type="button"
                onClick={() => {
                  onSync();
                }}
                disabled={isSyncing}
                id="btn-mobile-sync"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold text-xs sm:text-sm flex items-center justify-between border border-zinc-200 dark:border-zinc-700 transition cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <RefreshCw className={`w-4 h-4 text-amber-600 dark:text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando dados...' : 'Sincronizar com a Planilha'}</span>
                </div>
                {isSyncing && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                    Em andamento...
                  </span>
                )}
              </button>

              {/* PWA Home Screen Install in Mobile Drawer */}
              <PWAInstallButton variant="menu" />

              {/* Modo Claro / Escuro */}
              <button
                type="button"
                onClick={toggleTheme}
                id="btn-mobile-theme"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold text-xs sm:text-sm flex items-center justify-between border border-zinc-200 dark:border-zinc-700 transition cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  )}
                  <span>{theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                  {theme === 'dark' ? 'Escuro' : 'Claro'}
                </span>
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                id="btn-mobile-logout"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold text-xs sm:text-sm flex items-center justify-between border border-rose-200 dark:border-rose-800/60 transition cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Encerrar Sessão</span>
                </div>
                <span className="text-[11px] opacity-75">Sair</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

