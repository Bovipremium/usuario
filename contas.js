// ============================================
// MÓDULO DE CONTAS A PAGAR
// ============================================

const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
let contasAtivas = [];
let contaEmDelecao = null;
let clientesFinanceiroCache = null;

const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado')) || {};

// ============================================
// INICIALIZAR AO CARREGAR A PÁGINA
// ============================================
window.addEventListener('load', async () => {
  console.log('🚀 Iniciando módulo de contas...');
  await carregarContas();
  
  // Inicializar barra de pesquisa
  setTimeout(() => {
    criarBarraPesquisa({
      containerId: 'pesquisaContainer',
      tableSelector: 'table',
      searchableColumns: [1, 2, 3], // Descrição, Categoria, Valor
      onSearch: (termo) => {
        console.log('🔍 Pesquisando:', termo);
      }
    });
  }, 500);
});

// ============================================
// CARREGAR CONTAS DO GOOGLE DRIVE
// ============================================
async function carregarContas() {
  try {
    const tabelaContainer = document.getElementById('tabelaContainer');
    tabelaContainer.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando contas...</div>';

    const response = await fetch(
      `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.CONTAS}&deviceId=${deviceId}`
    );

    if (!response.ok) throw new Error('Erro ao buscar contas');

    let dados = await response.json();

    // Se for string, tenta parsear
    if (typeof dados === 'string') {
      try {
        dados = JSON.parse(dados);
      } catch (e) {
        dados = [];
      }
    }

    contasAtivas = Array.isArray(dados) ? dados : [];
    normalizarContasRecorrentes();
    console.log('✅ Contas carregadas:', contasAtivas.length);
    
    atualizarResumo();
    await renderizarTabela();

  } catch (erro) {
    console.error('❌ Erro ao carregar contas:', erro);
    mostrarMensagem('Erro ao carregar contas: ' + erro.message, 'erro');
    document.getElementById('tabelaContainer').innerHTML = '<p style="color: #ff9999; padding: 20px;">Erro ao carregar contas. Tente novamente.</p>';
  }
}

// ============================================
// SALVAR CONTA NOVA
// ============================================
async function salvarConta(event) {
  if (event) event.preventDefault();
  
  try {
    const tipoConta = document.getElementById('inputTipoConta')?.value || 'fixa';
    const descricao = document.getElementById('inputDescricao')?.value.trim();
    let valor = valorNumerico(document.getElementById('inputValor')?.value || 0);
    const dataPagamento = document.getElementById('inputDataPagamento')?.value;
    let categoria = document.getElementById('inputCategoria')?.value.trim();
    let recorrencia = document.getElementById('inputRecorrencia')?.value;
    const notas = document.getElementById('inputNotas')?.value || '';
    const percentual = parseFloat(document.getElementById('inputPercentual')?.value || 0) || 0;
    const banco = document.getElementById('inputBanco')?.value.trim() || '';
    const taxaPorBoleto = valorNumerico(document.getElementById('inputTaxaBoleto')?.value || 0);

    console.log('📝 Salvando nova conta:', { tipoConta, descricao, valor, dataPagamento, categoria, recorrencia, percentual, banco, taxaPorBoleto });

    if (!descricao || !dataPagamento) {
      mostrarMensagem('❌ Preencha descrição e data inicial!', 'erro');
      return false;
    }

    if (tipoConta === 'fixa') {
      if (!valor || !categoria) {
        mostrarMensagem('❌ Preencha valor e categoria da conta fixa!', 'erro');
        return false;
      }

      if (valor <= 0) {
        mostrarMensagem('❌ O valor deve ser maior que zero!', 'erro');
        return false;
      }
    }

    if (tipoConta === 'imposto_percentual') {
      if (!percentual || percentual <= 0) {
        mostrarMensagem('❌ Informe um percentual de imposto maior que zero!', 'erro');
        return false;
      }
      valor = 0;
      categoria = categoria || 'Impostos';
      recorrencia = 'mensal';
    }

    if (tipoConta === 'taxa_boleto') {
      if (!banco || !taxaPorBoleto || taxaPorBoleto <= 0) {
        mostrarMensagem('❌ Informe o banco e a taxa por boleto!', 'erro');
        return false;
      }
      valor = 0;
      categoria = categoria || 'Taxas Bancárias';
      recorrencia = 'mensal';
    }

    const statusAutomatico = calcularStatusAutomatico(dataPagamento);

    const conta = {
      Id: gerarId(),
      Descricao: descricao,
      Valor: valor,
      DataPagamento: dataPagamento,
      Categoria: categoria,
      Responsavel: usuarioLogado.nome || 'Sem responsável',
      Notas: notas,
      IsRecorrente: recorrencia !== '' && recorrencia !== null,
      Frequencia: recorrencia || null,
      DataCadastro: new Date().toISOString(),
      StatusPagamento: statusAutomatico,
      DataPago: null,
      TipoConta: tipoConta,
      Percentual: tipoConta === 'imposto_percentual' ? percentual : null,
      Banco: tipoConta === 'taxa_boleto' ? banco : null,
      TaxaPorBoleto: tipoConta === 'taxa_boleto' ? taxaPorBoleto : null
    };

    contasAtivas.push(conta);
    garantirOcorrenciaBaseConta(conta);

    const resultado = await salvarContasNoGoogleDrive();

    console.log('📤 Resultado após salvar conta nova:', resultado);

    if (resultado) {
      mostrarMensagem('✅ Conta salva com sucesso!', 'sucesso');
      
      await registrarCriacaoConta(conta);

      limparFormulario();
      fecharModal();

      atualizarResumo();
      await renderizarTabela();
    } else {
      throw new Error('Falha ao salvar conta');
    }

  } catch (erro) {
    console.error('❌ Erro ao salvar conta:', erro);
    mostrarMensagem('❌ Erro ao salvar: ' + erro.message, 'erro');
  }
  
  return false;
}

