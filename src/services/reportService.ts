import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem, ExtraItem, UserProfile } from '../types';

export interface LocationProgress {
  bloco: string;
  ambiente: string;
  total: number;
  localizados: number;
  naoLocalizados: number;
  pendentes: number;
  divergentes: number;
  extras: number;
  percentual: number;
  status: 'CONCLUIDO' | 'EM_ANDAMENTO' | 'NAO_INICIADO';
  servidores: string[];
}

export interface ServerPerformance {
  nome: string;
  siape: string;
  email: string;
  totalItensVerificados: number;
  locaisAtuados: string[];
  ultimaAtividade?: string;
}

export interface DivergenceRecord {
  tipo: 'LOCAL_DIVERGENTE' | 'ITEM_EXTRA' | 'NAO_LOCALIZADO' | 'BAIXA_SUGERIDA' | 'ESTADO_CRITICO';
  tipoDescricao: string;
  patrimonio: string;
  patrimonioAntigo?: string;
  descricao: string;
  blocoOriginal?: string;
  localOriginal?: string;
  localEncontrado?: string;
  estadoConservacao?: string;
  servidor?: string;
  observacoes?: string;
  dataHora?: string;
}

/**
 * Report Service: Generates analytical reports and exports executive institutional PDFs for UTFPR Inventory Commission
 */
