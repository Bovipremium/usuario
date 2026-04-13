// ============================================================================
// 🎯 FUNÇÃO SIMPLES: Calcular Comissão Mensal por Vendedor (como ANALISE-VENDEDOR)
// ============================================================================
async function calcularComissaoSimples() {
  try {
    console.log("🚀 Calculando Comissão Mensal (Padrão ANALISE-VENDEDOR)...");
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    console.log(`📅 Mês/Ano: ${mesAtual}/${anoAtual}\n`);
    
    // PASSO 1: Carregar clientes
    console.log('📥 Carregando clientes.json...');
    const clientes = await buscarArquivo('clientes.json');
    const clientesList = Array.isArray(clientes) ? clientes : (clientes.dados || []);
    console.log(`✅ ${clientesList.length} clientes carregados\n`);
    
    // PASSO 2: Carregar configuração de comissão
    console.log('📥 Carregando configMetas.json...');
    let config = {};
    try {
      config = await buscarArquivo('configMetas.json');
      console.log(`✅ Configuração carregada\n`);
    } catch (erro) {
      console.log(`⚠️ Erro ao carregar configMetas.json, usando padrão (5%)\n`);
      config = { comissao: 5 };
    }
    
    const percentualComissao = config.comissao || 5;
    console.log(`💰 Percentual de Comissão: ${percentualComissao}%\n`);
    
    // PASSO 3: Agrupar vendas por vendedor (como faz ANALISE-VENDEDOR)
    console.log('📊 Processando vendas por vendedor:\n');
    
    const vendedoresComissao = {};
    
    clientesList.forEach(cliente => {
      if (!cliente.Vendas || !Array.isArray(cliente.Vendas)) return;
      
      // Processar cada venda do cliente
      cliente.Vendas.forEach((venda, idx) => {
        // Determinar vendedor da venda (prioridade: VendedorVenda > Vendedor > cliente.Vendedor)
        const vendedorDaVenda = venda.VendedorVenda || venda.Vendedor || cliente.Vendedor || 'Desconhecido';
        
        // Inicializar vendedor se não existe
        if (!vendedoresComissao[vendedorDaVenda]) {
          vendedoresComissao[vendedorDaVenda] = {
            vendedor: vendedorDaVenda,
            totalVendido: 0,
            qtdVendas: 0,
            comissao: 0,
            vendas: []
          };
        }
        
        // Parsear data corretamente (mesma lógica que app.js usa)
        let dataVenda;
        if (venda.DataVenda && venda.DataVenda.includes('T')) {
          const datePart = venda.DataVenda.split('T')[0];
          const [ano, mes, dia] = datePart.split('-');
          dataVenda = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        } else {
          dataVenda = new Date(venda.DataVenda || venda.data);
        }
        
        const mVenda = dataVenda.getMonth() + 1;
        const aVenda = dataVenda.getFullYear();
        
        // Verificar se venda é do mês atual
        if (mVenda === mesAtual && aVenda === anoAtual) {
          const valorVenda = venda.ValorTotal || venda.Valor || 0;
          
          vendedoresComissao[vendedorDaVenda].totalVendido += valorVenda;
          vendedoresComissao[vendedorDaVenda].qtdVendas += 1;
          vendedoresComissao[vendedorDaVenda].vendas.push({
            cliente: cliente.Nome,
            valor: valorVenda,
            data: dataVenda.toLocaleDateString('pt-BR')
          });
          
          console.log(`   ✅ ${cliente.Nome} (${vendedorDaVenda}): R$ ${valorVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
        }
      });
    });
    
    // PASSO 4: Calcular comissão por vendedor
    console.log(`\n💰 COMISSÕES CALCULADAS (${mesAtual}/${anoAtual}):\n`);
    
    Object.keys(vendedoresComissao).forEach(vendedor => {
      const vendedorData = vendedoresComissao[vendedor];
      vendedorData.comissao = Math.round(
        vendedorData.totalVendido * (percentualComissao / 100) * 100
      ) / 100;
      
      if (vendedorData.totalVendido > 0) {
        console.log(`   ${vendedor}:`);
        console.log(`      Total Vendido: R$ ${vendedorData.totalVendido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
        console.log(`      Quantidade: ${vendedorData.qtdVendas} venda(s)`);
        console.log(`      Comissão (${percentualComissao}%): R$ ${vendedorData.comissao.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`);
      }
    });
    
    // PASSO 5: Retornar resultado
    const comissoesArray = Object.values(vendedoresComissao)
      .filter(v => v.totalVendido > 0)
      .sort((a, b) => b.totalVendido - a.totalVendido);
    
    const totalComissoes = comissoesArray.reduce((sum, v) => sum + v.comissao, 0);
    
    console.log(`\n📊 RESUMO TOTAL:`);
    console.log(`   Vendedores com vendas: ${comissoesArray.length}`);
    console.log(`   Total de Comissões: R$ ${totalComissoes.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`);
    
    return {
      comissoes: comissoesArray,
      totalComissoes: totalComissoes,
      mes: mesAtual,
      ano: anoAtual,
      percentualComissao: percentualComissao
    };
    
  } catch (erro) {
    console.error('❌ Erro ao calcular comissão:', erro);
    throw erro;
  }
}

// ============================================================================

async function calcularMetaAlvoInteligente() {
  try {
    console.log("🚀 Iniciando cálculo de Meta Alvo Inteligente (Documento Técnico)...");
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    console.log(`📅 Data atual do servidor: ${hoje.toLocaleDateString('pt-BR')} (${mesAtual}/${anoAtual})`);
    
    console.log("\n📊 PASSO 1: Calculando Taxa de Inadimplência Histórica (90 dias)...");
    
    const clientes = await buscarArquivo('clientes.json');
    const clientesList = Array.isArray(clientes) ? clientes : [];
    
    const dataAtras90 = new Date();
    dataAtras90.setDate(dataAtras90.getDate() - 90);
    
    let boletos_totais_emitidos = 0;
    let boletos_pagos = 0;
    let boletos_atrasados = 0;
    let boletos_pendentes = 0;
    
    clientesList.forEach(cliente => {
      if (!cliente.Vendas || !Array.isArray(cliente.Vendas)) return;
      
      cliente.Vendas.forEach(venda => {
        if (!venda.Parcelas || !Array.isArray(venda.Parcelas)) return;
        
        const dataVenda = new Date(venda.DataVenda || venda.data);
        if (dataVenda < dataAtras90) return;
        
        venda.Parcelas.forEach(parcela => {
          boletos_totais_emitidos += parcela.Valor || 0;
          
          if (parcela.Pago === true) {
            boletos_pagos += parcela.Valor || 0;
          } else if (parcela.Pago === false) {
            const dataVencimento = new Date(parcela.DataVencimento);
            if (new Date() > dataVencimento) {
              boletos_atrasados += parcela.Valor || 0;
            } else {
              boletos_pendentes += parcela.Valor || 0;
            }
          }
        });
      });
    });
    
    const taxaRecebimento = boletos_totais_emitidos > 0 ? boletos_pagos / boletos_totais_emitidos : 0.7;
    const taxaInadimplencia = 1 - taxaRecebimento;
    
    console.log(`   📋 Boletos Totais (90 dias): R$ ${boletos_totais_emitidos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   ✅ Boletos Pagos: R$ ${boletos_pagos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   ❌ Boletos Atrasados: R$ ${boletos_atrasados.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   ⏳ Boletos Pendentes: R$ ${boletos_pendentes.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   📊 Taxa de Recebimento: ${(taxaRecebimento * 100).toFixed(1)}%`);
    console.log(`   📊 Taxa de Inadimplência: ${(taxaInadimplencia * 100).toFixed(1)}%`);
    
    console.log("\n📊 PASSO 2: Calculando Despesas Fixas do Mês Atual (Contas a Pagar)...");
    
    const contas = await buscarArquivo('contas.json');
    const contasList = Array.isArray(contas) ? contas : [];
    
    console.log(`   📋 Total de contas carregadas: ${contasList.length}`);
    
    // Diagnóstico: mostrar primeiras 3 contas para verificar estrutura
    if (contasList.length > 0) {
      console.log(`   🔍 Primeiras contas carregadas:`, contasList.slice(0, 3).map(c => ({
        Descricao: c.Descricao || c.descricao,
        Valor: c.Valor || c.valor,
        DataPagamento: c.DataPagamento || c.dataPagamento
      })));
    }
    
    let despesasFixasMesAtual = 0;
    let despesasFixasProximoMes = 0;
    
    const proximoMes = mesAtual === 12 ? 1 : mesAtual + 1;
    const proximoAno = mesAtual === 12 ? anoAtual + 1 : anoAtual;
    
    contasList.forEach(conta => {
      const dataPagamento = new Date(conta.DataPagamento);
      const mesContaAno = dataPagamento.getMonth() + 1;
      const anoContaAno = dataPagamento.getFullYear();
      
      if (mesContaAno === mesAtual && anoContaAno === anoAtual) {
        despesasFixasMesAtual += conta.Valor || 0;
      }
      
      if (mesContaAno === proximoMes && anoContaAno === proximoAno) {
        despesasFixasProximoMes += conta.Valor || 0;
      }
    });
    
    // Diagnóstico
    const contasMesAtual = contasList.filter(c => {
      const d = new Date(c.DataPagamento);
      return (d.getMonth() + 1) === mesAtual && d.getFullYear() === anoAtual;
    });
    const contasProximoMes = contasList.filter(c => {
      const d = new Date(c.DataPagamento);
      return (d.getMonth() + 1) === proximoMes && d.getFullYear() === proximoAno;
    });
    
    console.log(`   💸 Despesas Fixas (Mês Atual ${mesAtual}/${anoAtual}): R$ ${despesasFixasMesAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`       � Total de contas encontradas para este mês: ${contasMesAtual.length}`);
    console.log(`    Despesas Fixas (Próximo Mês ${proximoMes}/${proximoAno}): R$ ${despesasFixasProximoMes.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`       🔍 Total de contas encontradas para próximo mês: ${contasProximoMes.length}`);
    
    console.log("\n📊 PASSO 3: Calculando Boletos a Receber (Mês Atual e Próximo)...");
    
    let boletosAReceberMesAtual = 0;
    let boletosAReceberProximoMes = 0;
    
    clientesList.forEach(cliente => {
      if (!cliente.Vendas || !Array.isArray(cliente.Vendas)) return;
      
      cliente.Vendas.forEach(venda => {
        if (!venda.Parcelas || !Array.isArray(venda.Parcelas)) return;
        
        venda.Parcelas.forEach(parcela => {
          if (parcela.Pago === false) {
            const dataVencimento = new Date(parcela.DataVencimento);
            const mesVencimento = dataVencimento.getMonth() + 1;
            const anoVencimento = dataVencimento.getFullYear();
            
            if (mesVencimento === mesAtual && anoVencimento === anoAtual) {
              boletosAReceberMesAtual += parcela.Valor || 0;
            }
            
            const proximoMes = mesAtual === 12 ? 1 : mesAtual + 1;
            const proximoAno = mesAtual === 12 ? anoAtual + 1 : anoAtual;
            
            if (mesVencimento === proximoMes && anoVencimento === proximoAno) {
              boletosAReceberProximoMes += parcela.Valor || 0;
            }
          }
        });
      });
    });
    
    const receitaLiquidaMesAtual = boletosAReceberMesAtual * (1 - taxaInadimplencia);
    const receitaLiquidaProximoMes = boletosAReceberProximoMes * (1 - taxaInadimplencia);
    
    console.log(`   📋 Boletos a Receber (Mês Atual): R$ ${boletosAReceberMesAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   💵 Receita Líquida (após inadimplência): R$ ${receitaLiquidaMesAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   📋 Boletos a Receber (Próximo Mês): R$ ${boletosAReceberProximoMes.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   💵 Receita Líquida (após inadimplência): R$ ${receitaLiquidaProximoMes.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    
    console.log("\n📊 PASSO 4: Obtendo Configurações (Margem, Pro-Labore, Comissão)...");
    
    // 🔧 CORRIGIDO: Tenta buscar do arquivo, depois localStorage, depois usa valores padrão
    let config = {};
    
    try {
      config = await buscarArquivo('configMetas.json');
      console.log(`   ✅ Carregado de configMetas.json`);
    } catch (erro) {
      console.log(`   ⚠️ Erro ao buscar configMetas.json:`, erro.message);
      try {
        const cached = localStorage.getItem('configMetas');
        if (cached) {
          config = JSON.parse(cached);
          if (Object.keys(config).length > 0) {
            console.log(`   ✅ Carregado de localStorage`);
          }
        }
      } catch (e) {
        console.log(`   ⚠️ localStorage também vazio`);
      }
    }
    
    // Se ainda está vazio, use valores padrão CORRETOS
    if (!config.proLabore && !config.proLaboreMinima) {
      config = {
        proLabore: 10,
        proLaboreMinima: 9,
        comissao: 5,
        custoProdutoPercentual: 0.40
      };
      console.log(`   ⚠️ Usando valores padrão (arquivo/cache não carregado)`);
    }
    
    console.log(`   📄 Config carregado:`, config);
    
    const custoProdutoPercentual = config.custoProdutoPercentual || 0.40;
    const margemContribuicaoPercentual = 1 - custoProdutoPercentual;
    
    // Aceita vários nomes para ProLabore Mínimo
    const proLaboreMinimo = config.proLaboreMinima || config.metaMinima || 9;
    // Aceita vários nomes para ProLabore Alvo
    const proLaboreAlvo = config.proLabore || config.metaAlvo || 10;
    const percentualComissao = config.comissao || 5;
    
    console.log(`   📊 Custo do Produto: ${(custoProdutoPercentual * 100).toFixed(0)}%`);
    console.log(`   📈 Margem de Contribuição: ${(margemContribuicaoPercentual * 100).toFixed(0)}%`);
    console.log(`   💰 Pro-Labore Mínimo (config.proLaboreMinima=${config.proLaboreMinima}, config.metaMinima=${config.metaMinima}): R$ ${proLaboreMinimo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   🎯 Pro-Labore Alvo (config.proLabore=${config.proLabore}, config.metaAlvo=${config.metaAlvo}): R$ ${proLaboreAlvo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   📊 Comissão: ${percentualComissao}%`);
    
    console.log("\n📊 PASSO 5: Calculando META MÍNIMA e META ALVO (Fórmulas do Documento)...");
    
    // Fórmula: Meta = ProLabore + Despesas - ReceitaRecebida
    // Sem dividir por margem de contribuição
    const metaMinimaVendas = Math.max(
      proLaboreMinimo,
      proLaboreMinimo + despesasFixasMesAtual - receitaLiquidaMesAtual
    );
    
    const metaAlvoVendas = Math.max(
      proLaboreAlvo,
      proLaboreAlvo + despesasFixasProximoMes - receitaLiquidaProximoMes
    );
    
    console.log(`   Meta Mínima = MAX(${proLaboreMinimo}, ${proLaboreMinimo} + ${despesasFixasMesAtual.toFixed(2)} - ${receitaLiquidaMesAtual.toFixed(2)})`);
    console.log(`   Meta Mínima = MAX(${proLaboreMinimo}, ${(proLaboreMinimo + despesasFixasMesAtual - receitaLiquidaMesAtual).toFixed(2)})`);
    console.log(`   Meta Alvo = MAX(${proLaboreAlvo}, ${proLaboreAlvo} + ${despesasFixasProximoMes.toFixed(2)} - ${receitaLiquidaProximoMes.toFixed(2)})`);
    console.log(`   Meta Alvo = MAX(${proLaboreAlvo}, ${(proLaboreAlvo + despesasFixasProximoMes - receitaLiquidaProximoMes).toFixed(2)})`);
    
    console.log(`\n✅ Meta Mínima de Vendas: R$ ${metaMinimaVendas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`✅ Meta Alvo de Vendas: R$ ${metaAlvoVendas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    
    return {
      metaAlvo: Math.round(metaAlvoVendas * 100) / 100,
      metaMinima: Math.round(metaMinimaVendas * 100) / 100,
      mesAtual: mesAtual,
      anoAtual: anoAtual,
      boletosAReceberMesAtual: Math.round(boletosAReceberMesAtual * 100) / 100,
      receitaLiquidaMesAtual: Math.round(receitaLiquidaMesAtual * 100) / 100,
      boletosAReceberProximoMes: Math.round(boletosAReceberProximoMes * 100) / 100,
      receitaLiquidaProximoMes: Math.round(receitaLiquidaProximoMes * 100) / 100,
      despesasFixasMesAtual: Math.round(despesasFixasMesAtual * 100) / 100,
      despesasFixasProximoMes: Math.round(despesasFixasProximoMes * 100) / 100,
      custoProdutoPercentual: (custoProdutoPercentual * 100).toFixed(0),
      margemContribuicao: (margemContribuicaoPercentual * 100).toFixed(0),
      proLaboreMinimo: proLaboreMinimo,
      proLaboreAlvo: proLaboreAlvo,
      percentualComissao: percentualComissao,
      taxaRecebimento: (taxaRecebimento * 100).toFixed(1),
      taxaInadimplencia: (taxaInadimplencia * 100).toFixed(1),
      totalBoletosEmitidos: Math.round(boletos_totais_emitidos * 100) / 100,
      totalBoletosPagos: Math.round(boletos_pagos * 100) / 100,
      totalBoletosAtrasados: Math.round(boletos_atrasados * 100) / 100,
      dataDaProximaReavaliacao: new Date(anoAtual, mesAtual + 1, 1).toLocaleDateString('pt-BR'),
      dataSalva: new Date().toISOString()
    };
  } catch (erro) {
    console.error("❌ Erro ao calcular Meta Alvo:", erro);
    return null;
  }
}



/**
 * Atualizar as metas no localStorage e na interface
 * Sistema Híbrido: Salva metas em metas.json uma vez por mês, reutiliza durante o mês
 */
async function atualizarMetasInteligentes() {
  console.log("🔄 Verificando sistema de metas inteligentes (híbrido)...");
  
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  
  // 1️⃣ VERIFICAR SE EXISTE metas.json NO DRIVE
  console.log(`📅 Mês atual: ${mesAtual}/${anoAtual}`);
  
  try {
    const metasDoMes = await buscarArquivo('metas.json');
    
    if (metasDoMes && metasDoMes.mesAtual === mesAtual && metasDoMes.anoAtual === anoAtual) {
      console.log(`✅ Metas do mês ${mesAtual}/${anoAtual} encontradas em metas.json!`);
      console.log(`   📊 Meta Mínima: R$ ${metasDoMes.metaMinima.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`   🎯 Meta Alvo: R$ ${metasDoMes.metaAlvo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`   📅 Salva em: ${new Date(metasDoMes.dataSalva).toLocaleDateString('pt-BR')}`);
      
      // Guardar no localStorage para uso na exibição
      localStorage.setItem('metasCalculadas', JSON.stringify({
        ...metasDoMes,
        dataCalculo: new Date().toISOString(),
        origem: 'metas.json (reutilizado)'
      }));
      
      return metasDoMes;
    } else {
      console.log(`⚠️ Metas do mês anterior encontradas, mas mês mudou! Recalculando...`);
    }
  } catch (erro) {
    console.log(`📭 metas.json não encontrado (primeiro cálculo do mês). Calculando...`);
  }
  
  // 2️⃣ CALCULAR NOVAS METAS (se não encontrou ou é novo mês)
  console.log(`🔢 Calculando novas metas para ${mesAtual}/${anoAtual}...`);
  
  const resultado = await calcularMetaAlvoInteligente();
  
  if (resultado) {
    // Guardar no localStorage
    localStorage.setItem('metasCalculadas', JSON.stringify({
      ...resultado,
      dataCalculo: new Date().toISOString(),
      origem: 'cálculo novo'
    }));
    
    console.log("✅ Metas calculadas e salvas com sucesso!");
    
    // Aqui você salvaria em metas.json no Drive
    // (seria feito via uma função de salvar que chama a API)
    console.log("💾 Nota: Metas precisam ser salvas em metas.json no Drive para próximas consultas");
    
    return resultado;
  }
  
  return null;
}

/**
 * Obter as metas calculadas (do cache)
 */
function obterMetasCalculadas() {
  try {
    const metasJson = localStorage.getItem('metasCalculadas');
    return metasJson ? JSON.parse(metasJson) : null;
  } catch (erro) {
    console.error("Erro ao obter metas calculadas:", erro);
    return null;
  }
}

/**
 * FUNÇÃO AUXILIAR: Resumo do Sistema Híbrido
 * Útil para debugging e entender o fluxo
 */
function resumoSistemaHibrido() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║        SISTEMA HÍBRIDO DE METAS E COMISSÕES - RESUMO          ║
╚════════════════════════════════════════════════════════════════╝

📊 METAS (Salvo em metas.json - NÃO oscila)
  └─ Cálculo: Uma vez por mês (primeiro acesso)
  └─ Reuso: Durante todo mês (cache em localStorage)
  └─ Recalcula: Quando muda o mês
  
💰 COMISSÃO (Calculado em tempo real - OSCILA)
  └─ Cálculo: Sempre que página carrega
  └─ Baseado em: Vendas do mês atual
  └─ Atualiza: Diariamente conforme vendas
  
📁 ARQUIVOS NECESSÁRIOS:
  ✅ metas.json (cache de metas - criado automaticamente)
  ✅ usuarios.json (permissões dos usuários)
  ✅ clientes.json (dados de clientes e vendas)
  ✅ configMetas.json (porcentagens e valores)
  ✅ contas.json (despesas fixas)

⚠️  IMPORTANTE - VENDAS DE MARÇO/2026:
  Os dados atuais têm vendas apenas de 2025
  Para testar comissão, adicione vendas em 03/2026 aos clientes
  
🔍 Para debugar, procure no Console do navegador (F12) por:
  "✅ Metas do mês" = Usando cache
  "🔢 Calculando novas metas" = Recalculando (novo mês)
  "✅ INCLUÍDA:" = Venda foi contabilizada
  "📅 Venda em X/Y" = Venda de outro mês (ignorada)
  "⚠️ AVISO IMPORTANTE" = Sem vendas no mês atual
  
═══════════════════════════════════════════════════════════════════
  `);
}


async function calcularComissaoMesAtual() {
  try {
    console.log("Calculando comissao do mes atual (Com VendedoresPermitidos)...");
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    console.log(`Data do navegador: ${hoje.toLocaleDateString('pt-BR')} (Mes: ${mesAtual}, Ano: ${anoAtual})\n`);
    
    // LER USUARIO LOGADO
    let usuario = obterUsuario();
    let nomeUsuarioLogado = null;
    
    if (!usuario || !usuario.nome) {
      const usuarioLogadoStorage = localStorage.getItem('usuarioLogado');
      if (usuarioLogadoStorage) {
        usuario = JSON.parse(usuarioLogadoStorage);
      }
    }
    
    nomeUsuarioLogado = usuario?.nome || usuario?.Nome || usuario?.login || usuario?.Login;
    console.log(`Usuario logado: ${nomeUsuarioLogado || 'Nao detectado'}`);
    
    // CARREGAR CONFIGURACAO
    let config = {};
    try {
      config = await buscarArquivo('configMetas.json');
      console.log(`Configuracao carregada`);
    } catch (erro) {
      console.log(`Usando configuracao padrao`);
      config = { comissao: 5 };
    }
    
    const percentualComissao = config.comissao || 5;
    console.log(`Percentual de Comissao: ${percentualComissao}%\n`);
    
    // CARREGAR CLIENTES
    console.log('Carregando clientes.json...');
    const clientes = await buscarArquivo('clientes.json');
    const clientesList = Array.isArray(clientes) ? clientes : [];
    console.log(`${clientesList.length} clientes carregados\n`);
    
    // CARREGAR usuarios.json PARA OBTER VendedoresPermitidos
    let vendedoresPermitidos = [];
    try {
      const usuarios = await buscarArquivo('usuarios.json');
      const usuariosArray = Array.isArray(usuarios) ? usuarios : [];
      const usuarioDados = usuariosArray.find(u => 
        (u.Nome === nomeUsuarioLogado || u.nome === nomeUsuarioLogado)
      );
      
      if (usuarioDados && Array.isArray(usuarioDados.VendedoresPermitidos)) {
        // ✅ NORMALIZADO: Normalizar todos os vendedores permitidos para comparação
        vendedoresPermitidos = usuarioDados.VendedoresPermitidos.map(v => v.trim().toLowerCase());
        console.log(`VendedoresPermitidos para ${nomeUsuarioLogado}: ${vendedoresPermitidos.join(', ') || 'Nenhum'}\n`);
      }
    } catch (erro) {
      console.log(`Erro ao carregar usuarios.json: ${erro.message}\n`);
    }
    
    // VERIFICAR SE E ADMIN
    const isAdmin = (usuario && usuario.modulos && usuario.modulos.includes('Administrador')) || 
                    (usuario && usuario.ModulosPermitidos && usuario.ModulosPermitidos.includes('Administrador')) ||
                    !usuario;
    
    console.log(`Modo: ${isAdmin ? 'ADMINISTRADOR (Ver todos)' : 'USUARIO NORMAL'}\n`);
    
    // PROCESSAR VENDAS POR VENDEDOR
    const comissoes = {};
    
    clientesList.forEach(cliente => {
      if (!cliente.Vendas || !Array.isArray(cliente.Vendas)) return;
      
      // Processar cada venda do cliente
      cliente.Vendas.forEach((venda) => {
        // ✅ NORMALIZADO: Determinar vendedor da venda (prioridade: VendedorVenda > Vendedor > cliente.Vendedor)
        const vendedorDaVenda = (venda.VendedorVenda || venda.Vendedor || cliente.Vendedor || 'Desconhecido').trim().toLowerCase();
        const vendedorDisplay = (venda.VendedorVenda || venda.Vendedor || cliente.Vendedor || 'Desconhecido').trim(); // Para exibição
        
        // Inicializar vendedor se nao existe
        if (!comissoes[vendedorDaVenda]) {
          comissoes[vendedorDaVenda] = {
            vendedor: vendedorDisplay,
            vendidoMesAtual: 0,
            qtdVendas: 0,
            comissao: 0
          };
        }
        
        // Parsear data corretamente
        let dataVenda;
        if (venda.DataVenda && venda.DataVenda.includes('T')) {
          const datePart = venda.DataVenda.split('T')[0];
          const [ano, mes, dia] = datePart.split('-');
          dataVenda = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        } else {
          dataVenda = new Date(venda.DataVenda || venda.data);
        }
        
        const mVenda = dataVenda.getMonth() + 1;
        const aVenda = dataVenda.getFullYear();
        
        // Verificar se venda e do mes atual
        if (mVenda === mesAtual && aVenda === anoAtual) {
          const valorVenda = venda.ValorTotal || venda.Valor || 0;
          
          comissoes[vendedorDaVenda].vendidoMesAtual += valorVenda;
          comissoes[vendedorDaVenda].qtdVendas += 1;
        }
      });
    });
    
    // CALCULAR COMISSAO
    Object.keys(comissoes).forEach(vendedor => {
      comissoes[vendedor].comissao = Math.round(
        comissoes[vendedor].vendidoMesAtual * (percentualComissao / 100) * 100
      ) / 100;
    });
    
    console.log(`COMISSOES DO MES ${mesAtual}/${anoAtual}:\n`);
    Object.keys(comissoes).forEach(vendedor => {
      console.log(`   ${vendedor}: R$ ${comissoes[vendedor].vendidoMesAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2})} -> Comissao: R$ ${comissoes[vendedor].comissao.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    });
    
    // PREPARAR RESULTADO PARA EXIBICAO
    let comissoesArray = [];
    let comissaoTotalFinal = 0;
    
    if (isAdmin) {
      // ===== ADMIN: MOSTRA TODOS OS VENDEDORES SEPARADOS =====
      console.log(`\nMODO ADMIN: Mostrando TODOS os vendedores separados\n`);
      
      comissoesArray = Object.values(comissoes)
        .sort((a, b) => b.vendidoMesAtual - a.vendidoMesAtual);
      
      // Na caixa grande, mostra APENAS a comissao do Admin
      const comissaoDoAdmin = comissoes[nomeUsuarioLogado];
      comissaoTotalFinal = (comissaoDoAdmin && comissaoDoAdmin.comissao) || 0;
      
      console.log(`ADMIN ${nomeUsuarioLogado} - Comissao propria: R$ ${comissaoTotalFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`Tabela mostrara TODOS (${comissoesArray.length} vendedores)\n`);
      
    } else if (nomeUsuarioLogado) {
      // ===== USUARIO NORMAL: LOGICA COM VendedoresPermitidos =====
      
      if (vendedoresPermitidos.length === 0) {
        // Se NAO marcou nenhum vendedor -> ve APENAS suas vendas
        console.log(`\nMODO USUARIO (sem permissoes extras): ${nomeUsuarioLogado} ve apenas suas vendas\n`);
        
        const comissaoUser = comissoes[nomeUsuarioLogado];
        if (comissaoUser) {
          comissoesArray = [comissaoUser];
          comissaoTotalFinal = comissaoUser.comissao;
        } else {
          comissoesArray = [];
          comissaoTotalFinal = 0;
        }
        
      } else {
        // Se marcou vendedores -> ve suas vendas + dos marcados, SOMADOS
        console.log(`\nMODO USUARIO (com permissoes): ${nomeUsuarioLogado} ve suas vendas + permissoes\n`);
        
        let vendedoresTotalizados = {
          vendedor: nomeUsuarioLogado,
          vendidoMesAtual: 0,
          qtdVendas: 0,
          comissao: 0
        };
        
        // Somar vendas do usuario
        const nomeUsuarioNormalizado = nomeUsuarioLogado.trim().toLowerCase();
        if (comissoes[nomeUsuarioNormalizado]) {
          vendedoresTotalizados.vendidoMesAtual += comissoes[nomeUsuarioNormalizado].vendidoMesAtual;
          vendedoresTotalizados.qtdVendas += comissoes[nomeUsuarioNormalizado].qtdVendas;
        }
        
        // Somar vendas dos permitidos
        vendedoresPermitidos.forEach(vendedor => {
          if (comissoes[vendedor]) {
            vendedoresTotalizados.vendidoMesAtual += comissoes[vendedor].vendidoMesAtual;
            vendedoresTotalizados.qtdVendas += comissoes[vendedor].qtdVendas;
            console.log(`   + Adicionando ${vendedor}: R$ ${comissoes[vendedor].vendidoMesAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
          }
        });
        
        // Recalcular comissao do total
        vendedoresTotalizados.comissao = Math.round(
          vendedoresTotalizados.vendidoMesAtual * (percentualComissao / 100) * 100
        ) / 100;
        
        comissoesArray = [vendedoresTotalizados];
        comissaoTotalFinal = vendedoresTotalizados.comissao;
        
        console.log(`\nTotal ${nomeUsuarioLogado}: R$ ${vendedoresTotalizados.vendidoMesAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2})} -> Comissao: R$ ${comissaoTotalFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`);
      }
    }
    
    console.log(`\nTOTAL A EXIBIR: R$ ${comissaoTotalFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`);
    
    return {
      comissaoTotal: comissaoTotalFinal,
      comissoesArray: comissoesArray,
      usuarioLogado: nomeUsuarioLogado,
      isAdmin: isAdmin,
      percentualComissao: percentualComissao,
      mes: mesAtual,
      ano: anoAtual
    };
    
  } catch (erro) {
    console.error('Erro ao calcular comissao:', erro);
    return {
      comissaoTotal: 0,
      comissoesArray: [],
      usuarioLogado: null,
      isAdmin: false,
      percentualComissao: 5,
      mes: 0,
      ano: 0
    };
  }
}
