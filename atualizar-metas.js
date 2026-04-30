// ============================================
// ATUALIZAR METAS DOS VENDEDORES
// Popula meta-vendedor.json com dados atualizados
// ============================================

async function atualizarMetasVendedores() {
  try {
    console.log('🔄 Atualizando metas dos vendedores...');

    // Carregar dados
    const clientes = await buscarArquivo(CONFIG.ARQUIVOS.CLIENTES) || [];
    const usuarios = await buscarArquivo(CONFIG.ARQUIVOS.USUARIOS) || [];
    const configMetas = await buscarArquivo('configMetas.json') || {};
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    // Extrair lista de vendedores únicos
    const vendedoresUnicos = new Set();
    clientes.forEach(cliente => {
      if (cliente.Vendedor) {
        vendedoresUnicos.add(cliente.Vendedor.trim());
      }
    });

    // Criar ou atualizar entry para cada vendedor
    let metasAtualizadas = [];

    for (const nomeVendedor of vendedoresUnicos) {
      console.log(`📊 Processando vendedor: ${nomeVendedor}`);

      // Calcular dados do vendedor
      const vendedorData = {
        Id: metasAtualizadas.length + 1,
        NomeVendedor: nomeVendedor,
        MetaMinima: parseFloat(configMetas.proLaboreMinimo) * 1000 || 6000,
        MetaAlvo: parseFloat(configMetas.proLaboreAlvo) * 1000 || 10000,
        Mes: mesAtual,
        Ano: anoAtual,
        VendasRealizadas: 0,
        ClientesAtendidos: 0,
        TaxaPagamento: 0,
        TaxaInadimplencia: 0,
        MelhorVenda: {
          Valor: 0,
          Cliente: "",
          Data: null,
          NumeroParcelas: 0
        },
        PiorVenda: {
          Valor: 0,
          Cliente: "",
          Data: null,
          TaxaPagamento: 0
        },
        MelhoresClientes: [],
        ClientesInadimplentes: [],
        DataAtualizacao: new Date().toISOString()
      };

      // Calcular dados do vendedor
      let totalVendido = 0;
      let totalRecebido = 0;
      let totalPendente = 0;
      let vendas = [];
      const clientesVendedor = new Set();

      clientes.forEach(cliente => {
        if (cliente.Vendedor?.trim() !== nomeVendedor) {
          return;
        }

        clientesVendedor.add(cliente.Nome);

        if (!Array.isArray(cliente.Vendas)) {
          return;
        }

        cliente.Vendas.forEach(venda => {
          const dataVenda = new Date(venda.DataVenda || new Date());
          const mesVenda = dataVenda.getMonth() + 1;
          const anoVenda = dataVenda.getFullYear();

          if (mesVenda !== mesAtual || anoVenda !== anoAtual) {
            return;
          }

          const valorVenda = parseFloat(venda.ValorTotal) || 0;
          totalVendido += valorVenda;

          vendas.push({
            cliente: cliente.Nome,
            valor: valorVenda,
            data: venda.DataVenda,
            nf: venda.NumeroNF || '—',
            parcelas: venda.NumeroParcelas || 1
          });

          // Processar parcelas
          if (Array.isArray(venda.Parcelas)) {
            venda.Parcelas.forEach(parcela => {
              if (parcela.Pago) {
                totalRecebido += parseFloat(parcela.Valor) || 0;
              } else {
                totalPendente += parseFloat(parcela.Valor) || 0;
              }
            });
          }
        });
      });

      vendedorData.VendasRealizadas = totalVendido;
      vendedorData.ClientesAtendidos = clientesVendedor.size;

      // Calcular taxa de pagamento
      const totalCobranca = totalRecebido + totalPendente;
      if (totalCobranca > 0) {
        vendedorData.TaxaPagamento = (totalRecebido / totalCobranca) * 100;
        vendedorData.TaxaInadimplencia = 100 - vendedorData.TaxaPagamento;
      }

      // Melhor e pior vendas
      if (vendas.length > 0) {
        vendas.sort((a, b) => b.valor - a.valor);
        vendedorData.MelhorVenda = {
          Valor: vendas[0].valor,
          Cliente: vendas[0].cliente,
          Data: vendas[0].data,
          NumeroParcelas: vendas[0].parcelas
        };
        vendedorData.MelhoresClientes = vendas.slice(0, 5);
        vendedorData.PiorVenda = {
          Valor: vendas[vendas.length - 1].valor,
          Cliente: vendas[vendas.length - 1].cliente,
          Data: vendas[vendas.length - 1].data,
          TaxaPagamento: vendedorData.TaxaPagamento
        };
      }

      metasAtualizadas.push(vendedorData);
    }

    console.log(`✅ ${metasAtualizadas.length} vendedores processados`);
    console.log('📋 Metas atualizadas:', metasAtualizadas);

    return metasAtualizadas;

  } catch (erro) {
    console.error('❌ Erro ao atualizar metas:', erro);
    return [];
  }
}

// Se for usado via script direto:
if (typeof CONFIG !== 'undefined' && typeof buscarArquivo !== 'undefined') {
  atualizarMetasVendedores();
}