// ============================================
// SALVAR CONTAS NO GOOGLE DRIVE
// ============================================
async function salvarContasNoGoogleDrive() {
  try {
    const dadosJson = JSON.stringify(contasAtivas);

    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `acao=salvarContas&deviceId=${deviceId}&dados=${encodeURIComponent(dadosJson)}`
    });

    console.log('📡 Status da resposta:', response.status);

    if (!response.ok) {
      const erroText = await response.text();
      console.error('❌ Erro na resposta:', erroText);
      throw new Error(`HTTP ${response.status}: ${erroText}`);
    }

    const contentType = response.headers.get('content-type');
    let resultado;
    
    if (contentType && contentType.includes('application/json')) {
      resultado = await response.json();
    } else {
      const text = await response.text();
      console.log('📄 Resposta:', text);
      resultado = { sucesso: true, mensagem: 'Salvo com sucesso' };
    }

    console.log('✅ Resultado salvar:', resultado);
    return resultado || { sucesso: true, mensagem: 'Salvo com sucesso' };

  } catch (erro) {
    console.error('❌ Erro ao salvar:', erro);
    throw erro;
  }
}

// ============================================
// DELETAR CONTA
// ============================================
async function deletarConta(id) {
  console.log('🗑️ Clicou em deletar conta ID:', id, 'Tipo:', typeof id);
  
  contaEmDelecao = id;
  // Procurar pela conta comparando como string
  const conta = contasAtivas.find(c => String(c.Id) === String(id));
  
  if (!conta) {
    console.error('❌ Conta não encontrada:', id);
    console.error('📦 Contas disponíveis:', contasAtivas.map(c => ({ Id: c.Id, Desc: c.Descricao })));
    return;
  }

  const modal = document.getElementById('modalConfirmacao');
  const message = document.getElementById('modalMessage');
  
  if (!modal || !message) {
    console.error('❌ Modal de confirmação não encontrado');
    return;
  }
  
  message.textContent = `Tem certeza que deseja deletar a conta "${conta.Descricao}" no valor de R$ ${formatarMoeda(conta.Valor)}?`;
  
  console.log('🔓 Abrindo modal de confirmação');
  modal.classList.add('show');
}

// ============================================
// CONFIRMAR DELEÇÃO
// ============================================
async function confirmarDelecao() {
  try {
    if (!contaEmDelecao) return;

    console.log('✅ Confirmando deleção de conta ID:', contaEmDelecao);

    // Procurar pela conta comparando como string
    const contaAntiga = contasAtivas.find(c => String(c.Id) === String(contaEmDelecao));
    
    contasAtivas = contasAtivas.filter(c => String(c.Id) !== String(contaEmDelecao));

    console.log('📤 Salvando deletação...');
    await salvarContasNoGoogleDrive();

    mostrarMensagem('✅ Conta deletada com sucesso!', 'sucesso');

    if (contaAntiga) {
      await registrarDelecaoConta(contaAntiga);
    }

    fecharModal('modalConfirmacao');
    contaEmDelecao = null;

    atualizarResumo();
    await renderizarTabela();

  } catch (erro) {
    console.error('❌ Erro ao deletar:', erro);
    mostrarMensagem('Erro ao deletar: ' + erro.message, 'erro');
  }
}


// ============================================
// BASE FINANCEIRA PROFISSIONAL - CONTAS
// ============================================

function normalizarTipoConta(conta) {
  return conta.TipoConta || conta.tipoConta || 'fixa';
}

function criarDataLocal(data) {
  if (!data) return null;
  const texto = String(data);
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }
  const d = new Date(texto);
  return isNaN(d.getTime()) ? null : d;
}

