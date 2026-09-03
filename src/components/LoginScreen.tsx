import React, { useState, useEffect } from 'react';
import { AuthorizedServer, UserProfile } from '../types';
import { authService } from '../services/authService';
import { dataService } from '../services/dataService';
import utfprLogoDark from '../img/utfpr_logo.svg';
import utfprLogoLight from '../img/utfpr_logo_b.svg';
import {
  ShieldCheck,
  Building2,
  ChevronRight,
  RefreshCw,
  Search,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [servers, setServers] = useState<AuthorizedServer[]>(dataService.getServers());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const fetchLiveServers = async () => {
    setIsLoading(true);
    setSyncStatus('Consultando servidores autorizados na planilha...');
    try {
      const res = await dataService.fetchDataFromGoogleSheets();
      setServers([...dataService.getServers()]);
      if (res.serversCount > 0) {
        setSyncStatus(`${res.serversCount} servidor(es) carregado(s) da planilha.`);
      } else {
        setSyncStatus('Conexão ativa.');
      }
    } catch {
      setSyncStatus('Modo offline / dados locais.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveServers();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const filteredServers = servers.filter(
    (s) =>
      s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.departamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.matriculaSiape.includes(searchTerm)
  );

  const handleSelectServer = (server: AuthorizedServer) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const user = authService.loginAsServer(server);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between text-zinc-800 dark:text-zinc-100 p-4 sm:p-6 md:p-8 transition-colors duration-200">
      {/* Top bar with theme toggle */}
      <div className="max-w-lg w-full mx-auto flex justify-end">
        <button
          type="button"
          onClick={toggleTheme}
          id="btn-login-theme-toggle"
          className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs transition-all flex items-center justify-center cursor-pointer active:scale-95"
          title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-700" />
          )}
        </button>
      </div>

      <div className="max-w-lg w-full mx-auto my-auto space-y-6">
        {/* Institutional Header */}
        <div className="text-center space-y-3.5">
          <div className="flex justify-center items-center py-1">
            <img
              src={theme === 'light' ? utfprLogoLight : utfprLogoDark}
              alt="UTFPR - Universidade Tecnológica Federal do Paraná"
              className="h-14 sm:h-16 w-auto object-contain mx-auto transition-opacity duration-150"
            />
          </div>

          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              Campus Apucarana • Inventário 2026
            </span>
          </div>
        </div>

        {/* Server Selection Card */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Identificação do Conferente
              </h2>
            </div>

            <button
              type="button"
              id="btn-refresh-servers-sheet"
              onClick={fetchLiveServers}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 active:bg-zinc-300 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 transition disabled:opacity-50 cursor-pointer"
              title="Atualizar lista diretamente do Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>

          {/* Search bar if multiple servers */}
          {servers.length > 2 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                id="input-search-server"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, SIAPE ou departamento..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Servers list */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredServers.length === 0 ? (
              <div className="text-center py-8 px-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto opacity-80" />
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-300">Nenhum servidor encontrado</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Verifique se o e-mail ou nome está cadastrado na planilha Google Sheets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchLiveServers}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Recarregar da Planilha
                </button>
              </div>
            ) : (
              filteredServers.map((server) => (
                <button
                  key={server.email + server.matriculaSiape}
                  id={`btn-server-select-${server.matriculaSiape}`}
                  onClick={() => handleSelectServer(server)}
                  className="w-full text-left p-3.5 rounded-xl bg-zinc-50/70 hover:bg-amber-50/50 dark:bg-zinc-950/70 dark:hover:bg-zinc-800/80 border border-zinc-200/80 hover:border-amber-400/50 dark:border-zinc-800 dark:hover:border-amber-500/40 transition-all group flex items-center justify-between cursor-pointer"
                >
                  <div className="truncate mr-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition truncate">
                        {server.nome}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 border border-zinc-300/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono">
                        SIAPE {server.matriculaSiape}
                      </span>
                      {dataService.isPresidenteOrVice(server) && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 shadow-2xs">
                          {server.cargo || 'Presidência'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                      <span className="text-zinc-800 dark:text-zinc-300 font-medium">{server.departamento}</span>
                      {server.cargo ? ` • ${server.cargo}` : ''}
                    </p>

                    <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400/90 truncate">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {dataService.isPresidenteOrVice(server)
                          ? 'Acesso Geral: Todos os Blocos e Locais'
                          : server.ambientesDesignados.length > 0
                          ? `${server.ambientesDesignados.length} local(is) designado(s): ${server.ambientesDesignados.join(', ')}`
                          : 'Nenhum local designado'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition hidden sm:inline">
                      Acessar
                    </span>
                    <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="text-center py-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        UTFPR Campus Apucarana • Sistema de Gestão Patrimonial
      </div>
    </div>
  );
};