export const reportService = {
  /**
   * Calculates progress for all locations in the dataset
   */
  calculateLocationsProgress(items: InventoryItem[], extraItems: ExtraItem[]): LocationProgress[] {
    const map = new Map<string, {
      bloco: string;
      ambiente: string;
      total: number;
      localizados: number;
      naoLocalizados: number;
      pendentes: number;
      divergentes: number;
      extras: number;
      servidores: Set<string>;
    }>();

    // Process original inventory items
    for (const item of items) {
      const key = `${item.bloco || 'Sem Bloco'}:::${item.ambiente || 'Sem Local'}`;
      if (!map.has(key)) {
        map.set(key, {
          bloco: item.bloco || 'Geral',
          ambiente: item.ambiente || 'Não especificado',
          total: 0,
          localizados: 0,
          naoLocalizados: 0,
          pendentes: 0,
          divergentes: 0,
          extras: 0,
          servidores: new Set<string>(),
        });
      }

      const rec = map.get(key)!;
      rec.total++;

      if (item.status === 'LOCALIZADO') {
        rec.localizados++;
      } else if (item.status === 'NAO_LOCALIZADO') {
        rec.naoLocalizados++;
      } else if (item.status === 'DIVERGENCIA_LOCAL') {
        rec.divergentes++;
      } else {
        rec.pendentes++;
      }

      if (item.verificadoPorNome || item.verificadoPor) {
        rec.servidores.add(item.verificadoPorNome || item.verificadoPor || '');
      }
    }

    // Process extra items added in locations
    for (const extra of extraItems) {
      const key = `${extra.bloco || 'Sem Bloco'}:::${extra.ambiente || 'Sem Local'}`;
      if (!map.has(key)) {
        map.set(key, {
          bloco: extra.bloco || 'Geral',
          ambiente: extra.ambiente || 'Não especificado',
          total: 0,
          localizados: 0,
          naoLocalizados: 0,
          pendentes: 0,
          divergentes: 0,
          extras: 0,
          servidores: new Set<string>(),
        });
      }

      const rec = map.get(key)!;
      rec.extras++;
      if (extra.cadastradoPorNome || extra.cadastradoPor) {
        rec.servidores.add(extra.cadastradoPorNome || extra.cadastradoPor || '');
      }
    }

    const list: LocationProgress[] = [];
    map.forEach((rec) => {
      const totalVerificados = rec.localizados + rec.naoLocalizados + rec.divergentes;
      const pct = rec.total > 0 ? Math.round((totalVerificados / rec.total) * 100) : (rec.extras > 0 ? 100 : 0);
      let status: 'CONCLUIDO' | 'EM_ANDAMENTO' | 'NAO_INICIADO' = 'NAO_INICIADO';
      if (pct >= 100) {
        status = 'CONCLUIDO';
      } else if (totalVerificados > 0 || rec.extras > 0) {
        status = 'EM_ANDAMENTO';
      }

      list.push({
        bloco: rec.bloco,
        ambiente: rec.ambiente,
        total: rec.total,
        localizados: rec.localizados,
        naoLocalizados: rec.naoLocalizados,
        pendentes: rec.pendentes,
        divergentes: rec.divergentes,
        extras: rec.extras,
        percentual: pct,
        status,
        servidores: Array.from(rec.servidores).filter(Boolean),
      });
    });

    // Sort by Bloco and Ambiente
    list.sort((a, b) => {
      if (a.bloco.localeCompare(b.bloco, 'pt-BR') !== 0) {
        return a.bloco.localeCompare(b.bloco, 'pt-BR');
      }
      return a.ambiente.localeCompare(b.ambiente, 'pt-BR');
    });

    return list;
  },

  /**
   * Calculates performance and items checked per server
   */
  calculateServersPerformance(items: InventoryItem[], extraItems: ExtraItem[]): ServerPerformance[] {
    const map = new Map<string, {
      nome: string;
      siape: string;
      email: string;
      total: number;
      locais: Set<string>;
      datas: string[];
    }>();

    const addServerEntry = (nome: string, local: string, dataHora?: string) => {
      if (!nome || !nome.trim()) return;
      const cleanNome = nome.trim();
      if (!map.has(cleanNome)) {
        map.set(cleanNome, {
          nome: cleanNome,
          siape: '',
          email: '',
          total: 0,
          locais: new Set<string>(),
          datas: [],
        });
      }
      const s = map.get(cleanNome)!;
      s.total++;
      if (local) s.locais.add(local);
      if (dataHora) s.datas.push(dataHora);
    };

    for (const item of items) {
      if (item.status !== 'PENDENTE') {
        const servName = item.verificadoPorNome || item.verificadoPor;
        if (servName) {
          addServerEntry(servName, `${item.bloco} - ${item.ambiente}`, item.verificadoEm);
        }
      }
    }

    for (const extra of extraItems) {
      const servName = extra.cadastradoPorNome || extra.cadastradoPor;
      if (servName) {
        addServerEntry(servName, `${extra.bloco} - ${extra.ambiente}`, extra.cadastradoEm);
      }
    }

    const list: ServerPerformance[] = [];
    map.forEach((rec) => {
      let ultima: string | undefined;
      if (rec.datas.length > 0) {
        rec.datas.sort();
        ultima = rec.datas[rec.datas.length - 1];
      }
      list.push({
        nome: rec.nome,
        siape: rec.siape,
        email: rec.email,
        totalItensVerificados: rec.total,
        locaisAtuados: Array.from(rec.locais),
        ultimaAtividade: ultima,
      });
    });

    list.sort((a, b) => b.totalItensVerificados - a.totalItensVerificados);
    return list;
  },

  /**
   * Gathers all divergences (location divergence, extra items, not found, suggested write-off, bad condition)
   */
  gatherDivergences(items: InventoryItem[], extraItems: ExtraItem[]): DivergenceRecord[] {
    const divergences: DivergenceRecord[] = [];

    // 1. Items with location divergence
    for (const item of items) {
      if (item.status === 'DIVERGENCIA_LOCAL' || (item.ambienteVerificado && item.ambienteVerificado !== item.ambiente)) {
        divergences.push({
          tipo: 'LOCAL_DIVERGENTE',
          tipoDescricao: 'Divergência de Local',
          patrimonio: item.patrimonio,
          patrimonioAntigo: item.patrimonioAntigo,
          descricao: item.descricao,
          blocoOriginal: item.bloco,
          localOriginal: item.ambiente,
          localEncontrado: item.ambienteVerificado || 'Local não registrado',
          estadoConservacao: item.estadoConservacao,
          servidor: item.verificadoPorNome || item.verificadoPor,
          observacoes: item.observacoes,
          dataHora: item.verificadoEm,
        });
      } else if (item.status === 'NAO_LOCALIZADO') {
        divergences.push({
          tipo: 'NAO_LOCALIZADO',
          tipoDescricao: 'Não Localizado no Local',
          patrimonio: item.patrimonio,
          patrimonioAntigo: item.patrimonioAntigo,
          descricao: item.descricao,
          blocoOriginal: item.bloco,
          localOriginal: item.ambiente,
          localEncontrado: 'Não encontrado',
          estadoConservacao: item.estadoConservacao,
          servidor: item.verificadoPorNome || item.verificadoPor,
          observacoes: item.observacoes,
          dataHora: item.verificadoEm,
        });
      } else if (item.status === 'BAIXA_SUGERIDA' || item.estadoConservacao === 'INSERVIVEL' || item.estadoConservacao === 'ANTIECONOMICO') {
        divergences.push({
          tipo: 'BAIXA_SUGERIDA',
          tipoDescricao: 'Sugestão de Baixa / Inservível',
          patrimonio: item.patrimonio,
          patrimonioAntigo: item.patrimonioAntigo,
          descricao: item.descricao,
          blocoOriginal: item.bloco,
          localOriginal: item.ambiente,
          localEncontrado: item.ambiente,
          estadoConservacao: item.estadoConservacao,
          servidor: item.verificadoPorNome || item.verificadoPor,
          observacoes: item.observacoes,
          dataHora: item.verificadoEm,
        });
      }
    }

    // 2. Extra items registered (not found in original database)
    for (const extra of extraItems) {
      divergences.push({
        tipo: 'ITEM_EXTRA',
        tipoDescricao: 'Item Extra / Não Cadastrado',
        patrimonio: extra.patrimonio,
        descricao: extra.descricao,
        blocoOriginal: '-',
        localOriginal: 'Não constava na base',
        localEncontrado: `${extra.bloco} - ${extra.ambiente}`,
        estadoConservacao: extra.estadoConservacao,
        servidor: extra.cadastradoPorNome || extra.cadastradoPor,
        observacoes: extra.observacoes || 'Item encontrado fisicamente sem cadastro prévio no local',
        dataHora: extra.cadastradoEm,
      });
    }

    return divergences;
  },

  /**
   * Helper: Inserts the official UTFPR Institutional Header in PDF
   */
  addInstitutionalHeader(doc: jsPDF, title: string, subtitle: string, user: UserProfile) {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Top colored banner accent (UTFPR Yellow/Amber #EAB308 and Deep Slate #18181B)
    doc.setFillColor(245, 158, 11); // Amber-500
    doc.rect(0, 0, pageWidth, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text('UNIVERSIDADE TECNOLÓGICA FEDERAL DO PARANÁ', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(82, 82, 91);
    doc.text('CAMPUS APUCARANA • COMISSÃO DE INVENTÁRIO PATRIMONIAL 2026', 14, 18);

    // Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text(title.toUpperCase(), 14, 26);

    // Subtitle & Metadata
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(113, 113, 122);
    doc.text(subtitle, 14, 31);

    const emissionDate = new Date().toLocaleString('pt-BR');
    const emissionInfo = `Emissão: ${emissionDate} | Solicitante: ${user.name} (${user.cargo || 'Comissão'}) - SIAPE: ${user.matriculaSiape || 'UTFPR'}`;
    doc.text(emissionInfo, 14, 36);

    // Subtle divider
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(14, 39, pageWidth - 14, 39);

    return 43; // Y position for starting content
  },

  /**
   * Helper: Configures autoTable footers with page numbers
   */
  addInstitutionalFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.3);
      doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      doc.text('Sistema de Inventário Patrimonial UTFPR - Campus Apucarana', 14, pageHeight - 7);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth - 14,
        pageHeight - 7,
        { align: 'right' }
      );
    }
  },

  /**
   * 1. RELATÓRIO GERAL: Todos os Locais e Itens
   */
  exportGeneralReport(items: InventoryItem[], extraItems: ExtraItem[], user: UserProfile, filtroBloco?: string, filtroAmbiente?: string) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    let filteredItems = items;
    let filteredExtras = extraItems;

    if (filtroBloco && filtroBloco !== 'TODOS') {
      filteredItems = filteredItems.filter((i) => i.bloco === filtroBloco);
      filteredExtras = filteredExtras.filter((e) => e.bloco === filtroBloco);
    }
    if (filtroAmbiente && filtroAmbiente !== 'TODOS') {
      filteredItems = filteredItems.filter((i) => i.ambiente === filtroAmbiente);
      filteredExtras = filteredExtras.filter((e) => e.ambiente === filtroAmbiente);
    }

    const totalItens = filteredItems.length;
    const confirmados = filteredItems.filter((i) => i.status === 'LOCALIZADO').length;
    const naoLocalizados = filteredItems.filter((i) => i.status === 'NAO_LOCALIZADO').length;
    const divergentes = filteredItems.filter((i) => i.status === 'DIVERGENCIA_LOCAL').length;
    const pendentes = filteredItems.filter((i) => i.status === 'PENDENTE').length;
    const extrasTotal = filteredExtras.length;
    const percentualGeral = totalItens > 0 ? Math.round(((confirmados + naoLocalizados + divergentes) / totalItens) * 100) : 0;

    let sub = `Consolidado de Bens Patrimoniais e Situação da Conferência`;
    if (filtroBloco && filtroBloco !== 'TODOS') sub += ` | Bloco: ${filtroBloco}`;
    if (filtroAmbiente && filtroAmbiente !== 'TODOS') sub += ` | Local: ${filtroAmbiente}`;

    let currentY = this.addInstitutionalHeader(doc, 'Relatório Geral de Inventário Patrimonial', sub, user);

    // Summary Box
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(14, currentY, 269, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    doc.text(
      `Total de Bens: ${totalItens}   |   Confirmados: ${confirmados}   |   Não Localizados: ${naoLocalizados}   |   Divergentes: ${divergentes}   |   Pendentes: ${pendentes}   |   Extras: ${extrasTotal}   |   Progresso Geral: ${percentualGeral}%`,
      17,
      currentY + 9
    );

    currentY += 18;

    // Table Data
    const tableRows = filteredItems.map((item) => [
      item.bloco || '-',
      item.ambiente || '-',
      item.patrimonio,
      item.patrimonioAntigo || '-',
      item.descricao,
      item.estadoConservacao || 'N/I',
      item.status === 'LOCALIZADO'
        ? 'Confirmado'
        : item.status === 'NAO_LOCALIZADO'
        ? 'Não Localizado'
        : item.status === 'DIVERGENCIA_LOCAL'
        ? 'Divergência Local'
        : 'Pendente',
      item.verificadoPorNome || item.verificadoPor || '-',
      item.verificadoEm || '-',
      item.observacoes || '-',
    ]);

    // Add extra items if any
    for (const ex of filteredExtras) {
      tableRows.push([
        ex.bloco || '-',
        ex.ambiente || '-',
        ex.patrimonio,
        '-',
        `[ITEM EXTRA] ${ex.descricao}`,
        ex.estadoConservacao || 'N/I',
        'Item Extra (Identificado)',
        ex.cadastradoPorNome || ex.cadastradoPor || '-',
        ex.cadastradoEm || '-',
        ex.observacoes || 'Cadastrado no local',
      ]);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Bloco', 'Local', 'Tombo', 'Nº Antigo', 'Descrição do Bem', 'Estado', 'Situação', 'Conferente', 'Data/Hora', 'Observações']],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        textColor: [24, 24, 27],
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [24, 24, 27],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 250],
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 18, fontStyle: 'bold' },
        3: { cellWidth: 16 },
        4: { cellWidth: 60 },
        5: { cellWidth: 16 },
        6: { cellWidth: 24, fontStyle: 'bold' },
        7: { cellWidth: 32 },
        8: { cellWidth: 24 },
        9: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14, bottom: 16 },
    });

    this.addInstitutionalFooter(doc);
    doc.save(`UTFPR_Inventario_Geral_${new Date().toISOString().slice(0, 10)}.pdf`);
  },

  /**
   * 2. RELATÓRIO DE PENDÊNCIAS: Bens que ainda não foram conferidos ou não localizados
   */
  exportPendenciesReport(items: InventoryItem[], user: UserProfile, filtroBloco?: string) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let pendencias = items.filter((i) => i.status === 'PENDENTE' || i.status === 'NAO_LOCALIZADO');
    if (filtroBloco && filtroBloco !== 'TODOS') {
      pendencias = pendencias.filter((i) => i.bloco === filtroBloco);
    }

    // Sort by Bloco, Ambiente, Patrimonio
    pendencias.sort((a, b) => {
      if (a.bloco.localeCompare(b.bloco, 'pt-BR') !== 0) return a.bloco.localeCompare(b.bloco, 'pt-BR');
      if (a.ambiente.localeCompare(b.ambiente, 'pt-BR') !== 0) return a.ambiente.localeCompare(b.ambiente, 'pt-BR');
      return a.patrimonio.localeCompare(b.patrimonio);
    });

    const totalPendentes = pendencias.filter((i) => i.status === 'PENDENTE').length;
    const totalNaoLocalizados = pendencias.filter((i) => i.status === 'NAO_LOCALIZADO').length;

    let sub = `Listagem de Bens Pendentes de Conferência Física ou Marcados como Não Localizados`;
    if (filtroBloco && filtroBloco !== 'TODOS') sub += ` | Bloco: ${filtroBloco}`;

    let currentY = this.addInstitutionalHeader(doc, 'Relatório de Pendências de Conferência', sub, user);

    // Summary Box
    doc.setFillColor(254, 242, 242); // Light red
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(14, currentY, 182, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(153, 27, 27); // Dark red
    doc.text(
      `Total de Pendências: ${pendencias.length}   |   Não Verificados (Pendentes): ${totalPendentes}   |   Não Localizados: ${totalNaoLocalizados}`,
      18,
      currentY + 9
    );

    currentY += 18;

    const tableRows = pendencias.map((item) => [
      item.bloco || '-',
      item.ambiente || '-',
      item.patrimonio,
      item.patrimonioAntigo || '-',
      item.descricao,
      item.status === 'NAO_LOCALIZADO' ? 'NÃO LOCALIZADO' : 'PENDENTE',
      item.observacoes || '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Bloco', 'Local Previsto', 'Tombo', 'Nº Antigo', 'Descrição do Bem', 'Status Atual', 'Observações']],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [24, 24, 27],
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [185, 28, 28], // Red-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [254, 242, 242],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 32 },
        2: { cellWidth: 20, fontStyle: 'bold' },
        3: { cellWidth: 18 },
        4: { cellWidth: 55 },
        5: { cellWidth: 25, fontStyle: 'bold' },
        6: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14, bottom: 16 },
    });

    this.addInstitutionalFooter(doc);
    doc.save(`UTFPR_Pendencias_Conferencia_${new Date().toISOString().slice(0, 10)}.pdf`);
  },

  /**
   * 3. RELATÓRIO DE ANDAMENTO: Por Local e Servidor Conferente
   */
  exportProgressReport(items: InventoryItem[], extraItems: ExtraItem[], user: UserProfile) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    const locations = this.calculateLocationsProgress(items, extraItems);
    const servers = this.calculateServersPerformance(items, extraItems);

    const totalLocais = locations.length;
    const concluidos = locations.filter((l) => l.status === 'CONCLUIDO').length;
    const emAndamento = locations.filter((l) => l.status === 'EM_ANDAMENTO').length;
    const naoIniciados = locations.filter((l) => l.status === 'NAO_INICIADO').length;

    let currentY = this.addInstitutionalHeader(
      doc,
      'Relatório de Andamento por Local e Servidor',
      'Desempenho da Equipe e Progresso Físico dos Ambientes',
      user
    );

    // Summary Box
    doc.setFillColor(240, 253, 244); // Light green
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, currentY, 182, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52); // Dark green
    doc.text(
      `Total de Locais: ${totalLocais}   |   Concluídos: ${concluidos}   |   Em Andamento: ${emAndamento}   |   Não Iniciados: ${naoIniciados}`,
      18,
      currentY + 9
    );

    currentY += 19;

    // SECTION 1: Locations Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text('1. Progresso Físico por Local / Setor', 14, currentY);
    currentY += 3;

    const locationRows = locations.map((loc) => [
      loc.bloco,
      loc.ambiente,
      loc.total.toString(),
      loc.localizados.toString(),
      loc.naoLocalizados.toString(),
      loc.pendentes.toString(),
      loc.extras > 0 ? `+${loc.extras}` : '0',
      `${loc.percentual}%`,
      loc.status === 'CONCLUIDO' ? 'Concluído' : loc.status === 'EM_ANDAMENTO' ? 'Em Andamento' : 'Não Iniciado',
      loc.servidores.length > 0 ? loc.servidores.join(', ') : 'Nenhum',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Bloco', 'Local', 'Prev.', 'Conf.', 'N/Loc', 'Pend.', 'Ext.', 'Progresso', 'Situação', 'Servidor(es) Conferente(s)']],
      body: locationRows,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.6,
        textColor: [24, 24, 27],
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [39, 39, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 250],
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 32 },
        2: { cellWidth: 11, halign: 'center' },
        3: { cellWidth: 11, halign: 'center' },
        4: { cellWidth: 11, halign: 'center' },
        5: { cellWidth: 11, halign: 'center' },
        6: { cellWidth: 11, halign: 'center' },
        7: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        8: { cellWidth: 20, fontStyle: 'bold' },
        9: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14, bottom: 16 },
    });

    // SECTION 2: Servers Performance Table
    const finalY = (doc as any).lastAutoTable.finalY || currentY + 40;
    
    // Check if new page needed
    if (finalY > 230) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY = finalY + 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text('2. Produtividade por Servidor Conferente', 14, currentY);
    currentY += 3;

    const serverRows = servers.map((s, idx) => [
      (idx + 1).toString(),
      s.nome,
      s.totalItensVerificados.toString(),
      s.locaisAtuados.length.toString(),
      s.locaisAtuados.join(', ') || '-',
      s.ultimaAtividade || '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Nome do Servidor Conferente', 'Bens Verificados', 'Qtd Locais', 'Locais em que Atuou', 'Última Atividade']],
      body: serverRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [24, 24, 27],
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [217, 119, 6], // Amber-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [254, 252, 232],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 45, fontStyle: 'bold' },
        2: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 55 },
        5: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14, bottom: 16 },
    });

    this.addInstitutionalFooter(doc);
    doc.save(`UTFPR_Andamento_Conferencia_${new Date().toISOString().slice(0, 10)}.pdf`);
  },

  /**
   * 4. RELATÓRIO DE DIVERGÊNCIAS: Bens fora de local, itens extras, inservíveis e não localizados
   */
  exportDivergencesReport(items: InventoryItem[], extraItems: ExtraItem[], user: UserProfile) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    const divergences = this.gatherDivergences(items, extraItems);

    const divergenciasLocal = divergences.filter((d) => d.tipo === 'LOCAL_DIVERGENTE').length;
    const itensExtras = divergences.filter((d) => d.tipo === 'ITEM_EXTRA').length;
    const naoLocalizados = divergences.filter((d) => d.tipo === 'NAO_LOCALIZADO').length;
    const baixasSugeridas = divergences.filter((d) => d.tipo === 'BAIXA_SUGERIDA').length;

    let currentY = this.addInstitutionalHeader(
      doc,
      'Relatório de Divergências e Inconsistências de Inventário',
      'Itens em Local Divergente, Bens Extras não Cadastrados, Não Localizados e Baixas Sugeridas',
      user
    );

    // Summary Box
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(14, currentY, 269, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14); // Dark Amber
    doc.text(
      `Total de Ocorrências: ${divergences.length}   |   Local Divergente: ${divergenciasLocal}   |   Itens Extras Identificados: ${itensExtras}   |   Não Localizados: ${naoLocalizados}   |   Sugestão de Baixa/Inservível: ${baixasSugeridas}`,
      17,
      currentY + 9
    );

    currentY += 18;

    const tableRows = divergences.map((div) => [
      div.tipoDescricao,
      div.patrimonio,
      div.descricao,
      div.localOriginal || '-',
      div.localEncontrado || '-',
      div.estadoConservacao || 'N/I',
      div.servidor || '-',
      div.dataHora || '-',
      div.observacoes || '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Tipo de Ocorrência', 'Tombo', 'Descrição do Bem', 'Local Previsto', 'Local Constatado', 'Estado', 'Servidor', 'Data/Hora', 'Observações']],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [24, 24, 27],
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [180, 83, 9], // Amber-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [255, 251, 235],
      },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 20, fontStyle: 'bold' },
        2: { cellWidth: 50 },
        3: { cellWidth: 28 },
        4: { cellWidth: 28 },
        5: { cellWidth: 18 },
        6: { cellWidth: 30 },
        7: { cellWidth: 24 },
        8: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14, bottom: 16 },
    });

    this.addInstitutionalFooter(doc);
    doc.save(`UTFPR_Divergencias_Inventario_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
};