function formatarDataISO(data) {
  if (!data) return '';
  const d = criarDataLocal(data) || new Date(data);
  if (isNaN(d.getTime())) return '';
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function mesmoMesAno(data, mes, ano) {
  const d = criarDataLocal(data);
  return !!d && d.getMonth() + 1 === Number(mes) && d.getFullYear() === Number(ano);
}

function clonarContaParaExibicao(conta, ajustes = {}) {
  return {
    ...conta,
    ...ajustes,
    BaseContaId: conta.Id,
    ContaPersistida: true
  };
}


function chaveOcorrenciaConta(data) {
  return formatarDataISO(data);
}

function obterMapaOcorrencias(conta) {
  if (!conta || !conta.IsRecorrente) return {};
  if (!conta.Ocorrencias || typeof conta.Ocorrencias !== 'object' || Array.isArray(conta.Ocorrencias)) {
    conta.Ocorrencias = {};
  }
  return conta.Ocorrencias;
}

function garantirOcorrenciaBaseConta(conta) {
  if (!conta || !conta.IsRecorrente || normalizarTipoConta(conta) !== 'fixa') return;
  const chave = chaveOcorrenciaConta(conta.DataPagamento);
  if (!chave) return;
  const ocorrencias = obterMapaOcorrencias(conta);
  if (!ocorrencias[chave]) {
    ocorrencias[chave] = {
      DataPagamento: chave,
      StatusPagamento: conta.StatusPagamento === 'Pago' ? 'Pago' : 'Não Pago',
      DataPago: conta.DataPago || null,
      Valor: parseFloat(conta.Valor || 0) || 0,
      Notas: conta.Notas || ''
    };
  }
}

function normalizarContasRecorrentes() {
  contasAtivas.forEach(conta => garantirOcorrenciaBaseConta(conta));
}

function obterOcorrenciaConta(conta, dataPagamento) {
  if (!conta || !conta.IsRecorrente) return null;
  garantirOcorrenciaBaseConta(conta);
  const chave = chaveOcorrenciaConta(dataPagamento);
  const ocorrencias = obterMapaOcorrencias(conta);
  return chave && ocorrencias[chave] ? ocorrencias[chave] : null;
}

function montarContaOcorrencia(conta, dataPagamento, ajustes = {}) {
  const dataISO = chaveOcorrenciaConta(dataPagamento);
  const ocorrencia = obterOcorrenciaConta(conta, dataISO);
  return clonarContaParaExibicao(conta, {
    Id: `${conta.Id}__${dataISO}`,
    DataPagamento: dataISO,
    DataOcorrencia: dataISO,
    StatusPagamento: ocorrencia?.StatusPagamento || 'Não Pago',
    DataPago: ocorrencia?.DataPago || null,
    Valor: ocorrencia?.Valor ?? conta.Valor,
    Notas: ocorrencia?.Notas ?? conta.Notas,
    ...ajustes
  });
}

function salvarOcorrenciaConta(conta, dataPagamento, ajustes = {}) {
  if (!conta || !conta.IsRecorrente) return null;
  const chave = chaveOcorrenciaConta(dataPagamento);
  if (!chave) return null;
  garantirOcorrenciaBaseConta(conta);
  const ocorrencias = obterMapaOcorrencias(conta);
  ocorrencias[chave] = {
    DataPagamento: chave,
    StatusPagamento: ajustes.StatusPagamento || ocorrencias[chave]?.StatusPagamento || 'Não Pago',
    DataPago: ajustes.DataPago ?? ocorrencias[chave]?.DataPago ?? null,
    Valor: ajustes.Valor ?? ocorrencias[chave]?.Valor ?? conta.Valor,
    Notas: ajustes.Notas ?? ocorrencias[chave]?.Notas ?? ''
  };
  return ocorrencias[chave];
}

function intervaloMesesRecorrencia(frequencia) {
  const mapa = {
    mensal: 1,
    bimestral: 2,
    trimestral: 3,
    semestral: 6,
    anual: 12
  };
  return mapa[frequencia] || null;
}

function ultimoDiaMes(ano, mes) {
  return new Date(ano, mes, 0).getDate();
}

function gerarOcorrenciasRecorrentesNoPeriodo(conta, mes, ano) {
  const base = criarDataLocal(conta.DataPagamento);
  if (!base) return [];

  garantirOcorrenciaBaseConta(conta);

  const inicioPeriodo = new Date(Number(ano), Number(mes) - 1, 1);
  const fimPeriodo = new Date(Number(ano), Number(mes), 0, 23, 59, 59, 999);
  if (fimPeriodo < base) return [];

  const frequencia = conta.Frequencia || conta.frequencia || '';

  if (frequencia === 'quinzenal') {
    const ocorrencias = [];
    const d = new Date(base);

    while (d < inicioPeriodo) d.setDate(d.getDate() + 15);

    while (d <= fimPeriodo) {
      const dataISO = formatarDataISO(d);
      ocorrencias.push(montarContaOcorrencia(conta, dataISO, {
        ProjecaoRecorrente: dataISO !== formatarDataISO(conta.DataPagamento),
        TipoExibicao: dataISO === formatarDataISO(conta.DataPagamento) ? 'real' : 'projetada'
      }));
      d.setDate(d.getDate() + 15);
    }

    return ocorrencias;
  }

  const intervaloMeses = intervaloMesesRecorrencia(frequencia);
  if (!intervaloMeses) return [];

  const diffMeses =
    (Number(ano) - base.getFullYear()) * 12 +
    ((Number(mes) - 1) - base.getMonth());

  if (diffMeses < 0 || diffMeses % intervaloMeses !== 0) return [];

  const dia = Math.min(base.getDate(), ultimoDiaMes(Number(ano), Number(mes)));
  const dataOcorrencia = new Date(Number(ano), Number(mes) - 1, dia);
  const dataISO = formatarDataISO(dataOcorrencia);

  return [montarContaOcorrencia(conta, dataISO, {
    ProjecaoRecorrente: dataISO !== formatarDataISO(conta.DataPagamento),
    TipoExibicao: dataISO === formatarDataISO(conta.DataPagamento) ? 'real' : 'projetada'
  })];
}

async function obterClientesFinanceiro() {
  if (clientesFinanceiroCache) return clientesFinanceiroCache;

  try {
    const clientes = await buscarArquivo('clientes.json');
    clientesFinanceiroCache = Array.isArray(clientes) ? clientes : [];
  } catch (erro) {
    console.warn('⚠️ Não consegui carregar clientes para contas automáticas:', erro);
    clientesFinanceiroCache = [];
  }

  return clientesFinanceiroCache;
}

function obterValorVendaFinanceiro(venda) {
  if (!venda) return 0;

  const valorDireto = parseFloat(
    venda.ValorTotal ||
    venda.Valor ||
    venda.Total ||
    venda.TotalVenda ||
    venda.ValorVenda ||
    0
  );

  if (!isNaN(valorDireto) && valorDireto > 0) return valorDireto;

  if (Array.isArray(venda.Produtos)) {
    const totalProdutos = venda.Produtos.reduce((sum, produto) => sum + (parseFloat(produto.Valor || produto.valor || 0) || 0), 0);
    if (totalProdutos > 0) return totalProdutos;
  }

  if (Array.isArray(venda.Parcelas)) {
    return venda.Parcelas.reduce((sum, parcela) => sum + (parseFloat(parcela.Valor || parcela.valor || 0) || 0), 0);
  }

  return 0;
}

function obterDataVendaFinanceira(venda) {
  return venda.DataVenda || venda.Data || venda.DataCadastro || venda.dataVenda || venda.data || null;
}

function obterMesAnterior(mes, ano) {
  const d = new Date(Number(ano), Number(mes) - 2, 1);
  return { mes: d.getMonth() + 1, ano: d.getFullYear() };
}

function totalVendidoNoPeriodo(clientes, mes, ano) {
  let total = 0;

  clientes.forEach(cliente => {
    (cliente.Vendas || []).forEach(venda => {
      const dataVenda = criarDataLocal(obterDataVendaFinanceira(venda));
      if (!dataVenda) return;

      if (dataVenda.getMonth() + 1 === Number(mes) && dataVenda.getFullYear() === Number(ano)) {
        total += obterValorVendaFinanceiro(venda);
      }
    });
  });

  return total;
}

function contarBoletosPagosNoPeriodo(clientes, mes, ano) {
  let total = 0;

  clientes.forEach(cliente => {
    (cliente.Vendas || []).forEach(venda => {
      (venda.Parcelas || []).forEach(parcela => {
        if (!parcela.Pago) return;
        if (parcela.BaixadaPorQuitacao || parcela.QuitadaPorRecebimentoUnico) return;

        const dataEfetiva = criarDataLocal(parcela.DataPagamento || parcela.dataPagamento || null);
        if (!dataEfetiva) return;

        if (dataEfetiva.getMonth() + 1 === Number(mes) && dataEfetiva.getFullYear() === Number(ano)) {
          total += 1;
        }
      });
    });
  });

  return total;
}

function periodoEhIgualOuPosterior(dataInicial, mes, ano) {
  const base = criarDataLocal(dataInicial);
  if (!base) return false;

  const alvo = new Date(Number(ano), Number(mes) - 1, 1);
  const inicioBase = new Date(base.getFullYear(), base.getMonth(), 1);
  return alvo >= inicioBase;
}

async function gerarContasAutomaticasCalculadas(mes, ano) {
  const clientes = await obterClientesFinanceiro();
  const automaticas = [];

  for (const conta of contasAtivas) {
    const tipoConta = normalizarTipoConta(conta);

    if (!periodoEhIgualOuPosterior(conta.DataPagamento, mes, ano)) {
      continue;
    }

    if (tipoConta === 'imposto_percentual') {
      const anterior = obterMesAnterior(mes, ano);
      const baseVendas = totalVendidoNoPeriodo(clientes, anterior.mes, anterior.ano);
      const percentual = parseFloat(conta.Percentual || 0) || 0;
      const valor = baseVendas * (percentual / 100);

      automaticas.push({
        ...conta,
        Id: `${conta.Id}__imposto_${ano}_${mes}`,
        DataPagamento: `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(criarDataLocal(conta.DataPagamento)?.getDate() || 1, ultimoDiaMes(Number(ano), Number(mes)))).padStart(2, '0')}`,
        Valor: valor,
        StatusPagamento: 'Não Pago',
        Automatica: true,
        ContaPersistida: false,
        TipoExibicao: 'calculada',
        Descricao: `${conta.Descricao} — ${percentual}% sobre vendas de ${String(anterior.mes).padStart(2, '0')}/${anterior.ano}`,
        NotasCalculo: `Base: R$ ${formatarMoeda(baseVendas)} × ${percentual}%`
      });
    }

    if (tipoConta === 'taxa_boleto') {
      const boletosPagos = contarBoletosPagosNoPeriodo(clientes, mes, ano);
      const taxa = parseFloat(conta.TaxaPorBoleto || 0) || 0;
      const valor = boletosPagos * taxa;

      automaticas.push({
        ...conta,
        Id: `${conta.Id}__taxa_boleto_${ano}_${mes}`,
        DataPagamento: `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(criarDataLocal(conta.DataPagamento)?.getDate() || 1, ultimoDiaMes(Number(ano), Number(mes)))).padStart(2, '0')}`,
        Valor: valor,
        StatusPagamento: 'Não Pago',
        Automatica: true,
        ContaPersistida: false,
        TipoExibicao: 'calculada',
        Descricao: `${conta.Descricao} — ${conta.Banco || 'Banco'} — ${boletosPagos} boleto(s) pago(s)`,
        NotasCalculo: `${boletosPagos} × R$ ${formatarMoeda(taxa)}`
      });
    }
  }

  return automaticas;
}

async function obterContasDoPeriodo(mes, ano) {
  const contasFixas = contasAtivas.filter(conta => normalizarTipoConta(conta) === 'fixa');
  const resultado = [];

  contasFixas.forEach(conta => {
    if (conta.IsRecorrente) {
      resultado.push(...gerarOcorrenciasRecorrentesNoPeriodo(conta, mes, ano));
    } else if (mesmoMesAno(conta.DataPagamento, mes, ano)) {
      resultado.push(clonarContaParaExibicao(conta, {
        ContaPersistida: true,
        TipoExibicao: 'real'
      }));
    }
  });

  resultado.push(...await gerarContasAutomaticasCalculadas(mes, ano));

  return resultado;
}

function descricaoTipoConta(conta) {
  const tipo = normalizarTipoConta(conta);
  if (tipo === 'imposto_percentual') return '🧾 IMPOSTO AUTOMÁTICO';
  if (tipo === 'taxa_boleto') return '🏦 TAXA BOLETO AUTOMÁTICA';
  if (conta.ProjecaoRecorrente) return '📆 PROJETADA';
  return conta.IsRecorrente ? '📅 RECORRENTE' : '🔔 ÚNICA';
}

// ============================================
// RENDERIZAR TABELA
// ============================================
async function renderizarTabela(aplicarFiltroAtivo = false) {
  const tabelaContainer = document.getElementById('tabelaContainer');
  
  console.log('📊 Renderizando tabela...');
  console.log('📦 Total de contas-base:', contasAtivas.length);
  console.log('🔍 Aplicar filtro:', aplicarFiltroAtivo);

  atualizarStatusTodasAsContas();

  const mes = document.getElementById('filtroMes')?.value || '';
  const ano = document.getElementById('filtroAno')?.value || '';
  const status = document.getElementById('filtroStatus')?.value || '';
  const categoria = document.getElementById('filtroCategoria')?.value || '';

  let contasParaExibir;

  if (aplicarFiltroAtivo && mes && ano) {
    contasParaExibir = await obterContasDoPeriodo(Number(mes), Number(ano));
  } else {
    contasParaExibir = contasAtivas.map(conta => ({
      ...conta,
      ContaPersistida: true,
      TipoExibicao: 'base'
    }));
  }

  if (aplicarFiltroAtivo) {
    console.log('🔎 Filtros:', { mes, ano, status, categoria });

    contasParaExibir = contasParaExibir.filter(conta => {
      if (mes && ano) {
        // Já está projetado para o período selecionado.
      } else {
        if (mes) {
          const dataConta = criarDataLocal(conta.DataPagamento);
          const mesConta = dataConta ? (dataConta.getMonth() + 1).toString() : '';
          if (mesConta !== mes) return false;
        }

        if (ano) {
          const dataConta = criarDataLocal(conta.DataPagamento);
          const anoConta = dataConta ? dataConta.getFullYear().toString() : '';
          if (anoConta !== ano) return false;
        }
      }

      if (status && conta.StatusPagamento !== status) return false;
      if (categoria && conta.Categoria !== categoria) return false;
      return true;
    });
  }

  if (contasParaExibir.length === 0) {
    tabelaContainer.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">Nenhuma conta encontrada. Tente ajustar seus filtros.</p>';
    return;
  }

  const contasOrdenadas = [...contasParaExibir].sort((a, b) => criarDataLocal(a.DataPagamento) - criarDataLocal(b.DataPagamento));

  let html = `
    <table>
      <thead>
        <tr>
          <th>Data de Pagamento</th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Valor</th>
          <th>Tipo</th>
          <th>Responsável</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
  `;

  contasOrdenadas.forEach(conta => {
    const statusClass = conta.StatusPagamento === 'Pago' ? 'status-pago' : 'status-naopago';
    const statusTexto = conta.StatusPagamento === 'Pago' ? '✅ PAGO' : '❌ NÃO PAGO';
    const detalhesCalculo = conta.NotasCalculo ? `<div style="font-size: 11px; color: #8fb9ac; margin-top: 4px;">${conta.NotasCalculo}</div>` : '';
    const acoes = conta.Automatica
      ? '<span style="color:#8fb9ac;font-size:12px;">Automática</span>'
      : conta.DataOcorrencia
        ? `<div class="acoes"><button class="btn-editar" onclick="editarOcorrenciaConta('${conta.BaseContaId}', '${conta.DataOcorrencia}')">✏️ Editar ocorrência</button></div>`
        : `<div class="acoes"><button class="btn-editar" onclick="editarConta('${conta.BaseContaId || conta.Id}')">✏️ Editar regra</button><button class="btn-deletar" onclick="deletarConta('${conta.BaseContaId || conta.Id}')">🗑️ Deletar</button></div>`;

    html += `
      <tr>
        <td>${formatarData(conta.DataPagamento)}</td>
        <td>${conta.Descricao}${detalhesCalculo}</td>
        <td>${conta.Categoria}</td>
        <td style="font-weight: bold; color: #d4af37;">R$ ${formatarMoeda(conta.Valor || 0)}</td>
        <td><span class="status-badge ${conta.Automatica ? 'status-recorrente' : (conta.IsRecorrente ? 'status-recorrente' : 'status-unica')}">${descricaoTipoConta(conta)}</span></td>
        <td>${conta.Responsavel || '-'}</td>
        <td><span class="status-badge ${statusClass}">${statusTexto}</span></td>
        <td>${acoes}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  tabelaContainer.innerHTML = html;
}

// ============================================
// ATUALIZAR RESUMO
// ============================================
function atualizarResumo() {
  const total = contasAtivas.reduce((sum, c) => sum + (c.Valor || 0), 0);
  const recorrentes = contasAtivas.filter(c => c.IsRecorrente).length;
  
  const agora = new Date();
  const em30dias = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const proximosMeses = contasAtivas.filter(c => {
    const dataConta = new Date(c.DataPagamento);
    return dataConta >= agora && dataConta <= em30dias;
  }).reduce((sum, c) => sum + (c.Valor || 0), 0);

  document.getElementById('totalContas').textContent = `R$ ${formatarMoeda(total)}`;
  document.getElementById('contasRecorrentes').textContent = recorrentes;
  document.getElementById('proximos30').textContent = `R$ ${formatarMoeda(proximosMeses)}`;
  document.getElementById('totalQuantidade').textContent = contasAtivas.length;
}

// ============================================
// EDITAR CONTA
// ============================================
function editarConta(id) {
  console.log('✏️ Clicou em editar conta ID:', id, 'Tipo:', typeof id);
  
  // Procurar pela conta comparando como string
  const conta = contasAtivas.find(c => String(c.Id) === String(id));
  if (!conta) {
    console.error('❌ Conta não encontrada com ID:', id);
    console.error('📦 Contas disponíveis:', contasAtivas.map(c => ({ Id: c.Id, Desc: c.Descricao })));
    mostrarMensagem('❌ Conta não encontrada', 'erro');
    return;
  }

  console.log('📝 Editando conta:', conta);

  window.contaEmEdicao = id;
  window.dataOcorrenciaEmEdicao = null;
  window.modoEdicaoOcorrencia = false;

  const titulo = document.querySelector('#modalEdicao .modal-header');
  if (titulo) {
    titulo.firstChild.textContent = '✏️ Editar conta ';
  }

  document.getElementById('editDescricao').value = conta.Descricao;
  document.getElementById('editValor').value = conta.Valor;
  document.getElementById('editDataPagamento').value = conta.DataPagamento;
  document.getElementById('editCategoria').value = conta.Categoria;
  document.getElementById('editStatus').value = conta.StatusPagamento;
  document.getElementById('editNotas').value = conta.Notas || '';
  document.getElementById('editStatusPagamento').value = '';

  const modal = document.getElementById('modalEdicao');
  if (modal) {
    console.log('🔓 Abrindo modal de edição');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  } else {
    console.error('❌ Modal não encontrado: modalEdicao');
  }
}

function editarOcorrenciaConta(baseId, dataOcorrencia) {
  const conta = contasAtivas.find(c => String(c.Id) === String(baseId));
  if (!conta) {
    mostrarMensagem('❌ Conta-base não encontrada', 'erro');
    return;
  }

  const ocorrencia = montarContaOcorrencia(conta, dataOcorrencia);
  window.contaEmEdicao = baseId;
  window.dataOcorrenciaEmEdicao = dataOcorrencia;
  window.modoEdicaoOcorrencia = true;

  const titulo = document.querySelector('#modalEdicao .modal-header');
  if (titulo) {
    titulo.firstChild.textContent = '✏️ Editar ocorrência ';
  }

  document.getElementById('editDescricao').value = ocorrencia.Descricao;
  document.getElementById('editValor').value = ocorrencia.Valor;
  document.getElementById('editDataPagamento').value = ocorrencia.DataPagamento;
  document.getElementById('editCategoria').value = ocorrencia.Categoria;
  document.getElementById('editStatus').value = ocorrencia.StatusPagamento;
  document.getElementById('editNotas').value = ocorrencia.Notas || '';
  document.getElementById('editStatusPagamento').value = '';

  const modal = document.getElementById('modalEdicao');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

// ============================================
// SALVAR EDIÇÃO DE CONTA
// ============================================
async function salvarEdicaoConta(event) {
  if (event) event.preventDefault();

  try {
    const id = window.contaEmEdicao;
    if (!id) throw new Error('ID da conta não identificado');

    const contaIndex = contasAtivas.findIndex(c => String(c.Id) === String(id));
    if (contaIndex === -1) throw new Error('Conta não encontrada');

    const conta = contasAtivas[contaIndex];
    const novoStatus = document.getElementById('editStatusPagamento').value;
    const notas = document.getElementById('editNotas').value || '';

    if (window.modoEdicaoOcorrencia && window.dataOcorrenciaEmEdicao) {
      const ocorrenciaAtual = montarContaOcorrencia(conta, window.dataOcorrenciaEmEdicao);
      const statusFinal = novoStatus === 'Pago' ? 'Pago' : ocorrenciaAtual.StatusPagamento;
      salvarOcorrenciaConta(conta, window.dataOcorrenciaEmEdicao, {
        StatusPagamento: statusFinal,
        DataPago: statusFinal === 'Pago' ? new Date().toISOString() : ocorrenciaAtual.DataPago,
        Valor: ocorrenciaAtual.Valor,
        Notas: notas
      });
    } else {
      if (novoStatus === 'Pago') {
        conta.StatusPagamento = 'Pago';
        conta.DataPago = new Date().toISOString();
      }
      conta.Notas = notas;
      garantirOcorrenciaBaseConta(conta);
      if (conta.IsRecorrente) {
        salvarOcorrenciaConta(conta, conta.DataPagamento, {
          StatusPagamento: conta.StatusPagamento,
          DataPago: conta.DataPago,
          Valor: conta.Valor,
          Notas: conta.Notas
        });
      }
    }

    const resultado = await salvarContasNoGoogleDrive();

    if (resultado) {
      mostrarMensagem(window.modoEdicaoOcorrencia ? '✅ Ocorrência atualizada com sucesso!' : '✅ Conta atualizada com sucesso!', 'sucesso');
      fecharModal('modalEdicao');
      window.contaEmEdicao = null;
      window.dataOcorrenciaEmEdicao = null;
      window.modoEdicaoOcorrencia = false;
      atualizarResumo();
      await renderizarTabela(true);
    } else {
      throw new Error('Falha ao salvar alterações');
    }

  } catch (erro) {
    console.error('❌ Erro ao editar conta:', erro);
    mostrarMensagem('❌ Erro: ' + erro.message, 'erro');
  }

  return false;
}

// ============================================
// CALCULAR STATUS AUTOMATICAMENTE
// ============================================
function calcularStatusAutomatico(dataPagamento) {
  // Qualquer conta que não esteja marcada como "Pago" é "Não Pago"
  // Data vencida ou não, se não foi pago, é "Não Pago"
  return 'Não Pago';
}

// ============================================
// ATUALIZAR TODOS OS STATUS
// ============================================
function atualizarStatusTodasAsContas() {
  contasAtivas.forEach(conta => {
    if (conta.StatusPagamento !== 'Pago') {
      conta.StatusPagamento = 'Não Pago';
    }
    if (conta.IsRecorrente) {
      garantirOcorrenciaBaseConta(conta);
    }
  });
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function gerarId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

function formatarData(data) {
  if (!data) return '';
  const d = new Date(data);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
}

function mostrarMensagem(texto, tipo = 'sucesso') {
  const container = document.getElementById('mensagemContainer');
  const classe = tipo === 'sucesso' ? 'mensagem-sucesso' : 'mensagem-erro';
  
  const div = document.createElement('div');
  div.className = `mensagem ${classe}`;
  div.textContent = texto;
  div.style.cssText = `
    padding: 15px 20px;
    margin: 10px 0;
    border-radius: 8px;
    font-weight: 600;
    opacity: 1;
    transition: opacity 0.3s;
  `;

  container.appendChild(div);

  setTimeout(() => {
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 300);
  }, 5000);
}

function atualizarCamposTipoConta() {
  const tipo = document.getElementById('inputTipoConta')?.value || 'fixa';
  const grupoValor = document.getElementById('grupoValorConta');
  const grupoPercentual = document.getElementById('grupoPercentualConta');
  const grupoBanco = document.getElementById('grupoBancoConta');
  const grupoTaxa = document.getElementById('grupoTaxaBoletoConta');
  const inputValor = document.getElementById('inputValor');
  const inputRecorrencia = document.getElementById('inputRecorrencia');
  const inputCategoria = document.getElementById('inputCategoria');

  if (grupoValor) grupoValor.style.display = tipo === 'fixa' ? '' : 'none';
  if (grupoPercentual) grupoPercentual.style.display = tipo === 'imposto_percentual' ? '' : 'none';
  if (grupoBanco) grupoBanco.style.display = tipo === 'taxa_boleto' ? '' : 'none';
  if (grupoTaxa) grupoTaxa.style.display = tipo === 'taxa_boleto' ? '' : 'none';
  if (inputValor) inputValor.required = tipo === 'fixa';

  if (tipo === 'imposto_percentual') {
    if (inputRecorrencia) inputRecorrencia.value = 'mensal';
    if (inputCategoria && !inputCategoria.value) inputCategoria.value = 'Impostos';
  }

  if (tipo === 'taxa_boleto') {
    if (inputRecorrencia) inputRecorrencia.value = 'mensal';
    if (inputCategoria && !inputCategoria.value) inputCategoria.value = 'Taxas Bancárias';
  }
}

function limparFormulario() {
  const form = document.getElementById('formContaBridge');
  if (form) {
    form.reset();
  }
  atualizarCamposTipoConta();
}

function abrirModalConta() {
  const modal = document.getElementById('modalFormulario');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    limparFormulario();
  }
}

function fecharModal(idModal = 'modalFormulario') {
  const modal = document.getElementById(idModal);
  
  if (modal && modal.classList.contains('show')) {
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
  }
}

// ============================================
// APLICAR E LIMPAR FILTROS
// ============================================

async function aplicarFiltros() {
  const mes = document.getElementById('filtroMes')?.value || '';
  const ano = document.getElementById('filtroAno')?.value || '';
  const status = document.getElementById('filtroStatus')?.value || '';
  const categoria = document.getElementById('filtroCategoria')?.value || '';

  const contagemFiltros = [mes, ano, status, categoria].filter(v => v !== '').length;
  console.log(`🔍 Aplicando ${contagemFiltros} filtro(s)...`);

  await renderizarTabela(contagemFiltros > 0);
  
  if (contagemFiltros > 0) {
    mostrarMensagem(`✅ ${contagemFiltros} filtro(s) aplicado(s).`, 'sucesso');
  }
}

async function limparFiltros() {
  document.getElementById('filtroMes').value = '';
  document.getElementById('filtroAno').value = '';
  document.getElementById('filtroStatus').value = '';
  document.getElementById('filtroCategoria').value = '';
  
  await renderizarTabela(false);
  mostrarMensagem('✨ Filtros limpos. Exibindo todas as contas.', 'info');
}

// ============================================
// AUDITORIA - REGISTRO DE CRIAÇÃO
// ============================================
async function registrarCriacaoConta(conta) {
  try {
    const usuario = obterUsuario();
    if (!usuario) return;

    await registrarAuditoria(
      'Criar',
      'Conta',
      conta.Id || conta.id,
      conta.Descricao || conta.descricao,
      `Conta criada via Site`,
      "",
      conta
    );
  } catch (erro) {
    console.warn('⚠️ Erro ao registrar auditoria:', erro);
  }
}

// ============================================
// AUDITORIA - REGISTRO DE DELEÇÃO
// ============================================
async function registrarDelecaoConta(conta) {
  try {
    const usuario = obterUsuario();
    if (!usuario) return;

    await registrarAuditoria(
      'Deletar',
      'Conta',
      conta.Id || conta.id,
      conta.Descricao || conta.descricao,
      `Conta deletada via Site`,
      conta,
      ""
    );
  } catch (erro) {
    console.warn('⚠️ Erro ao registrar auditoria:', erro);
  }
}

// ============================================
// EVENT LISTENERS - MODAL BACKDROP
// ============================================

window.addEventListener('DOMContentLoaded', () => {
  const modalFormulario = document.getElementById('modalFormulario');
  const modalConfirmacao = document.getElementById('modalConfirmacao');
  const modalEdicao = document.getElementById('modalEdicao');

  // Fechar modais ao clicar no backdrop
  if (modalFormulario) {
    modalFormulario.addEventListener('click', (e) => {
      if (e.target === modalFormulario) {
        fecharModal();
      }
    });
  }

  if (modalConfirmacao) {
    modalConfirmacao.addEventListener('click', (e) => {
      if (e.target === modalConfirmacao) {
        fecharModal('modalConfirmacao');
      }
    });
  }

  if (modalEdicao) {
    modalEdicao.addEventListener('click', (e) => {
      if (e.target === modalEdicao) {
        fecharModal('modalEdicao');
      }
    });
  }

  atualizarCamposTipoConta();

  // Fechar modais com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharModal();
      fecharModal('modalConfirmacao');
      fecharModal('modalEdicao');
    }
  });
});
