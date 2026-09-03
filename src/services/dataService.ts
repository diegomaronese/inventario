import { InventoryItem, ExtraItem, AuthorizedServer, SheetConfig, SyncReport, UserProfile } from '../types';

const STORAGE_KEYS = {
  ITEMS: 'utfpr_inventario_items_v4',
  EXTRAS: 'utfpr_inventario_extras_v4',
  SERVERS: 'utfpr_inventario_servers_v4',
  CONFIG: 'utfpr_inventario_config_v4',
  REPORTS: 'utfpr_inventario_reports_v4',
  OFFICIAL_ITEMS: 'utfpr_inventario_official_items_v4',
  OFFICIAL_EXTRAS: 'utfpr_inventario_official_extras_v4',
  OFFICIAL_LAST_SYNC: 'utfpr_inventario_official_last_sync_v4',
};

// Default Master Spreadsheet ID for UTFPR Campus Apucarana
export const DEFAULT_SPREADSHEET_ID = '1uv53MeBurlrtZJKZcA6I9CHQvIxc2fzlylRlkvZTSPE';

// Initial Authorized Servers (Strictly empty: always populated live from spreadsheet)
export const INITIAL_SERVERS: AuthorizedServer[] = [];

// Initial Inventory Items (Strictly empty: always populated live from spreadsheet)
export const INITIAL_ITEMS: InventoryItem[] = [];

export const DEFAULT_SHEET_CONFIG: SheetConfig = {
  spreadsheetId: DEFAULT_SPREADSHEET_ID,
  sheetNameInventario: 'Inventario_Bens',
  sheetNameServidores: 'Servidores_Autorizados',
  sheetNameExtras: 'Itens_Nao_Cadastrados',
  lastSyncedAt: undefined,
  autoSync: true,
};

// Helper: Normalize string for matching
function normalizeText(text?: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Helper: Parse Google Visualization JSON response format
function parseGvizResponse(jsonText: string): { cols: string[]; rows: any[][] } {
  const startIdx = jsonText.indexOf('{');
  const endIdx = jsonText.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Formato de resposta GViz inválido');
  }
  const data = JSON.parse(jsonText.substring(startIdx, endIdx + 1));
  let cols: string[] = (data.table?.cols || []).map((c: { label?: string; id?: string }) => (c.label || c.id || '').trim());
  let rows: any[][] = (data.table?.rows || []).map((r: { c?: Array<{ v?: any; f?: string } | null> }) =>
    (r.c || []).map((cell) => (cell ? (cell.f !== undefined ? cell.f : (cell.v !== null && cell.v !== undefined ? cell.v : '')) : ''))
  );

  // If column labels are empty/generic letters and row 0 contains header names
  const hasNamedLabels = cols.some((c) => c.length > 0 && !/^[A-Z]$/.test(c));
  if (!hasNamedLabels && rows.length > 0) {
    cols = rows[0].map((val) => String(val).trim());
    rows = rows.slice(1);
  }

  return { cols, rows };
}

// Helper: Map table row to InventoryItem based on exact spreadsheet structure
function mapRowToInventoryItem(cols: string[], row: any[], index: number): InventoryItem | null {
  const get = (names: string[]) => {
    for (const name of names) {
      const idx = cols.findIndex((c) => normalizeText(c) === normalizeText(name));
      if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) {
        return String(row[idx]).trim();
      }
    }
    return '';
  };

  const patrimonio = get(['patrimonio', 'tombo', 'tombamento', 'codigo', 'cod']);
  const descricao = get(['descricao', 'especificacao', 'denominacao', 'item', 'nome']);

  // Skip empty rows
  if (!patrimonio && !descricao) return null;

  const bloco = get(['bloco', 'edificio', 'predio']) || 'Campus Apucarana';
  const ambiente = get(['local', 'ambiente', 'sala', 'localizacao', 'setor']) || 'Geral';
  const patrimonioAntigo = get(['patrimonioantigo', 'tomboantigo', 'antigo', 'plaquetaantiga']);
  
  const rawStatus = get(['status', 'situacao', 'statusconferencia']).toUpperCase();
  const status: InventoryItem['status'] =
    rawStatus === 'LOCALIZADO' ? 'LOCALIZADO' :
    rawStatus.includes('NAO') || rawStatus.includes('NÃO') ? 'NAO_LOCALIZADO' :
    rawStatus.includes('DIVERG') ? 'DIVERGENCIA_LOCAL' : 'PENDENTE';

  const rawEstado = get(['estadoconservacao', 'estado', 'conservacao']).toUpperCase();
  const estadoConservacao: InventoryItem['estadoConservacao'] =
    rawEstado.includes('REGULAR') ? 'REGULAR' :
    rawEstado.includes('RUIM') ? 'RUIM' :
    rawEstado.includes('OCIOSO') ? 'OCIOSO' :
    rawEstado.includes('RECUPERAVEL') || rawEstado.includes('RECUPERÁVEL') ? 'RECUPERAVEL' :
    rawEstado.includes('INSERVIVEL') || rawEstado.includes('INSERVÍVEL') ? 'INSERVIVEL' :
    rawEstado.includes('BOM') ? 'BOM' : undefined;

  const verificadoEm = get(['dataconferencia', 'datahora', 'verificadoem', 'conferidoem', 'data']);
  const verificadoPor = get(['servidorconferente', 'conferentepor', 'verificadopor', 'conferente']);
  const ambienteVerificado = get(['ambienteencontrado', 'ambienteverificado', 'localencontrado']);
  const observacoes = get(['observacoes', 'observacao', 'justificativa', 'obs']);

  return {
    id: `ITEM-${patrimonio || index}-${index}`,
    bloco,
    ambiente,
    patrimonio: patrimonio || `SEM-TOMBO-${index + 1}`,
    patrimonioAntigo: patrimonioAntigo || undefined,
    descricao: descricao || 'Item Cadastrado na Planilha',
    status,
    estadoConservacao: estadoConservacao || 'BOM',
    verificadoEm: verificadoEm || undefined,
    verificadoPor: verificadoPor || undefined,
    verificadoPorNome: verificadoPor || undefined,
    ambienteVerificado: ambienteVerificado || undefined,
    observacoes: observacoes || undefined,
  };
}

// Helper: Map table row to AuthorizedServer based on Servidores_Autorizados sheet
function mapRowToServer(cols: string[], row: any[]): AuthorizedServer | null {
  const get = (names: string[]) => {
    for (const name of names) {
      const idx = cols.findIndex((c) => normalizeText(c) === normalizeText(name));
      if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) {
        return String(row[idx]).trim();
      }
    }
    return '';
  };

  const email = get(['email', 'correio', 'login']);
  const nome = get(['nome', 'servidor', 'usuario', 'nomecompleto']) || (email ? email.split('@')[0] : '');
  if (!email && !nome) return null;

  const matriculaSiape = get(['siape', 'matricula', 'matriculasiape', 'codsiape']) || '0000000';
  const departamento = get(['departamento', 'setor', 'lotacao', 'unidade', 'depto']) || 'UTFPR Campus Apucarana';
  const locaisStr = get(['locaisdesignados', 'ambientesdesignados', 'ambientes', 'salas', 'locais', 'designacao', 'local']);
  const ativoStr = get(['ativo', 'status', 'habilitado']).toUpperCase();
  const ativo = ativoStr === '' || ativoStr === 'SIM' || ativoStr === 'TRUE' || ativoStr === '1' || ativoStr === 'ATIVO' || ativoStr === 'S';
  const cargo = get(['cargofuncao', 'cargo/funcao', 'cargo_funcao', 'cargo', 'funcao', 'papel']) || 'Membro';

  const ambientesDesignados = locaisStr
    ? locaisStr.split(/[;,/]/).map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    email: (email || `${nome.toLowerCase().replace(/\s+/g, '.')}@utfpr.edu.br`).toLowerCase(),
    nome: nome || email,
    matriculaSiape,
    departamento,
    ambientesDesignados,
    ativo,
    cargo,
  };
}

