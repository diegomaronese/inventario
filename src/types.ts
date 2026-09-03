export type ItemStatus =
  | 'PENDENTE'
  | 'LOCALIZADO'
  | 'NAO_LOCALIZADO'
  | 'DIVERGENCIA_LOCAL'
  | 'EM_MANUTENCAO'
  | 'BAIXA_SUGERIDA';

export type ItemCondition = 'BOM' | 'REGULAR' | 'RUIM' | 'OCIOSO' | 'RECUPERAVEL' | 'ANTIECONOMICO' | 'INSERVIVEL';

export interface InventoryItem {
  id: string;
  bloco: string; // Coluna: Bloco (ex: "Bloco B")
  ambiente: string; // Coluna: Local (ex: "COGERH")
  patrimonio: string; // Coluna: Patrimonio (ex: "96552")
  patrimonioAntigo?: string; // Coluna: PatrimonioAntigo (ex: "3334")
  descricao: string; // Coluna: Descricao (ex: "Cadeira Fixa")
  status: ItemStatus; // Coluna: Status (ex: "PENDENTE", "LOCALIZADO", "NAO_LOCALIZADO", "DIVERGENCIA_LOCAL")
  estadoConservacao?: ItemCondition; // Coluna: EstadoConservacao (ex: "BOM", "REGULAR", "RUIM", "OCIOSO", "RECUPERAVEL", "INSERVIVEL")
  verificadoEm?: string; // Coluna: DataConferencia
  verificadoPor?: string; // Coluna: ServidorConferente
  verificadoPorNome?: string; // Coluna: ServidorConferente
  ambienteVerificado?: string; // Coluna: AmbienteEncontrado
  observacoes?: string; // Coluna: Observacoes
  marcaModelo?: string;
  numeroSerie?: string;
  tipoItem?: string;
  divergente?: boolean;
}

export interface ExtraItem {
  id: string;
  cadastradoEm: string; // Coluna da Planilha: DataHora (ex: "01/09/2026, 16:28:22")
  patrimonio: string; // Coluna da Planilha: Patrimonio (ex: "45101")
  descricao: string; // Coluna da Planilha: Descricao (ex: "Computador")
  bloco: string; // Coluna da Planilha: Bloco (ex: "Bloco B")
  ambiente: string; // Coluna da Planilha: Local (ex: "COGERH")
  estadoConservacao?: ItemCondition; // Coluna da Planilha: EstadoConservacao (ex: "BOM", "REGULAR", "RUIM", "OCIOSO", "RECUPERAVEL", "INSERVIVEL")
  cadastradoPor: string; // Coluna da Planilha: CadastradoPor (ex: "Diego Maronese" ou email)
  cadastradoPorNome?: string; // Nome completo do servidor
  observacoes?: string; // Coluna da Planilha: Observacoes (ex: "Item não localizado no cadastro geral")
  marcaModelo?: string;
  tipoItem?: string;
}

export interface AuthorizedServer {
  email: string; // Coluna: Email
  nome: string; // Coluna: Nome
  matriculaSiape: string; // Coluna: Siape
  departamento: string; // Coluna: Departamento
  ambientesDesignados: string[]; // Coluna: LocaisDesignados (dividido por vírgula se múltiplos)
  ativo: boolean; // Coluna: Ativo
  cargo?: string; // Coluna: CargoFuncao
}

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  matriculaSiape?: string;
  departamento?: string;
  ambientesDesignados: string[];
  isAuthorized: boolean;
  cargo?: string; // Coluna da Planilha: CargoFuncao (ex: "Presidente", "Vice-Presidente", "Membro")
  role: 'SERVIDOR' | 'COMISSAO_INVENTARIO' | 'ADMIN';
  token?: string;
}

export interface SheetConfig {
  spreadsheetId: string;
  sheetNameInventario: string;
  sheetNameServidores: string;
  sheetNameExtras: string;
  webhookUrl?: string;
  lastSyncedAt?: string;
  autoSync: boolean;
}

export interface ScanResult {
  code: string;
  format?: string;
  timestamp: number;
}

export interface SyncReport {
  timestamp: string;
  totalConferidos: number;
  localizados: number;
  naoLocalizados: number;
  divergentes: number;
  extras: number;
  ambiente: string;
  servidor: string;
  status: 'SUCESSO' | 'ERRO';
  mensagem: string;
}
