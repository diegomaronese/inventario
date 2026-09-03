import { UserProfile, AuthorizedServer } from '../types';
import { dataService } from './dataService';

const AUTH_USER_KEY = 'utfpr_inventario_user_session_v4';

class AuthService {
  private currentUser: UserProfile | null = null;
  private tokenClient: unknown = null;

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        const user: UserProfile = JSON.parse(stored);
        // Refresh with latest permissions and cargo from dataService if available
        const server = dataService.checkServerAuthorization(user.email);
        if (server) {
          user.cargo = server.cargo || user.cargo || 'Membro';
          user.ambientesDesignados = server.ambientesDesignados;
          user.departamento = server.departamento;
          user.matriculaSiape = server.matriculaSiape;
          user.role = dataService.isPresidenteOrVice(server) ? 'COMISSAO_INVENTARIO' : 'SERVIDOR';
          this.currentUser = user;
        } else if (dataService.getServers().length === 0) {
          // Servers list hasn't loaded yet; hold session until live validation
          this.currentUser = user;
        } else {
          // Servers are loaded and this user is NOT in the official spreadsheet
          this.currentUser = null;
          try {
            localStorage.removeItem(AUTH_USER_KEY);
          } catch (_) {}
        }
      }
    } catch {
      this.currentUser = null;
    }
  }

  public revalidateSession(): UserProfile | null {
    if (!this.currentUser) return null;
    const servers = dataService.getServers();
    if (servers.length === 0) return this.currentUser;

    const server = dataService.checkServerAuthorization(this.currentUser.email);
    if (server && server.ativo) {
      this.currentUser.cargo = server.cargo || this.currentUser.cargo || 'Membro';
      this.currentUser.ambientesDesignados = server.ambientesDesignados;
      this.currentUser.departamento = server.departamento;
      this.currentUser.matriculaSiape = server.matriculaSiape;
      this.currentUser.name = server.nome || this.currentUser.name;
      this.currentUser.role = dataService.isPresidenteOrVice(server) ? 'COMISSAO_INVENTARIO' : 'SERVIDOR';
      this.saveSession(this.currentUser);
      return this.currentUser;
    } else {
      console.warn('Usuário de sessão anterior não encontrado na planilha oficial. Desconectando.');
      this.logout();
      return null;
    }
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public saveSession(user: UserProfile) {
    this.currentUser = user;
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Erro ao salvar sessão', e);
    }
  }

  public logout() {
    this.currentUser = null;
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch (e) {
      console.error('Erro ao encerrar sessão', e);
    }
  }

  // Validate email with authorized servers list
  public validateServerByEmail(
    email: string,
    name?: string,
    picture?: string,
    token?: string
  ): { user: UserProfile | null; error?: string; serverData?: AuthorizedServer } {
    const server = dataService.checkServerAuthorization(email);

    if (!server) {
      return {
        user: null,
        error: `O e-mail "${email}" não foi localizado na lista de servidores autorizados da Planilha de Inventário da UTFPR Campus Apucarana.`,
      };
    }

    if (!server.ativo) {
      return {
        user: null,
        error: `O cadastro do servidor (${server.nome}) encontra-se inativo na planilha de designação da Comissão de Inventário.`,
      };
    }

    const isPresidenteOrVice = dataService.isPresidenteOrVice(server);

    const userProfile: UserProfile = {
      email: server.email,
      name: name || server.nome,
      picture: picture || undefined,
      matriculaSiape: server.matriculaSiape,
      departamento: server.departamento,
      ambientesDesignados: server.ambientesDesignados,
      isAuthorized: true,
      cargo: server.cargo || 'Membro',
      role: isPresidenteOrVice ? 'COMISSAO_INVENTARIO' : 'SERVIDOR',
      token,
    };

    this.saveSession(userProfile);
    return { user: userProfile, serverData: server };
  }

  // Quick Switch / Demo Login for testing and offline field audits
  public loginAsServer(server: AuthorizedServer): UserProfile {
    const isPresidenteOrVice = dataService.isPresidenteOrVice(server);

    const userProfile: UserProfile = {
      email: server.email,
      name: server.nome,
      picture: undefined,
      matriculaSiape: server.matriculaSiape,
      departamento: server.departamento,
      ambientesDesignados: server.ambientesDesignados,
      isAuthorized: true,
      cargo: server.cargo || 'Membro',
      role: isPresidenteOrVice ? 'COMISSAO_INVENTARIO' : 'SERVIDOR',
    };

    this.saveSession(userProfile);
    return userProfile;
  }
}

export const authService = new AuthService();