// Helper: Map table row to ExtraItem based on Itens_Nao_Cadastrados sheet
// Exact Columns: [DataHora, Patrimonio, Descricao, Bloco, Local, EstadoConservacao, CadastradoPor, Observacoes]
function mapRowToExtraItem(cols: string[], row: any[], index: number): ExtraItem | null {
  const get = (names: string[]) => {
    for (const name of names) {
      const idx = cols.findIndex((c) => normalizeText(c) === normalizeText(name));
      if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) {
        return String(row[idx]).trim();
      }
    }
    return '';
  };

  const cadastradoEm = get(['datahora', 'data', 'hora', 'cadastradoem', 'timestamp', 'dataconferencia']) || new Date().toLocaleString('pt-BR');
  const patrimonio = get(['patrimonio', 'patrimoniolido', 'tombo', 'codigo', 'cod', 'plaqueta']);
  const descricao = get(['descricao', 'especificacao', 'item', 'denominacao', 'nome']);
  if (!patrimonio && !descricao) return null;

  const bloco = get(['bloco', 'edificio', 'predio', 'campus']) || 'Campus Apucarana';
  const ambiente = get(['local', 'ambiente', 'sala', 'setor', 'localizacao', 'depto']) || 'Geral';
  
  const rawEstado = get(['estadoconservacao', 'estado', 'conservacao', 'situacaofisica', 'situacao']).toUpperCase();
  const estadoConservacao: ExtraItem['estadoConservacao'] =
    rawEstado.includes('REGULAR') ? 'REGULAR' :
    rawEstado.includes('RUIM') ? 'RUIM' :
    rawEstado.includes('OCIOSO') ? 'OCIOSO' :
    rawEstado.includes('RECUPERAVEL') || rawEstado.includes('RECUPERÁVEL') ? 'RECUPERAVEL' :
    rawEstado.includes('ANTIECONOMICO') || rawEstado.includes('ANTIECONÔMICO') ? 'ANTIECONOMICO' :
    rawEstado.includes('INSERVIVEL') || rawEstado.includes('INSERVÍVEL') ? 'INSERVIVEL' : 'BOM';

  const cadastradoPor = get(['cadastradopor', 'servidor', 'conferente', 'usuario', 'nome', 'servidorconferente']) || 'Servidor';
  const observacoes = get(['observacoes', 'observacao', 'obs', 'justificativa', 'motivo']);

  return {
    id: `EXTRA-${patrimonio || index}-${index}`,
    cadastradoEm,
    patrimonio: patrimonio || `EXTRA-${index + 1}`,
    descricao: descricao || 'Item não cadastrado localizado',
    bloco,
    ambiente,
    estadoConservacao,
    cadastradoPor,
    cadastradoPorNome: cadastradoPor,
    observacoes: observacoes || undefined,
  };
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch {}
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch {}
}

function cleanupLegacyStorage() {
  const keysToRemove = [
    'utfpr_inventario_servers_v3',
    'utfpr_inventario_servers_v2',
    'utfpr_inventario_servers_v1',
    'utfpr_inventario_items_v3',
    'utfpr_inventario_items_v2',
    'utfpr_inventario_items_v1',
    'utfpr_inventario_user_session_v3',
    'utfpr_inventario_user_session_v2',
    'utfpr_inventario_user_session_v1',
    'utfpr_inventario_user',
  ];
  keysToRemove.forEach((k) => safeRemoveItem(k));
}

class DataService {
  private items: InventoryItem[] = [];
  private extraItems: ExtraItem[] = [];
  private servers: AuthorizedServer[] = [];
  private sheetConfig: SheetConfig = { ...DEFAULT_SHEET_CONFIG };
  private reports: SyncReport[] = [];
  private officialItems: InventoryItem[] = [];
  private officialExtraItems: ExtraItem[] = [];
  private officialLastSyncedAt: string | null = null;
  private isFetchingSheet: boolean = false;
  private isFetchingOfficial: boolean = false;
  private listeners: Set<() => void> = new Set();
  private inFlightFetchPromise: Promise<{
    success: boolean;
    message: string;
    itemsCount: number;
    serversCount: number;
    extrasCount: number;
  }> | null = null;
  private inFlightServersFetchPromise: Promise<{
    success: boolean;
    serversCount: number;
    message: string;
  }> | null = null;
  private inFlightOfficialPromise: Promise<{
    success: boolean;
    items: InventoryItem[];
    extraItems: ExtraItem[];
    servers: AuthorizedServer[];
    lastSyncedAt: string;
    message: string;
  }> | null = null;

  constructor() {
    this.initData();
    // Auto-fetch ONLY authorized servers on startup so Login screen always has fresh authorized users
    this.fetchAuthorizedServersFromGoogleSheets().catch((err) => {
      console.warn('Initial authorized servers fetch deferred:', err);
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Erro ao notificar listener:', err);
      }
    });
  }

  public isFetching(): boolean {
    return this.isFetchingSheet;
  }

  public hasServersLoaded(): boolean {
    return this.servers.length > 0;
  }

  public hasInitialItemsLoaded(): boolean {
    return this.items.length > 0;
  }

  public async ensureDataLoaded(): Promise<void> {
    if (this.servers.length === 0) {
      await this.fetchAuthorizedServersFromGoogleSheets();
    }
    if (this.items.length === 0) {
      await this.fetchDataFromGoogleSheets();
    }
  }

  private initData() {
    cleanupLegacyStorage();
    try {
      const storedItems = safeGetItem(STORAGE_KEYS.ITEMS);
      if (storedItems) {
        this.items = JSON.parse(storedItems);
      } else {
        this.items = [];
      }

      const storedExtras = safeGetItem(STORAGE_KEYS.EXTRAS);
      if (storedExtras) {
        this.extraItems = JSON.parse(storedExtras);
      } else {
        this.extraItems = [];
      }

      const storedServers = safeGetItem(STORAGE_KEYS.SERVERS);
      if (storedServers) {
        const parsed: AuthorizedServer[] = JSON.parse(storedServers);
        // Exclude any legacy mock servers that might have persisted in cache
        this.servers = parsed.filter(
          (s) =>
            s.email !== 'patrimonio.ap@utfpr.edu.br' &&
            s.nome !== 'Mariana Duarte (Comissão Central)'
        );
      } else {
        this.servers = [];
      }

      this.sheetConfig = { ...DEFAULT_SHEET_CONFIG };
      const storedLastSync = safeGetItem('utfpr_inventario_last_sync');
      if (storedLastSync) {
        this.sheetConfig.lastSyncedAt = storedLastSync;
      }
      const storedWebhook = safeGetItem('utfpr_inventario_webhook_url');
      if (storedWebhook) {
        this.sheetConfig.webhookUrl = storedWebhook;
      }

      const storedReports = safeGetItem(STORAGE_KEYS.REPORTS);
      if (storedReports) {
        this.reports = JSON.parse(storedReports);
      }

      const storedOfficialItems = safeGetItem(STORAGE_KEYS.OFFICIAL_ITEMS);
      if (storedOfficialItems) {
        try {
          this.officialItems = JSON.parse(storedOfficialItems);
        } catch {}
      }

      const storedOfficialExtras = safeGetItem(STORAGE_KEYS.OFFICIAL_EXTRAS);
      if (storedOfficialExtras) {
        try {
          this.officialExtraItems = JSON.parse(storedOfficialExtras);
        } catch {}
      }

      this.officialLastSyncedAt = safeGetItem(STORAGE_KEYS.OFFICIAL_LAST_SYNC);
    } catch (e) {
      console.warn('Erro ao carregar dados do LocalStorage, iniciando limpo', e);
      this.items = [];
      this.servers = [];
      this.extraItems = [];
      this.officialItems = [];
      this.officialExtraItems = [];
      this.officialLastSyncedAt = null;
      this.sheetConfig = { ...DEFAULT_SHEET_CONFIG };
    }
  }

  // Getters for strictly official spreadsheet data (President/Vice management)
  public getOfficialItems(): InventoryItem[] {
    return this.officialItems;
  }

  public getOfficialExtraItems(): ExtraItem[] {
    return this.officialExtraItems;
  }

  public getOfficialLastSyncedAt(): string | null {
    return this.officialLastSyncedAt;
  }

  public isFetchingOfficialData(): boolean {
    return this.isFetchingOfficial;
  }

  // Fetch official data strictly from Google Sheets for the President/Vice Management Dashboard
  // This does NOT merge local uncommitted changes from field conferences
  public async fetchOfficialSpreadsheetData(): Promise<{
    success: boolean;
    items: InventoryItem[];
    extraItems: ExtraItem[];
    servers: AuthorizedServer[];
    lastSyncedAt: string;
    message: string;
  }> {
    if (this.isFetchingOfficial && this.inFlightOfficialPromise) {
      return this.inFlightOfficialPromise;
    }

    const runFetch = async () => {
      this.isFetchingOfficial = true;
      const spreadsheetId = this.sheetConfig.spreadsheetId;

      try {
        const timestamp = Date.now();
        const sheetBens = this.sheetConfig.sheetNameInventario || 'Inventario_Bens';
        const bensUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
          sheetBens
        )}&t=${timestamp}`;

        const sheetServ = this.sheetConfig.sheetNameServidores || 'Servidores_Autorizados';
        const servUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
          sheetServ
        )}&t=${timestamp}`;

        const sheetExtra = this.sheetConfig.sheetNameExtras || 'Itens_Nao_Cadastrados';
        const extraUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
          sheetExtra
        )}&t=${timestamp}`;

        const [resBens, resServ, resExtra] = await Promise.all([
          fetch(bensUrl).catch(() => null),
          fetch(servUrl).catch(() => null),
          fetch(extraUrl).catch(() => null),
        ]);

        let parsedItems: InventoryItem[] = [];
        let parsedServers: AuthorizedServer[] = [];
        let parsedExtras: ExtraItem[] = [];

        if (resBens && resBens.ok) {
          const textBens = await resBens.text();
          const { cols, rows } = parseGvizResponse(textBens);
          parsedItems = rows
            .map((row, idx) => mapRowToInventoryItem(cols, row, idx))
            .filter((item): item is InventoryItem => item !== null);
        }

        if (resServ && resServ.ok) {
          const textServ = await resServ.text();
          const { cols, rows } = parseGvizResponse(textServ);
          parsedServers = rows
            .map((row) => mapRowToServer(cols, row))
            .filter((srv): srv is AuthorizedServer => srv !== null);
        }

        if (resExtra && resExtra.ok) {
          const textExtra = await resExtra.text();
          const { cols, rows } = parseGvizResponse(textExtra);
          parsedExtras = rows
            .map((row, idx) => mapRowToExtraItem(cols, row, idx))
            .filter((ex): ex is ExtraItem => ex !== null);
        }

        const now = new Date().toLocaleString('pt-BR');

        if (parsedItems.length > 0 || parsedExtras.length > 0 || parsedServers.length > 0) {
          // Strictly official data from spreadsheet without local conference merges
          this.officialItems = parsedItems;
          this.officialExtraItems = parsedExtras;
          this.officialLastSyncedAt = now;
          if (parsedServers.length > 0) {
            this.servers = parsedServers;
            this.saveServers();
          }

          safeSetItem(STORAGE_KEYS.OFFICIAL_ITEMS, JSON.stringify(this.officialItems));
          safeSetItem(STORAGE_KEYS.OFFICIAL_EXTRAS, JSON.stringify(this.officialExtraItems));
          safeSetItem(STORAGE_KEYS.OFFICIAL_LAST_SYNC, now);
          this.notifyListeners();

          return {
            success: true,
            items: this.officialItems,
            extraItems: this.officialExtraItems,
            servers: this.servers,
            lastSyncedAt: now,
            message: `Dados consolidados da planilha oficial atualizados com sucesso (${parsedItems.length} bens, ${parsedExtras.length} extras).`,
          };
        }

        return {
          success: false,
          items: this.officialItems,
          extraItems: this.officialExtraItems,
          servers: this.servers,
          lastSyncedAt: this.officialLastSyncedAt || now,
          message: 'Nenhum dado retornado da planilha oficial.',
        };
      } catch (err: any) {
        console.error('Erro ao buscar dados oficiais da planilha para a gestão:', err);
        return {
          success: false,
          items: this.officialItems,
          extraItems: this.officialExtraItems,
          servers: this.servers,
          lastSyncedAt: this.officialLastSyncedAt || new Date().toLocaleString('pt-BR'),
          message: err?.message || 'Falha ao buscar dados oficiais da planilha.',
        };
      } finally {
        this.isFetchingOfficial = false;
        this.inFlightOfficialPromise = null;
      }
    };

    this.inFlightOfficialPromise = runFetch();
    return this.inFlightOfficialPromise;
  }

  // Fetch only authorized servers from Google Sheets (called on app start and login screen)
  public async fetchAuthorizedServersFromGoogleSheets(): Promise<{
    success: boolean;
    serversCount: number;
    message: string;
  }> {
    if (this.inFlightServersFetchPromise) {
      return this.inFlightServersFetchPromise;
    }

    const runFetch = async () => {
      const spreadsheetId = this.sheetConfig.spreadsheetId;
      try {
        const sheetServ = this.sheetConfig.sheetNameServidores || 'Servidores_Autorizados';
        const servUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
          sheetServ
        )}`;

        const resServ = await fetch(servUrl).catch(() => null);
        if (resServ && resServ.ok) {
          const textServ = await resServ.text();
          const { cols, rows } = parseGvizResponse(textServ);
          const parsedServers = rows
            .map((row) => mapRowToServer(cols, row))
            .filter((srv): srv is AuthorizedServer => srv !== null);

          if (parsedServers.length > 0) {
            this.servers = parsedServers;
            this.saveServers();
            this.notifyListeners();
            return {
              success: true,
              serversCount: parsedServers.length,
              message: `${parsedServers.length} servidores sincronizados da planilha oficial.`,
            };
          }
        }

        return {
          success: false,
          serversCount: this.servers.length,
          message: 'Nenhum servidor retornado da aba Servidores_Autorizados.',
        };
      } catch (err: any) {
        return {
          success: false,
          serversCount: this.servers.length,
          message: err?.message || 'Falha ao buscar servidores.',
        };
      } finally {
        this.inFlightServersFetchPromise = null;
      }
    };

    this.inFlightServersFetchPromise = runFetch();
    return this.inFlightServersFetchPromise;
  }

  // Fetch live data directly from Google Sheets
  public async fetchDataFromGoogleSheets(): Promise<{
    success: boolean;
    message: string;
    itemsCount: number;
    serversCount: number;
    extrasCount: number;
  }> {
    if (this.isFetchingSheet && this.inFlightFetchPromise) {
      return this.inFlightFetchPromise;
    }

    const runFetch = async () => {
      this.isFetchingSheet = true;
    const spreadsheetId = this.sheetConfig.spreadsheetId;

    try {
      // 1. Fetch Inventario_Bens
      const timestamp = Date.now();
      const sheetBens = this.sheetConfig.sheetNameInventario || 'Inventario_Bens';
      const bensUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetBens
      )}&t=${timestamp}`;

      // 2. Fetch Servidores_Autorizados
      const sheetServ = this.sheetConfig.sheetNameServidores || 'Servidores_Autorizados';
      const servUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetServ
      )}&t=${timestamp}`;

      // 3. Fetch Itens_Nao_Cadastrados
      const sheetExtra = this.sheetConfig.sheetNameExtras || 'Itens_Nao_Cadastrados';
      const extraUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetExtra
      )}&t=${timestamp}`;

      const [resBens, resServ, resExtra] = await Promise.all([
        fetch(bensUrl, { cache: 'no-store' }).catch(() => null),
        fetch(servUrl, { cache: 'no-store' }).catch(() => null),
        fetch(extraUrl, { cache: 'no-store' }).catch(() => null),
      ]);

      let parsedItems: InventoryItem[] = [];
      let parsedServers: AuthorizedServer[] = [];
      let parsedExtras: ExtraItem[] = [];

      // Parse Bens
      if (resBens && resBens.ok) {
        const textBens = await resBens.text();
        const { cols, rows } = parseGvizResponse(textBens);
        parsedItems = rows
          .map((row, idx) => mapRowToInventoryItem(cols, row, idx))
          .filter((item): item is InventoryItem => item !== null);
      }

      // Parse Servidores
      if (resServ && resServ.ok) {
        const textServ = await resServ.text();
        const { cols, rows } = parseGvizResponse(textServ);
        parsedServers = rows
          .map((row) => mapRowToServer(cols, row))
          .filter((srv): srv is AuthorizedServer => srv !== null);
      }

      // Parse Extras
      if (resExtra && resExtra.ok) {
        const textExtra = await resExtra.text();
        const { cols, rows } = parseGvizResponse(textExtra);
        parsedExtras = rows
          .map((row, idx) => mapRowToExtraItem(cols, row, idx))
          .filter((ex): ex is ExtraItem => ex !== null);
      }

      // Keep official un-merged copy from master spreadsheet
      if (parsedItems.length > 0) {
        this.officialItems = parsedItems;
        safeSetItem(STORAGE_KEYS.OFFICIAL_ITEMS, JSON.stringify(this.officialItems));
      }
      if (parsedExtras.length > 0) {
        this.officialExtraItems = parsedExtras;
        safeSetItem(STORAGE_KEYS.OFFICIAL_EXTRAS, JSON.stringify(this.officialExtraItems));
      }

      // Update in-memory state and localStorage if data retrieved
      if (parsedItems.length > 0 || parsedServers.length > 0) {
        // Preserve any items verified locally by user
        if (parsedItems.length > 0) {
          if (this.items.length > 0) {
            const localVerifiedMap = new Map<string, InventoryItem>();
            this.items.forEach((item) => {
              if (item.status !== 'PENDENTE') {
                localVerifiedMap.set(item.patrimonio, item);
              }
            });
            this.items = parsedItems.map((sheetItem) => {
              const local = localVerifiedMap.get(sheetItem.patrimonio);
              if (local && local.status !== 'PENDENTE') {
                return {
                  ...sheetItem,
                  status: local.status,
                  estadoConservacao: local.estadoConservacao || sheetItem.estadoConservacao,
                  verificadoEm: local.verificadoEm || sheetItem.verificadoEm,
                  verificadoPor: local.verificadoPor || sheetItem.verificadoPor,
                  verificadoPorNome: local.verificadoPorNome || sheetItem.verificadoPorNome,
                  ambienteVerificado: local.ambienteVerificado || sheetItem.ambienteVerificado,
                  observacoes: local.observacoes || sheetItem.observacoes,
                };
              }
              return sheetItem;
            });
          } else {
            this.items = parsedItems;
          }
          this.saveItems();
        }

        if (parsedServers.length > 0) {
          this.servers = parsedServers;
          this.saveServers();
        }

        if (parsedExtras.length > 0) {
          const sheetPatrimonios = new Set(parsedExtras.map((e) => e.patrimonio));
          const localOnly = this.extraItems.filter((e) => !sheetPatrimonios.has(e.patrimonio));
          this.extraItems = [...parsedExtras, ...localOnly];
          this.saveExtras();
        }

        this.updateLastSyncTime();
        this.notifyListeners();

        return {
          success: true,
          message: `Planilha importada com sucesso: ${this.items.length} bens e ${this.servers.length} servidores sincronizados da UTFPR Apucarana.`,
          itemsCount: this.items.length,
          serversCount: this.servers.length,
          extrasCount: this.extraItems.length,
        };
      } else {
        throw new Error('Nenhum registro retornado da planilha.');
      }
    } catch (err: any) {
      console.warn('Falha ao obter dados diretamente do Google Sheets:', err);
      return {
        success: false,
        message: 'Utilizando base local. Conexão com Google Sheets pendente.',
        itemsCount: this.items.length,
        serversCount: this.servers.length,
        extrasCount: this.extraItems.length,
      };
    } finally {
      this.isFetchingSheet = false;
      this.inFlightFetchPromise = null;
    }
  };

  this.inFlightFetchPromise = runFetch();
  return this.inFlightFetchPromise;
}

  public saveItems() {
    safeSetItem(STORAGE_KEYS.ITEMS, JSON.stringify(this.items));
  }

  public saveExtras() {
    safeSetItem(STORAGE_KEYS.EXTRAS, JSON.stringify(this.extraItems));
  }

  public saveServers() {
    safeSetItem(STORAGE_KEYS.SERVERS, JSON.stringify(this.servers));
  }

  public updateLastSyncTime() {
    const now = new Date().toISOString();
    this.sheetConfig.lastSyncedAt = now;
    safeSetItem('utfpr_inventario_last_sync', now);
  }

  public saveReports() {
    safeSetItem(STORAGE_KEYS.REPORTS, JSON.stringify(this.reports));
  }

  // Authorizations
  public getServers(): AuthorizedServer[] {
    return this.servers;
  }

  public checkServerAuthorization(email: string): AuthorizedServer | null {
    const normalized = email.trim().toLowerCase();
    const prefix = normalized.split('@')[0];
    
    // 1. Check exact email
    let server = this.servers.find(
      (s) => s.email.toLowerCase() === normalized && s.ativo
    );

    // 2. Check email prefix or alternate domain
    if (!server) {
      server = this.servers.find(
        (s) => s.email.toLowerCase().split('@')[0] === prefix && s.ativo
      );
    }

    // 3. Check by normalized name
    if (!server) {
      server = this.servers.find(
        (s) => normalizeText(s.nome).includes(normalizeText(prefix)) && s.ativo
      );
    }

    return server || null;
  }

  public addAuthorizedServer(server: AuthorizedServer) {
    this.servers = this.servers.filter(s => s.email.toLowerCase() !== server.email.toLowerCase());
    this.servers.push(server);
    this.saveServers();
  }

  /**
   * Access Control: Checks whether a user or server has Presidente or Vice-Presidente role (or system admin).
   * Users with CargoFuncao 'Presidente' or 'Vice-Presidente' have access to ALL Blocks and Locations.
   */
  public isPresidenteOrVice(server: AuthorizedServer | UserProfile | null): boolean {
    if (!server) return false;

    // Master commission email or admin role
    if ('role' in server && server.role === 'ADMIN') return true;
    if (server.email?.toLowerCase() === 'patrimonio.ap@utfpr.edu.br') return true;

    const cargo = (server as any).cargo;
    if (typeof cargo === 'string' && cargo.trim().length > 0) {
      const norm = normalizeText(cargo);
      // Matches "presidente", "vice presidente", "vice-presidente", "presidencia", "vice-presidencia"
      if (norm.includes('presidente') || norm.includes('presidencia')) {
        return true;
      }
    }

    // Explicit wildcard designation in sheet
    const designados = server.ambientesDesignados || [];
    if (
      designados.some((d) => {
        const n = normalizeText(d);
        return n === 'todos' || n === 'geral' || n === 'todas' || n === '*';
      })
    ) {
      return true;
    }

    return false;
  }

  /**
   * Access Control: Verify if a server has access to a specific location (Inventario_Bens/Local)
   * based on their Servidores_Autorizados/CargoFuncao and LocaisDesignados.
   *
   * - Presidente / Vice-Presidente: Access to ALL blocks and locations.
   * - Membro: Access ONLY to their designated locations (LocaisDesignados).
   */
  public isServerAuthorizedForLocation(server: AuthorizedServer | UserProfile | null, location: string): boolean {
    if (!server) return false;

    // Presidente and Vice-Presidente have unrestricted access to all blocks and locations
    if (this.isPresidenteOrVice(server)) {
      return true;
    }

    // Membro: strictly restricted to their designated locations
    const designados = server.ambientesDesignados || [];
    if (designados.length === 0) return false;

    const normLoc = normalizeText(location);
    if (!normLoc) return false;

    return designados.some((des) => {
      const normDes = normalizeText(des);
      if (!normDes) return false;
      if (normDes === 'todos' || normDes === 'geral' || normDes === '*') return true;
      return normLoc === normDes || normLoc.includes(normDes) || normDes.includes(normLoc);
    });
  }

  /**
   * Returns only the inventory items corresponding to the user's designated locations.
   * Presidente/Vice-Presidente gets all items.
   * Membro gets ONLY items in their designated locations.
   */
  public getAllowedItemsForUser(user: UserProfile | null): InventoryItem[] {
    if (!user) return this.items;
    if (this.isPresidenteOrVice(user)) {
      return this.items;
    }
    return this.items.filter((item) => this.isServerAuthorizedForLocation(user, item.ambiente));
  }

  /**
   * Returns only the blocks that contain environments assigned to the user.
   * Presidente/Vice-Presidente gets ALL blocks in the inventory.
   * Membro gets ONLY the blocks containing their designated locations.
   */
  public getAllowedBlocosForUser(user: UserProfile | null): string[] {
    if (!user || this.isPresidenteOrVice(user)) {
      return this.getUniqueBlocos();
    }

    const allowedItems = this.getAllowedItemsForUser(user);
    const blocos = new Set<string>();
    allowedItems.forEach((item) => {
      if (item.bloco) blocos.add(item.bloco);
    });

    // Also include blocks from extra items matching the user's designated locations
    this.extraItems.forEach((ex) => {
      if (this.isServerAuthorizedForLocation(user, ex.ambiente) && ex.bloco) {
        blocos.add(ex.bloco);
      }
    });

    return Array.from(blocos).sort();
  }

  /**
   * Returns only the environments (Locais) assigned to the user.
   * Presidente/Vice-Presidente gets ALL environments in the block.
   * Membro gets ONLY their designated locations that belong to the block.
   */
  public getAllowedAmbientesForUser(user: UserProfile | null, bloco?: string): string[] {
    if (!user || this.isPresidenteOrVice(user)) {
      return this.getAmbientesByBloco(bloco);
    }

    const allowedItems = this.getAllowedItemsForUser(user);
    const ambientes = new Set<string>();
    allowedItems.forEach((item) => {
      if (!bloco || item.bloco === bloco) {
        if (item.ambiente) ambientes.add(item.ambiente);
      }
    });

    // In case an assigned location has no items in the spreadsheet yet
    if (user.ambientesDesignados && user.ambientesDesignados.length > 0) {
      user.ambientesDesignados.forEach((des) => {
        const itemInBlock = this.items.find(
          (it) => (!bloco || it.bloco === bloco) && normalizeText(it.ambiente) === normalizeText(des)
        );
        if (itemInBlock) {
          ambientes.add(itemInBlock.ambiente);
        } else if (!bloco && this.isServerAuthorizedForLocation(user, des)) {
          ambientes.add(des);
        }
      });
    }

    return Array.from(ambientes).sort();
  }

  // Items query
  public getAllItems(): InventoryItem[] {
    return this.items;
  }

  public getExtraItems(): ExtraItem[] {
    return this.extraItems;
  }

  public getSheetConfig(): SheetConfig {
    return this.sheetConfig;
  }

  public getReports(): SyncReport[] {
    return this.reports;
  }

  // Verify whether a specific item is recorded as verified (non-PENDENTE) in the official spreadsheet aba Inventario_Bens
  public isItemVerifiedInSpreadsheet(patrimonio: string): boolean {
    if (!patrimonio) return false;
    const cleanPat = patrimonio.trim().toLowerCase();
    const official = this.officialItems.find(
      (i) =>
        (i.patrimonio && i.patrimonio.trim().toLowerCase() === cleanPat) ||
        (i.patrimonioAntigo && i.patrimonioAntigo.trim().toLowerCase() === cleanPat)
    );
    if (!official) return false;

    // If marked as PENDENTE or empty in the official sheet, it is NOT verified as sent
    if (!official.status || official.status === 'PENDENTE') {
      return false;
    }

    return (
      official.status === 'LOCALIZADO' ||
      official.status === 'NAO_LOCALIZADO' ||
      official.status === 'DIVERGENCIA_LOCAL'
    );
  }

  // Verify whether all items of an environment are confirmed preenchidos (non-PENDENTE) in Inventario_Bens
  public isAmbienteVerifiedInSpreadsheet(ambiente: string): boolean {
    if (!ambiente) return false;
    const cleanAmbiente = ambiente.trim().toLowerCase();
    const roomOfficial = this.officialItems.filter(
      (i) => i.ambiente && i.ambiente.trim().toLowerCase() === cleanAmbiente
    );
    if (roomOfficial.length === 0) return false;

    // If ANY item for this room on the official sheet is still PENDENTE,
    // the app must consider that it was NOT sent (or send failed)
    const hasPendente = roomOfficial.some(
      (i) => !i.status || i.status === 'PENDENTE'
    );
    if (hasPendente) {
      return false;
    }

    return roomOfficial.every(
      (i) =>
        i.status === 'LOCALIZADO' ||
        i.status === 'NAO_LOCALIZADO' ||
        i.status === 'DIVERGENCIA_LOCAL'
    );
  }

  // Live verification against Google Sheets Inventario_Bens
  public async verifySpreadsheetStatus(ambiente: string): Promise<{
    verified: boolean;
    pendingCount: number;
    filledCount: number;
    totalCount: number;
    message: string;
  }> {
    const spreadsheetId = this.sheetConfig.spreadsheetId;
    const sheetBens = this.sheetConfig.sheetNameInventario || 'Inventario_Bens';
    const bensUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheetBens
    )}&t=${Date.now()}`;

    try {
      const res = await fetch(bensUrl, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const { cols, rows } = parseGvizResponse(text);
        const freshOfficial = rows
          .map((row, idx) => mapRowToInventoryItem(cols, row, idx))
          .filter((item): item is InventoryItem => item !== null);

        if (freshOfficial.length > 0) {
          this.officialItems = freshOfficial;
          safeSetItem(STORAGE_KEYS.OFFICIAL_ITEMS, JSON.stringify(this.officialItems));
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar status da planilha:', err);
    }

    const cleanAmbiente = ambiente.trim().toLowerCase();
    const roomItems = this.officialItems.filter(
      (i) => i.ambiente && i.ambiente.trim().toLowerCase() === cleanAmbiente
    );
    const totalCount = roomItems.length;
    const pendingCount = roomItems.filter((i) => !i.status || i.status === 'PENDENTE').length;
    const filledCount = totalCount - pendingCount;
    const verified = totalCount > 0 && pendingCount === 0;

    let message = '';
    if (verified) {
      message = `Conferência confirmada na planilha: todos os ${totalCount} item(ns) constam preenchidos na aba Inventario_Bens.`;
    } else if (pendingCount > 0) {
      message = `Na planilha Inventario_Bens constam ${pendingCount} de ${totalCount} item(ns) como Pendente. O app mantém os cards desbloqueados para edição direta.`;
    } else {
      message = `Nenhum item localizado na planilha para o ambiente "${ambiente}".`;
    }

    return {
      verified,
      pendingCount,
      filledCount,
      totalCount,
      message,
    };
  }

  // Get last successful sync report for an environment based strictly on sheet confirmation
  public getLastSyncForAmbiente(ambiente: string): SyncReport | null {
    if (!ambiente) return null;
    const cleanAmbiente = ambiente.trim().toLowerCase();

    // Check strict verification in spreadsheet Inventario_Bens
    const isVerifiedInSheet = this.isAmbienteVerifiedInSpreadsheet(ambiente);
    if (!isVerifiedInSheet) {
      // If the spreadsheet still has items as Pendente, the app MUST consider that it was NOT sent
      // or that an error occurred, keeping the default state with cards unlocked for direct changes.
      return null;
    }

    const report = this.reports.find(
      (r) => r.ambiente && r.ambiente.trim().toLowerCase() === cleanAmbiente && r.status === 'SUCESSO'
    );
    if (report) return report;

    // Fallback constructed from verified official spreadsheet items
    const roomOfficial = this.officialItems.filter(
      (i) => i.ambiente && i.ambiente.trim().toLowerCase() === cleanAmbiente
    );

    const latestVerified = roomOfficial.reduce((acc, curr) => {
      if (!acc.verificadoEm) return curr;
      if (!curr.verificadoEm) return acc;
      return new Date(curr.verificadoEm).getTime() > new Date(acc.verificadoEm).getTime() ? curr : acc;
    }, roomOfficial[0]);

    return {
      timestamp: latestVerified.verificadoEm
        ? (latestVerified.verificadoEm.includes('/')
          ? latestVerified.verificadoEm
          : new Date(latestVerified.verificadoEm).toLocaleString('pt-BR'))
        : 'Confirmado na Planilha Oficial',
      totalConferidos: roomOfficial.length,
      localizados: roomOfficial.filter((i) => i.status === 'LOCALIZADO').length,
      naoLocalizados: roomOfficial.filter((i) => i.status === 'NAO_LOCALIZADO').length,
      divergentes: roomOfficial.filter((i) => i.status === 'DIVERGENCIA_LOCAL').length,
      extras: this.extraItems.filter((e) => e.ambiente && e.ambiente.trim().toLowerCase() === cleanAmbiente).length,
      ambiente,
      servidor: latestVerified.verificadoPorNome || latestVerified.verificadoPor || 'Conferente UTFPR',
      status: 'SUCESSO',
      mensagem: 'Conferência confirmada e preenchida na planilha oficial (Inventario_Bens).',
    };
  }

  // Get unique distinct blocks and environments
  public getUniqueBlocos(): string[] {
    const blocos = new Set<string>();
    this.items.forEach((item) => {
      if (item.bloco) blocos.add(item.bloco);
    });
    return Array.from(blocos).sort();
  }

  public getAmbientesByBloco(bloco?: string): string[] {
    const ambientes = new Set<string>();
    this.items.forEach((item) => {
      if (!bloco || item.bloco === bloco) {
        if (item.ambiente) ambientes.add(item.ambiente);
      }
    });
    return Array.from(ambientes).sort();
  }

  // Find item by Barcode / Patrimonio (supports both current and old tags)
  public findItemByPatrimonio(query: string): InventoryItem | null {
    const clean = query.trim();
    if (!clean) return null;

    const normQuery = normalizeText(clean);

    return this.items.find((item) => {
      const normPat = normalizeText(item.patrimonio);
      const normAntigo = normalizeText(item.patrimonioAntigo);
      const normId = normalizeText(item.id);
      return normPat === normQuery || normAntigo === normQuery || normId === normQuery;
    }) || null;
  }

  // Update item
  public updateItem(id: string, updates: Partial<InventoryItem>): InventoryItem | null {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;

    if (updates.status === 'PENDENTE') {
      this.items[index] = {
        ...this.items[index],
        ...updates,
        status: 'PENDENTE',
        verificadoEm: undefined,
        verificadoPor: undefined,
        verificadoPorNome: undefined,
        ambienteVerificado: undefined,
      };
      this.saveItems();
      return this.items[index];
    }

    this.items[index] = {
      ...this.items[index],
      ...updates,
    };
    this.saveItems();
    return this.items[index];
  }

  // Add extra item (non-cataloged item found on site)
  public addExtraItem(item: Omit<ExtraItem, 'id' | 'cadastradoEm'>): ExtraItem {
    const newExtra: ExtraItem = {
      ...item,
      id: `EXTRA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cadastradoEm: new Date().toISOString(),
    };
    this.extraItems.push(newExtra);
    this.saveExtras();
    return newExtra;
  }

  // Remove an extra item if added by mistake
  public deleteExtraItem(id: string) {
    this.extraItems = this.extraItems.filter((ex) => ex.id !== id);
    this.saveExtras();
  }

  // Set Apps Script Webhook URL
  public setWebhookUrl(url: string) {
    this.sheetConfig.webhookUrl = url.trim();
    try {
      localStorage.setItem('utfpr_inventario_webhook_url', url.trim());
    } catch (e) {
      console.error('Falha ao salvar URL do webhook', e);
    }
  }

  // Generate Google Apps Script code pre-configured for this spreadsheet
  public getAppsScriptCode(): string {
    const sheetBens = this.sheetConfig.sheetNameInventario || 'Inventario_Bens';
    const sheetExtras = this.sheetConfig.sheetNameExtras || 'Itens_Nao_Cadastrados';
    return `/**
 * SCRIPT DE SINCRONIZAÇÃO AUTOMÁTICA - INVENTÁRIO UTFPR APUCARANA
 * ID da Planilha: ${this.sheetConfig.spreadsheetId}
 * 
 * PASSO A PASSO PARA ATIVAÇÃO:
 * 1. Na planilha Google Sheets, clique no menu superior em: "Extensões" > "Apps Script".
 * 2. Apague qualquer código existente no editor e cole TODO este código abaixo.
 * 3. Clique no ícone de "Salvar projeto" (disquete) no topo.
 * 4. Clique no botão azul "Implantar" (canto superior direito) > "Nova implantação".
 * 5. Na janela que abrir, clique na engrenagem ao lado de "Selecione o tipo" e selecione "App da Web".
 * 6. Preencha:
 *    - Descrição: Sincronizador UTFPR Apucarana
 *    - Executar como: "Eu (seu email)"
 *    - Quem tem acesso: "Qualquer pessoa" (Anyone)
 * 7. Clique em "Implantar", clique em "Autorizar acesso" e conceda a permissão à sua própria planilha.
 * 8. Copie a "URL do app da Web" gerada (termina em /exec) e cole no aplicativo.
 */

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : "";
    if (!raw) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Nenhum dado recebido" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var updatedCount = 0;
    var extrasCount = 0;

    // 1. Atualizar itens em ${sheetBens}
    if (data.items && data.items.length > 0) {
      var sheetBens = ss.getSheetByName("${sheetBens}");
      if (sheetBens) {
        var dataRange = sheetBens.getDataRange();
        var values = dataRange.getValues();
        if (values.length > 0) {
          var headers = values[0].map(function(h) {
            return String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          });

          var colPat = headers.indexOf("patrimonio");
          if (colPat === -1) colPat = headers.indexOf("tombo");
          if (colPat === -1) colPat = 2; // Padrão: coluna C (Patrimonio)

          var colStatus = headers.indexOf("status");
          var colEstado = headers.indexOf("estadoconservacao");
          var colData = headers.indexOf("dataconferencia");
          var colServidor = headers.indexOf("servidorconferente");
          var colAmbienteEnc = headers.indexOf("ambienteencontrado");
          var colObs = headers.indexOf("observacoes");

          var itemMap = {};
          for (var k = 0; k < data.items.length; k++) {
            var itm = data.items[k];
            if (itm.patrimonio) {
              itemMap[String(itm.patrimonio).trim().toLowerCase()] = itm;
            }
          }

          for (var r = 1; r < values.length; r++) {
            var rowPat = String(values[r][colPat]).trim().toLowerCase();
            if (itemMap[rowPat]) {
              var it = itemMap[rowPat];
              if (colStatus !== -1 && it.status) {
                sheetBens.getRange(r + 1, colStatus + 1).setValue(it.status);
              }
              if (colEstado !== -1 && it.estadoConservacao) {
                sheetBens.getRange(r + 1, colEstado + 1).setValue(it.estadoConservacao);
              }
              if (colData !== -1 && it.verificadoEm) {
                sheetBens.getRange(r + 1, colData + 1).setValue(new Date(it.verificadoEm).toLocaleString("pt-BR"));
              }
              if (colServidor !== -1 && (it.verificadoPorNome || it.verificadoPor)) {
                sheetBens.getRange(r + 1, colServidor + 1).setValue(it.verificadoPorNome || it.verificadoPor);
              }
              if (colAmbienteEnc !== -1 && (it.ambienteVerificado || it.ambiente)) {
                sheetBens.getRange(r + 1, colAmbienteEnc + 1).setValue(it.ambienteVerificado || it.ambiente);
              }
              if (colObs !== -1 && it.observacoes !== undefined) {
                sheetBens.getRange(r + 1, colObs + 1).setValue(it.observacoes);
              }
              updatedCount++;
            }
          }
        }
      }
    }

    // 2. Inserir itens extras na aba ${sheetExtras}
    // Colunas na planilha: [Bloco, Local, Patrimonio, Descricao, EstadoConservacao, CadastradoPor, Observacoes, DataHora]
    if (data.extras && data.extras.length > 0) {
      var sheetExtras = ss.getSheetByName("${sheetExtras}");
      if (sheetExtras) {
        var lastRow = sheetExtras.getLastRow();
        if (lastRow === 0) {
          sheetExtras.appendRow([
            "Bloco",
            "Local",
            "Patrimonio",
            "Descricao",
            "EstadoConservacao",
            "CadastradoPor",
            "Observacoes",
            "DataHora"
          ]);
          lastRow = 1;
        }

        var extraHeaders = sheetExtras.getRange(1, 1, 1, Math.max(sheetExtras.getLastColumn(), 8)).getValues()[0].map(function(h) {
          return String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        });

        var idxBloco = extraHeaders.indexOf("bloco");
        var idxLocal = extraHeaders.indexOf("local") !== -1 ? extraHeaders.indexOf("local") : extraHeaders.indexOf("ambiente");
        var idxPat = extraHeaders.indexOf("patrimonio");
        var idxDesc = extraHeaders.indexOf("descricao");
        var idxEstado = extraHeaders.indexOf("estadoconservacao");
        var idxCad = extraHeaders.indexOf("cadastradopor");
        var idxObs = extraHeaders.indexOf("observacoes");
        var idxData = extraHeaders.indexOf("datahora");

        for (var j = 0; j < data.extras.length; j++) {
          var ex = data.extras[j];
          var dataFormatada = ex.cadastradoEm
            ? (String(ex.cadastradoEm).indexOf("/") !== -1 ? ex.cadastradoEm : new Date(ex.cadastradoEm).toLocaleString("pt-BR"))
            : new Date().toLocaleString("pt-BR");

          var rowLength = Math.max(extraHeaders.length, 8);
          var newRow = new Array(rowLength).fill("");

          if (idxBloco !== -1) newRow[idxBloco] = ex.bloco || "";
          else newRow[0] = ex.bloco || "";

          if (idxLocal !== -1) newRow[idxLocal] = ex.ambiente || "";
          else newRow[1] = ex.ambiente || "";

          if (idxPat !== -1) newRow[idxPat] = ex.patrimonio || "";
          else newRow[2] = ex.patrimonio || "";

          if (idxDesc !== -1) newRow[idxDesc] = ex.descricao || "";
          else newRow[3] = ex.descricao || "";

          if (idxEstado !== -1) newRow[idxEstado] = ex.estadoConservacao || "BOM";
          else newRow[4] = ex.estadoConservacao || "BOM";

          if (idxCad !== -1) newRow[idxCad] = ex.cadastradoPorNome || ex.cadastradoPor || "";
          else newRow[5] = ex.cadastradoPorNome || ex.cadastradoPor || "";

          if (idxObs !== -1) newRow[idxObs] = ex.observacoes || "";
          else newRow[6] = ex.observacoes || "";

          if (idxData !== -1) newRow[idxData] = dataFormatada;
          else newRow[7] = dataFormatada;

          sheetExtras.appendRow(newRow);
          extrasCount++;
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Planilha atualizada com sucesso!",
      updatedItems: updatedCount,
      addedExtras: extrasCount
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    sheet: "${this.sheetConfig.spreadsheetId}",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}`;
  }

  // Sync to Google Sheets via Apps Script Webhook or Local Buffer
  public async syncToGoogleSheets(
    accessToken: string | null,
    serverEmail: string,
    serverName: string,
    ambiente: string
  ): Promise<{ success: boolean; message: string; report: SyncReport }> {
    const ambientItems = this.items.filter((i) => i.ambiente === ambiente);
    const localizados = ambientItems.filter((i) => i.status === 'LOCALIZADO').length;
    const naoLocalizados = ambientItems.filter((i) => i.status === 'NAO_LOCALIZADO').length;
    const divergentes = ambientItems.filter((i) => i.status === 'DIVERGENCIA_LOCAL').length;
    const extrasInAmbiente = this.extraItems.filter((e) => e.ambiente === ambiente).length;

    const report: SyncReport = {
      timestamp: new Date().toLocaleString('pt-BR'),
      totalConferidos: ambientItems.length,
      localizados,
      naoLocalizados,
      divergentes,
      extras: extrasInAmbiente,
      ambiente,
      servidor: `${serverName} (${serverEmail})`,
      status: 'SUCESSO',
      mensagem: `Conferência do local "${ambiente}" salva com êxito.`,
    };

    // Primary: Direct Google Apps Script Webhook execution
    let webhookTriggered = false;
    if (this.sheetConfig.webhookUrl && this.sheetConfig.webhookUrl.startsWith('http')) {
      try {
        const payload = {
          action: 'sync_conferencia',
          spreadsheetId: this.sheetConfig.spreadsheetId,
          ambiente,
          servidor: serverName,
          servidorEmail: serverEmail,
          items: ambientItems,
          extras: this.extraItems.filter((e) => e.ambiente === ambiente),
          timestamp: new Date().toISOString(),
        };

        await fetch(this.sheetConfig.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
          mode: 'no-cors',
        });
        webhookTriggered = true;
      } catch (err: any) {
        console.warn('Erro ao disparar webhook do Apps Script:', err);
      }
    }

    // If webhook was triggered, wait briefly for Apps Script to commit cell updates to Google Sheets
    if (webhookTriggered) {
      await new Promise((resolve) => setTimeout(resolve, 1600));
    }

    // Live verification: check whether sent items are actually recorded/preenchidos in Inventario_Bens
    const verification = await this.verifySpreadsheetStatus(ambiente);

    if (verification.verified) {
      // Confirmed: spreadsheet Inventario_Bens has all items recorded and not PENDENTE
      report.status = 'SUCESSO';
      report.mensagem = `Envio verificado e confirmado na planilha oficial! Os ${verification.filledCount} item(ns) do local "${ambiente}" constam preenchidos na aba Inventario_Bens. A seleção nos cards foi travada.`;

      this.reports.unshift(report);
      if (this.reports.length > 50) this.reports.pop();
      this.saveReports();
      this.updateLastSyncTime();

      return {
        success: true,
        message: report.mensagem,
        report,
      };
    } else {
      // If items on the sheet remain PENDENTE, treat as not sent / send error:
      // Keep default behavior allowing direct edits on cards
      report.status = 'ERRO';
      const detailMsg = webhookTriggered
        ? `Os itens ainda constam como Pendentes na aba Inventario_Bens da planilha oficial (${verification.pendingCount} pendente(s)). O envio não foi confirmado na planilha. Os cards continuam liberados para alterações diretas.`
        : `Atenção: Os itens ainda constam como Pendentes na planilha oficial. Para envio direto, configure o Webhook do Google Apps Script ou utilize a exportação TSV. Os cards continuam liberados para alterações diretas.`;

      report.mensagem = detailMsg;

      // Ensure no SUCCESS report remains for this ambiente while the sheet is pending
      const cleanAmbiente = ambiente.trim().toLowerCase();
      this.reports = this.reports.filter(
        (r) => !(r.ambiente && r.ambiente.trim().toLowerCase() === cleanAmbiente && r.status === 'SUCESSO')
      );
      this.saveReports();

      return {
        success: false,
        message: detailMsg,
        report: null as any,
      };
    }
  }

  // Export current room or all items as Tab-Separated Values (TSV) for instant Ctrl+V pasting into Google Sheets
  public exportTSVForClipboard(ambienteFilter?: string): string {
    const itemsToExport = ambienteFilter
      ? this.items.filter((it) => it.ambiente === ambienteFilter)
      : this.items;

    // Headers matching Inventario_Bens
    const rows = itemsToExport.map((it) => [
      it.bloco,
      it.ambiente,
      it.patrimonio,
      it.patrimonioAntigo || '',
      it.descricao || '',
      it.status,
      it.estadoConservacao || 'BOM',
      it.verificadoEm ? new Date(it.verificadoEm).toLocaleString('pt-BR') : '',
      it.verificadoPorNome || it.verificadoPor || '',
      it.ambienteVerificado || '',
      it.observacoes || '',
    ]);

    return rows.map((r) => r.join('\t')).join('\n');
  }

  // Export Itens_Nao_Cadastrados formatted specifically for pasting (Ctrl+V) into Google Sheets tab Itens_Nao_Cadastrados
  // Headers match live sheet: Bloco, Local, Patrimonio, Descricao, EstadoConservacao, CadastradoPor, Observacoes, DataHora
  public exportExtrasTSVForClipboard(ambienteFilter?: string): string {
    const extrasToExport = ambienteFilter
      ? this.extraItems.filter((ex) => ex.ambiente === ambienteFilter)
      : this.extraItems;

    const rows = extrasToExport.map((ex) => [
      ex.bloco || '',
      ex.ambiente || '',
      ex.patrimonio || '',
      ex.descricao || '',
      ex.estadoConservacao || 'BOM',
      ex.cadastradoPorNome || ex.cadastradoPor || '',
      ex.observacoes || '',
      ex.cadastradoEm ? (ex.cadastradoEm.includes('/') ? ex.cadastradoEm : new Date(ex.cadastradoEm).toLocaleString('pt-BR')) : new Date().toLocaleString('pt-BR'),
    ]);

    return rows.map((r) => r.join('\t')).join('\n');
  }

  // Export Itens_Nao_Cadastrados as standalone CSV file with exact standard headers
  public exportExtrasCSV(ambienteFilter?: string): string {
    const extrasToExport = ambienteFilter
      ? this.extraItems.filter((ex) => ex.ambiente === ambienteFilter)
      : this.extraItems;

    const headers = [
      'Bloco',
      'Local',
      'Patrimonio',
      'Descricao',
      'EstadoConservacao',
      'CadastradoPor',
      'Observacoes',
      'DataHora',
    ];

    const rows = extrasToExport.map((ex) => [
      `"${ex.bloco || ''}"`,
      `"${ex.ambiente || ''}"`,
      `"${ex.patrimonio || ''}"`,
      `"${(ex.descricao || '').replace(/"/g, '""')}"`,
      `"${ex.estadoConservacao || 'BOM'}"`,
      `"${(ex.cadastradoPorNome || ex.cadastradoPor || '').replace(/"/g, '""')}"`,
      `"${(ex.observacoes || '').replace(/"/g, '""')}"`,
      `"${ex.cadastradoEm ? (ex.cadastradoEm.includes('/') ? ex.cadastradoEm : new Date(ex.cadastradoEm).toLocaleString('pt-BR')) : new Date().toLocaleString('pt-BR')}"`,
    ]);

    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  }

  // Pull latest updates from the master Google Sheet
  public async pullSpreadsheetUpdates(): Promise<{ success: boolean; message: string; updatedCount: number }> {
    const result = await this.fetchDataFromGoogleSheets();
    return {
      success: result.success,
      message: result.message,
      updatedCount: result.itemsCount,
    };
  }

  // Export current inventory dataset as downloadable CSV formatted strictly according to the standard sheet
  public exportCSV(ambienteFilter?: string): string {
    const itemsToExport = ambienteFilter
      ? this.items.filter((it) => it.ambiente === ambienteFilter)
      : this.items;

    const headers = [
      'Bloco',
      'Local',
      'Patrimonio',
      'PatrimonioAntigo',
      'Descricao',
      'Status',
      'EstadoConservacao',
      'DataConferencia',
      'ServidorConferente',
      'AmbienteEncontrado',
      'Observacoes',
    ];

    const rows = itemsToExport.map((it) => [
      `"${it.bloco}"`,
      `"${it.ambiente}"`,
      `"${it.patrimonio}"`,
      `"${it.patrimonioAntigo || ''}"`,
      `"${(it.descricao || '').replace(/"/g, '""')}"`,
      `"${it.status}"`,
      `"${it.estadoConservacao || 'BOM'}"`,
      `"${it.verificadoEm ? new Date(it.verificadoEm).toLocaleString('pt-BR') : ''}"`,
      `"${it.verificadoPorNome || it.verificadoPor || ''}"`,
      `"${it.ambienteVerificado || ''}"`,
      `"${(it.observacoes || '').replace(/"/g, '""')}"`,
    ]);

    // Extra items section formatted with exact standard Itens_Nao_Cadastrados columns
    if (this.extraItems.length > 0) {
      rows.push(['\r\n--- ITENS_NAO_CADASTRADOS ---', '', '', '', '', '', '', '', '', '', '']);
      rows.push([
        'Bloco',
        'Local',
        'Patrimonio',
        'Descricao',
        'EstadoConservacao',
        'CadastradoPor',
        'Observacoes',
        'DataHora',
        '',
        '',
        '',
      ]);
      this.extraItems.forEach((ex) => {
        const dataFmt = ex.cadastradoEm
          ? (ex.cadastradoEm.includes('/') ? ex.cadastradoEm : new Date(ex.cadastradoEm).toLocaleString('pt-BR'))
          : new Date().toLocaleString('pt-BR');
        rows.push([
          `"${ex.bloco || ''}"`,
          `"${ex.ambiente || ''}"`,
          `"${ex.patrimonio || ''}"`,
          `"${(ex.descricao || '').replace(/"/g, '""')}"`,
          `"${ex.estadoConservacao || 'BOM'}"`,
          `"${(ex.cadastradoPorNome || ex.cadastradoPor || '').replace(/"/g, '""')}"`,
          `"${(ex.observacoes || '').replace(/"/g, '""')}"`,
          `"${dataFmt}"`,
          `""`,
          `""`,
          `""`,
        ]);
      });
    }

    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  }
}

export const dataService = new DataService();
