// ============================================
// RELATÓRIO DE VENDEDOR - MÓDULO PRINCIPAL
// ============================================

let usuarioLogado = verificarLogin();
let vendedorSelecionado = null;
let mesFiltro = 4;
let anoFiltro = 2026;
let dadosClientes = [];
let dadosMetas = [];
let isAdmin = false;

// Validação de acesso
if (!usuarioLogado) {
  console.error('❌ Usuário não autenticado');
  window.location.replace('keygate.html');
}

// Verificar permissão no módulo
const moduloPermitido = usuarioLogado?.modulos?.includes('Administrador') || 
                        usuarioLogado?.modulos?.includes('Relatório Vendedor') ||
                        usuarioLogado?.nome === 'Admin';

if (!moduloPermitido && !isAdmin) {
  // Permitir que todo usuário veja seu próprio desempenho
  console.log('✅ Usuário pode visualizar próprio desempenho');
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando Relatório de Vendedor...');
  
  // Verificar se é administrador
  isAdmin = usuarioLogado && (usuarioLogado.nome === 'Admin' || usuarioLogado.id === 1);
  
  if (!isAdmin) {
    // Se não é admin, usar próprio nome como vendedor
    vendedorSelecionado = usuarioLogado?.nome || '';
    document.getElementById('filtroVendedorGroup').style.display = 'none';
  } else {
    // Se é admin, mostrar seletor de vendedor
    document.getElementById('filtroVendedorGroup').style.display = 'block';
  }

  // Carregar dados
  await carregarDados();

  // Agora que temos dados, carregar vendedores e anos
  if (isAdmin) {
    await carregarVendedoresSelect();
  } else {
    vendedorSelecionado = usuarioLogado?.nome || '';
  }
  
  // Carregar todos os anos disponíveis
  carregarAnosDisponiveis();
  
  // Definir mês/ano atuais
  const hoje = new Date();
  mesFiltro = hoje.getMonth() + 1;
  anoFiltro = hoje.getFullYear();
  document.getElementById('filtroMes').value = mesFiltro;
  document.getElementById('filtroAno').value = anoFiltro;

  // Renderizar inicial
  await aplicarFiltros();

  // Renderizar sidebar
  renderizarSidebarDock();
});

// ============================================
// CARREGAR ANOS DISPONÍVEIS
// ============================================
function carregarAnosDisponiveis() {
  try {
    const anosUnicos = new Set();
    
    // Extrair todos os anos das vendas
    dadosClientes.forEach(cliente => {
      if (Array.isArray(cliente.Vendas)) {
        cliente.Vendas.forEach(venda => {
          const dataVenda = new Date(venda.DataVenda);
          const anoVenda = dataVenda.getFullYear();
          if (anoVenda > 1990 && anoVenda < 2100) { // Validação básica
            anosUnicos.add(anoVenda);
          }
        });
      }
    });

    // Se não há vendas, incluir anos padrão
    if (anosUnicos.size === 0) {
      const hoje = new Date();
      for (let i = 3; i >= 0; i--) {
        anosUnicos.add(hoje.getFullYear() - i);
      }
    }

    // Ordenar e adicionar ao select
    const selectAno = document.getElementById('filtroAno');
    const anosOrdenados = Array.from(anosUnicos).sort((a, b) => b - a);
    
    selectAno.innerHTML = anosOrdenados.map(ano => `<option value="${ano}">${ano}</option>`).join('');
    
    // Definir ano atual como padrão
    const anoAtual = new Date().getFullYear();
    selectAno.value = anoAtual;
    
    console.log(`✅ Anos disponíveis: ${anosOrdenados.join(', ')}`);
  } catch (erro) {
    console.error('❌ Erro ao carregar anos:', erro);
  }
}

// ============================================
// CARREGAR VENDEDORES PARA SELECT
// ============================================
async function carregarVendedoresSelect() {
  try {
    const selectVendedor = document.getElementById('filtroVendedor');
    
    selectVendedor.innerHTML = '<option value="">-- Selecione um vendedor --</option>';
    
    // Extrair vendedores únicos dos clientes
    const vendedoresUnicos = new Set();
    dadosClientes.forEach(cliente => {
      if (cliente.Vendedor) {
        vendedoresUnicos.add(cliente.Vendedor.trim());
      }
    });

    // Ordenar e adicionar ao select
    Array.from(vendedoresUnicos).sort().forEach(vendedor => {
      const option = document.createElement('option');
      option.value = vendedor;
      option.textContent = vendedor;
      selectVendedor.appendChild(option);
    });

    // Definir o primeiro vendedor por padrão (se houver)
    if (vendedoresUnicos.size > 0) {
      selectVendedor.value = Array.from(vendedoresUnicos).sort()[0];
      vendedorSelecionado = selectVendedor.value;
    }
  } catch (erro) {
    console.error('❌ Erro ao carregar vendedores:', erro);
  }
}

// ============================================
// CARREGAR DADOS
// ============================================
async function carregarDados() {
  try {
    console.log('📥 Carregando dados...');
    
    // Carregar clientes
    dadosClientes = await buscarArquivo(CONFIG.ARQUIVOS.CLIENTES) || [];
    console.log(`✅ ${dadosClientes.length} clientes carregados`);

    // Carregar metas - se não existir, calcular
    try {
      dadosMetas = await buscarArquivo('meta-vendedor.json') || [];
      if (!Array.isArray(dadosMetas) || dadosMetas.length === 0) {
        console.log('⚠️ meta-vendedor.json vazio, gerando metas...');
        dadosMetas = await gerarMetasVendedores();
      }
      console.log(`✅ ${dadosMetas.length} metas carregadas`);
    } catch (e) {
      console.warn('⚠️ Erro ao carregar meta-vendedor.json, gerando metas...');
      dadosMetas = await gerarMetasVendedores();
    }
  } catch (erro) {
    console.error('❌ Erro ao carregar dados:', erro);
    mostrarErro('Erro ao carregar dados. Verifique sua conexão.');
  }
}

// ============================================
// GERAR METAS DOS VENDEDORES
// ============================================
async function gerarMetasVendedores() {
  try {
    console.log('🔄 Gerando metas dos vendedores...');

    const configMetas = await buscarArquivo('configMetas.json') || {};
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    // Extrair vendedores únicos
    const vendedoresUnicos = new Set();
    dadosClientes.forEach(cliente => {
      if (cliente.Vendedor) {
        vendedoresUnicos.add(cliente.Vendedor.trim());
      }
    });

    const metas = [];
    for (const nomeVendedor of vendedoresUnicos) {
      metas.push({
        Id: metas.length + 1,
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
      });
    }

    console.log(`✅ ${metas.length} vendedores identificados`);
    return metas;

  } catch (erro) {
    console.error('❌ Erro ao gerar metas:', erro);
    return [];
  }
}

// ============================================
// APLICAR FILTROS E RENDERIZAR
// ============================================
async function aplicarFiltros() {
  try {
    // Obter valores dos filtros
    if (isAdmin) {
      vendedorSelecionado = document.getElementById('filtroVendedor').value;
    }
    mesFiltro = parseInt(document.getElementById('filtroMes').value) || 0;
    anoFiltro = parseInt(document.getElementById('filtroAno').value);

    if (!vendedorSelecionado) {
      mostrarErro('❌ Selecione um vendedor para visualizar o relatório');
      return;
    }

    console.log(`📊 Filtrando: ${vendedorSelecionado}, ${mesFiltro}/${anoFiltro}`);

    // Calcular dados
    const dadosRelatorio = calcularDadosVendedor(vendedorSelecionado, mesFiltro, anoFiltro);
    
    // Renderizar
    renderizarInfoVendedor(dadosRelatorio);
    renderizarCards(dadosRelatorio);
    renderizarDetalhesVendas(dadosRelatorio);
    renderizarMelhoresClientes(dadosRelatorio);
    renderizarClientesInadimplentes(dadosRelatorio);
    renderizarIndicadoresDetalhados(dadosRelatorio);
    await renderizarAnaliseIA(dadosRelatorio);

  } catch (erro) {
    console.error('❌ Erro ao aplicar filtros:', erro);
    mostrarErro('Erro ao processar relatório');
  }
}

// ============================================
// CALCULAR DADOS DO VENDEDOR
// ============================================
function calcularDadosVendedor(nomeVendedor, mes, ano) {
  console.log(`🔍 Calculando dados para: ${nomeVendedor}`);

  const vendedor = {
    nome: nomeVendedor,
    foto: null,
    vendas: [],
    totalVendido: 0,
    comissao: 0,
    clientesAtendidos: new Set(),
    pagamentos: { pago: 0, pendente: 0 },
    melhoresClientes: [],
    clientesInadimplentes: [],
    metaMinima: 0,
    metaAlvo: 0,
    dataAtual: new Date()
  };

  // Buscar meta do vendedor
  const metaVendedor = dadosMetas.find(m => 
    m.NomeVendedor === nomeVendedor && 
    m.Mes === mes && 
    m.Ano === ano
  );

  if (metaVendedor) {
    vendedor.metaMinima = metaVendedor.MetaMinima || 0;
    vendedor.metaAlvo = metaVendedor.MetaAlvo || 0;
  } else {
    // Usar configuração padrão
    vendedor.metaMinima = 6000;
    vendedor.metaAlvo = 10000;
  }

  // Carregar configuração de comissão
  const configMetas = dadosClientes[0]?.configMetas || { comissao: 0 };
  const percentualComissao = parseFloat(configMetas.comissao) || 0;

  // Iterar clientes para encontrar vendas
  dadosClientes.forEach(cliente => {
    if (cliente.Vendedor?.trim().toUpperCase() !== nomeVendedor.toUpperCase()) {
      return;
    }

    vendedor.clientesAtendidos.add(cliente.Nome);

    if (!Array.isArray(cliente.Vendas)) {
      return;
    }

    // Processar cada venda
    cliente.Vendas.forEach(venda => {
      const dataVenda = new Date(venda.DataVenda || new Date());
      const mesVenda = dataVenda.getMonth() + 1;
      const anoVenda = dataVenda.getFullYear();

      // Filtrar por mês/ano
      if (mesVenda !== mes) return;
      if (anoVenda !== ano) return;

      const valorVenda = parseFloat(venda.ValorTotal) || 0;
      
      vendedor.vendas.push({
        cliente: cliente.Nome,
        valor: valorVenda,
        data: venda.DataVenda,
        nf: venda.NumeroNF || '—',
        parcelas: venda.NumeroParcelas || 1,
        statusPagamento: calcularStatusVenda(venda)
      });

      vendedor.totalVendido += valorVenda;

      // Contar pagamentos
      if (Array.isArray(venda.Parcelas)) {
        venda.Parcelas.forEach(parcela => {
          if (parcela.Pago) {
            vendedor.pagamentos.pago += parseFloat(parcela.Valor) || 0;
          } else {
            vendedor.pagamentos.pendente += parseFloat(parcela.Valor) || 0;
          }
        });
      }
    });
  });

  // Ordenar vendas e pegar melhores clientes
  vendedor.vendas.sort((a, b) => b.valor - a.valor);
  vendedor.melhoresClientes = vendedor.vendas.slice(0, 5);

  // Encontrar clientes inadimplentes
  vendedor.clientesInadimplentes = extrairClientesInadimplentes(vendedor.vendas);

  // Calcular comissão
  vendedor.comissao = vendedor.totalVendido * (percentualComissao / 100);

  // Buscar foto do vendedor
  vendedor.foto = null; // Será carregada via requisição

  console.log(`✅ Dados calculados:`, {
    totalVendido: vendedor.totalVendido,
    clientesAtendidos: vendedor.clientesAtendidos.size,
    vendas: vendedor.vendas.length,
    metaMinima: vendedor.metaMinima,
    metaAlvo: vendedor.metaAlvo
  });

  return vendedor;
}

// ============================================
// CALCULAR STATUS VENDA
// ============================================
function calcularStatusVenda(venda) {
  if (!Array.isArray(venda.Parcelas)) {
    return 'Desconhecido';
  }

  const totalParcelas = venda.Parcelas.length;
  const parcelasPagas = venda.Parcelas.filter(p => p.Pago).length;

  if (parcelasPagas === 0) return 'Sem Pagamento';
  if (parcelasPagas === totalParcelas) return 'Pago';
  return `${parcelasPagas}/${totalParcelas} Pago`;
}

// ============================================
// EXTRAIR CLIENTES INADIMPLENTES
// ============================================
function extrairClientesInadimplentes(vendas) {
  const inadimplentes = {};

  vendas.forEach(venda => {
    // Buscar cliente original para status parcelas
    const cliente = dadosClientes.find(c => c.Nome === venda.cliente);
    if (!cliente) return;

    const vendaOriginal = cliente.Vendas?.find(v => v.ValorTotal === venda.valor);
    if (!vendaOriginal || !Array.isArray(vendaOriginal.Parcelas)) return;

    const parcelasPendentes = vendaOriginal.Parcelas.filter(p => !p.Pago);
    if (parcelasPendentes.length === 0) return;

    const totalPendente = parcelasPendentes.reduce((acc, p) => acc + (parseFloat(p.Valor) || 0), 0);

    if (!inadimplentes[venda.cliente]) {
      inadimplentes[venda.cliente] = {
        cliente: venda.cliente,
        totalPendente: 0,
        parcelasPendentes: 0,
        diasAtraso: 0
      };
    }

    inadimplentes[venda.cliente].totalPendente += totalPendente;
    inadimplentes[venda.cliente].parcelasPendentes += parcelasPendentes.length;
  });

  return Object.values(inadimplentes).sort((a, b) => b.totalPendente - a.totalPendente);
}

// ============================================
// RENDERIZAR INFO VENDEDOR
// ============================================
async function renderizarInfoVendedor(dados) {
  try {
    const container = document.getElementById('infoVendedorContainer');
    
    // Buscar foto
    let fotoHTML = `<div class="foto-vendedor" style="background: #1fa37a; display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;">👤</div>`;
    
    try {
      const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
      const url = `${CONFIG.API_URL}?acao=buscar_foto&usuario=${encodeURIComponent(dados.nome)}&deviceId=${deviceId}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.url) {
          fotoHTML = `<img src="${data.url}" class="foto-vendedor" alt="${dados.nome}">`;
        }
      }
    } catch (e) {
      console.warn('⚠️ Erro ao carregar foto:', e);
    }

    const metaPercentualMinima = ((dados.totalVendido / dados.metaMinima) * 100).toFixed(1);
    const metaPercentualAlvo = ((dados.totalVendido / dados.metaAlvo) * 100).toFixed(1);

    const statusMinima = dados.totalVendido >= dados.metaMinima ? 'atingida' : 'nao-atingida';
    const statusAlvo = dados.totalVendido >= dados.metaAlvo ? 'atingida' : 'nao-atingida';

    const mesNome = obterNomeMes(mesFiltro);
    const nomePeríodo = `${mesNome} de ${anoFiltro}`;

    container.innerHTML = `
      <div class="info-vendedor">
        ${fotoHTML}
        <div class="info-vendedor-detalhes">
          <div class="info-item">
            <span class="info-label">📊 Vendedor</span>
            <span class="info-valor">${dados.nome}</span>
          </div>
          <div class="info-item">
            <span class="info-label">📅 Período</span>
            <span class="info-valor">${nomePeríodo}</span>
          </div>
          <div class="info-item">
            <span class="info-label">💰 Total Vendido</span>
            <span class="info-valor meta">R$ ${formatarMoeda(dados.totalVendido)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">🎯 Meta Mínima</span>
            <span class="info-valor ${statusMinima}">R$ ${formatarMoeda(dados.metaMinima)} (${metaPercentualMinima}%)</span>
          </div>
          <div class="info-item">
            <span class="info-label">🎯 Meta Alvo</span>
            <span class="info-valor ${statusAlvo}">R$ ${formatarMoeda(dados.metaAlvo)} (${metaPercentualAlvo}%)</span>
          </div>
          <div class="info-item">
            <span class="info-label">👥 Clientes Atendidos</span>
            <span class="info-valor">${dados.clientesAtendidos.size}</span>
          </div>
        </div>
      </div>
    `;
  } catch (erro) {
    console.error('❌ Erro ao renderizar info vendedor:', erro);
  }
}

// ============================================
// RENDERIZAR CARDS RESUMO
// ============================================
function renderizarCards(dados) {
  const container = document.getElementById('cardsResumo');

  const totalVendido = dados.pagamentos.pago + dados.pagamentos.pendente;
  const taxaPagamento = totalVendido > 0 
    ? ((dados.pagamentos.pago / totalVendido) * 100)
    : 0;

  const taxaInadimplencia = 100 - taxaPagamento;

  // Mostrar "Total Pendente" apenas para Admin
  let totalPendenteHTML = '';
  if (isAdmin) {
    totalPendenteHTML = `
      <div class="valor-card">
        <span class="valor-label">Total Pendente</span>
        <span class="valor-numero">R$ ${formatarMoeda(dados.pagamentos.pendente)}</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="card">
      <h3>📈 Desempenho</h3>
      <div class="card-content">
        <div class="valor-card">
          <span class="valor-label">Total de Vendas</span>
          <span class="valor-numero">${dados.vendas.length}</span>
        </div>
        <div class="valor-card">
          <span class="valor-label">Valor Total</span>
          <span class="valor-numero">R$ ${formatarMoeda(dados.totalVendido)}</span>
        </div>
        <div class="valor-card">
          <span class="valor-label">Ticket Médio</span>
          <span class="valor-numero">R$ ${formatarMoeda(dados.vendas.length > 0 ? dados.totalVendido / dados.vendas.length : 0)}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>💳 Pagamentos</h3>
      <div class="card-content">
        <div class="valor-card">
          <span class="valor-label">Recebido</span>
          <span class="valor-numero">R$ ${formatarMoeda(dados.pagamentos.pago)}</span>
        </div>
        ${totalPendenteHTML}
        <div class="valor-card">
          <span class="valor-label">Taxa de Pagamento</span>
          <span class="valor-numero">${taxaPagamento.toFixed(1)}%</span>
        </div>
        <div class="valor-card">
          <span class="valor-label">Taxa de Inadimplência</span>
          <span class="valor-numero">${taxaInadimplencia.toFixed(1)}%</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>💰 Comissão</h3>
      <div class="card-content">
        <div class="valor-card">
          <span class="valor-label">Valor Comissão</span>
          <span class="valor-numero">R$ ${formatarMoeda(dados.comissao)}</span>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// RENDERIZAR DETALHES DE VENDAS
// ============================================
function renderizarDetalhesVendas(dados) {
  const container = document.getElementById('detalhesVendasContainer');

  if (dados.vendas.length === 0) {
    container.innerHTML = '<h3>📋 Detalhes das Vendas</h3><p style="padding: 20px; text-align: center; color: #7cf0c2;">Nenhuma venda registrada neste período</p>';
    return;
  }

  const linhas = dados.vendas.map((venda, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${venda.cliente}</td>
      <td>R$ ${formatarMoeda(venda.valor)}</td>
      <td>${venda.nf || '—'}</td>
      <td>${venda.parcelas}</td>
      <td>${new Date(venda.data).toLocaleDateString('pt-BR')}</td>
      <td><span class="status-pago">${venda.statusPagamento}</span></td>
    </tr>
  `).join('');

  container.innerHTML = `
    <h3>📋 Detalhes das Vendas</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Cliente</th>
          <th>Valor</th>
          <th>NF</th>
          <th>Parcelas</th>
          <th>Data</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;
}

// ============================================
// RENDERIZAR MELHORES CLIENTES
// ============================================
function renderizarMelhoresClientes(dados) {
  const container = document.getElementById('melhoresClientesContainer');

  if (dados.melhoresClientes.length === 0) {
    container.innerHTML = '<div class="table-container"><h3>👥 Melhores Clientes</h3><p style="padding: 20px; text-align: center; color: #7cf0c2;">Nenhuma venda registrada neste período</p></div>';
    return;
  }

  const linhas = dados.melhoresClientes.map(venda => `
    <tr>
      <td>${venda.cliente}</td>
      <td>R$ ${formatarMoeda(venda.valor)}</td>
      <td>${venda.nf || '—'}</td>
      <td>${venda.parcelas}</td>
      <td>${new Date(venda.data).toLocaleDateString('pt-BR')}</td>
      <td><span class="status-pago">${venda.statusPagamento}</span></td>
    </tr>
  `).join('');

  container.innerHTML = `
    <h3>👥 Melhores Clientes</h3>
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Valor</th>
          <th>NF</th>
          <th>Parcelas</th>
          <th>Data</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;
}

// ============================================
// RENDERIZAR CLIENTES INADIMPLENTES
// ============================================
function renderizarClientesInadimplentes(dados) {
  const container = document.getElementById('clientesInadimplementesContainer');

  if (dados.clientesInadimplentes.length === 0) {
    container.innerHTML = '<div class="table-container"><h3>⚠️ Clientes Inadimplentes</h3><p style="padding: 20px; text-align: center; color: #4caf50;">Excelente! Todos os clientes estão em dia! ✨</p></div>';
    return;
  }

  const linhas = dados.clientesInadimplentes.map(item => `
    <tr>
      <td>${item.cliente}</td>
      <td>R$ ${formatarMoeda(item.totalPendente)}</td>
      <td>${item.parcelasPendentes}</td>
      <td><span class="status-pendente">Acompanhamento necessário</span></td>
    </tr>
  `).join('');

  container.innerHTML = `
    <h3>⚠️ Clientes com Pendências</h3>
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Total Pendente</th>
          <th>Parcelas Pendentes</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;
}

// ============================================
// RENDERIZAR INDICADORES DETALHADOS
// ============================================
function renderizarIndicadoresDetalhados(dados) {
  const container = document.getElementById('indicadoresContainer');

  const totalVendido = dados.pagamentos.pago + dados.pagamentos.pendente;
  const taxaPagamento = totalVendido > 0 
    ? ((dados.pagamentos.pago / totalVendido) * 100)
    : 0;

  // Calcular dias médios de ciclo (simplificado)
  const diasCiclo = dados.vendas.length > 0 ? Math.round(30 / dados.vendas.length) : 0;
  
  // Valor médio de comissão por venda
  const comissaoPorVenda = dados.vendas.length > 0 ? dados.comissao / dados.vendas.length : 0;
  
  // Número de clientes únicos
  const clientesUnicos = new Set(dados.vendas.map(v => v.cliente)).size;
  
  // Maior e menor venda
  const maiorVenda = dados.vendas.length > 0 ? Math.max(...dados.vendas.map(v => v.valor)) : 0;
  const menorVenda = dados.vendas.length > 0 ? Math.min(...dados.vendas.map(v => v.valor)) : 0;

  const dinâmica = maiorVenda > 0 ? ((maiorVenda / menorVenda) - 1 * 100).toFixed(0) : 0;

  container.innerHTML = `
    <h3>📊 Indicadores Detalhados</h3>
    <table>
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Valor</th>
          <th>Análise</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Clientes Únicos</strong></td>
          <td>${clientesUnicos}</td>
          <td>Número de clientes diferentes atendidos</td>
        </tr>
        <tr>
          <td><strong>Maior Venda</strong></td>
          <td>R$ ${formatarMoeda(maiorVenda)}</td>
          <td>Maior ticket individual realizado</td>
        </tr>
        <tr>
          <td><strong>Menor Venda</strong></td>
          <td>R$ ${formatarMoeda(menorVenda)}</td>
          <td>Menor ticket individual realizado</td>
        </tr>
        <tr>
          <td><strong>Variação (Max/Min)</strong></td>
          <td>${dinâmica}%</td>
          <td>Variação entre maior e menor venda</td>
        </tr>
        <tr>
          <td><strong>Comissão por Venda</strong></td>
          <td>R$ ${formatarMoeda(comissaoPorVenda)}</td>
          <td>Comissão média por transação</td>
        </tr>
        <tr>
          <td><strong>Taxa de Conversão</strong></td>
          <td>${((dados.vendas.length / Math.max(clientesUnicos, 1)) * 100).toFixed(1)}%</td>
          <td>Média de vendas por cliente</td>
        </tr>
        <tr>
          <td><strong>Taxa de Recebimento</strong></td>
          <td>${taxaPagamento.toFixed(1)}%</td>
          <td>Percentual de valores já pagos</td>
        </tr>
        <tr>
          <td><strong>Inadimplência Crítica</strong></td>
          <td>${dados.clientesInadimplentes.length}</td>
          <td>Clientes com valores pendentes</td>
        </tr>
      </tbody>
    </table>
  `;
}

// ============================================
// RENDERIZAR ANÁLISE IA
// ============================================
async function renderizarAnaliseIA(dados) {
  const container = document.getElementById('analiseIAContainer');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Gerando análise de desempenho...</p></div>';

  try {
    const analise = gerarAnaliseProfissional(dados);
    
    container.innerHTML = `
      <div class="analise-ia">
        <h3>🤖 Análise de Desempenho (Inteligência Empresarial)</h3>
        <div class="analise-ia-conteudo">
          ${analise}
        </div>
      </div>
    `;
  } catch (erro) {
    console.error('❌ Erro ao gerar análise:', erro);
    container.innerHTML = '<div class="erro-mensagem">Erro ao gerar análise de desempenho</div>';
  }
}

// ============================================
// GERAR ANÁLISE PROFISSIONAL
// ============================================
function gerarAnaliseProfissional(dados) {
  const totalVendido = dados.pagamentos.pago + dados.pagamentos.pendente;
  const taxaPagamento = totalVendido > 0 
    ? ((dados.pagamentos.pago / totalVendido) * 100)
    : 0;

  const metaMinimaBatida = dados.totalVendido >= dados.metaMinima;
  const metaAlvoBatida = dados.totalVendido >= dados.metaAlvo;
  const ticketMedio = dados.vendas.length > 0 ? dados.totalVendido / dados.vendas.length : 0;

  let analise = '<div style="line-height: 1.8;">';

  // Parágrafo 1: Desempenho Geral
  analise += `<p><strong>1. DESEMPENHO GERAL:</strong><br>`;
  
  if (metaMinimaBatida && metaAlvoBatida) {
    analise += `${dados.nome} apresentou um desempenho excepcional neste período, superando tanto a meta mínima (${((dados.totalVendido / dados.metaMinima) * 100).toFixed(0)}%) quanto a meta alvo (${((dados.totalVendido / dados.metaAlvo) * 100).toFixed(0)}%). Com um volume total de <strong>R$ ${formatarMoeda(dados.totalVendido)}</strong> em vendas, o profissional demonstra consistência e capacidade de expansão, consolidando-se como um ativo estratégico da equipe comercial.`;
  } else if (metaMinimaBatida) {
    analise += `${dados.nome} atingiu a meta mínima (${((dados.totalVendido / dados.metaMinima) * 100).toFixed(0)}%), gerando <strong>R$ ${formatarMoeda(dados.totalVendido)}</strong> em vendas. Porém, ficou aquém da meta alvo (${((dados.totalVendido / dados.metaAlvo) * 100).toFixed(0)}%), sugerindo oportunidades para intensificar a prospecção e conversão de oportunidades.`;
  } else {
    analise += `${dados.nome} não atingiu a meta mínima neste período, com <strong>R$ ${formatarMoeda(dados.totalVendido)}</strong> gerados (${((dados.totalVendido / dados.metaMinima) * 100).toFixed(0)}% da meta). Recomenda-se uma análise técnica de obstáculos comerciais e reorientação estratégica da abordagem de vendas.`;
  }
  analise += '</p>';

  // Parágrafo 2: Qualidade das Vendas
  analise += `<p><strong>2. QUALIDADE DAS VENDAS:</strong><br>`;
  analise += `Foram realizadas <strong>${dados.vendas.length} transações</strong>, com ticket médio de <strong>R$ ${formatarMoeda(ticketMedio)}</strong>. `;
  
  if (dados.melhoresClientes.length > 0) {
    const melhorVenda = dados.melhoresClientes[0];
    analise += `A melhor venda foi direcionada ao cliente <strong>"${melhorVenda.cliente}"</strong> no valor de <strong>R$ ${formatarMoeda(melhorVenda.valor)}</strong>, demonstrando capacidade de fechamento de grandes operações. `;
  }
  
  analise += `A distribuição de vendas ${dados.melhoresClientes.length > 3 ? 'apresenta boa diversificação' : 'concentra-se em poucos clientes'}, o que ${dados.melhoresClientes.length > 3 ? 'reduz riscos de inadimplência' : 'sugere dependência comercial'}.`;
  analise += '</p>';

  // Parágrafo 3: Fluxo de Caixa e Recebimentos
  analise += `<p><strong>3. FLUXO DE CAIXA E RECEBIMENTOS:</strong><br>`;
  analise += `Taxa de recebimento: <strong>${taxaPagamento.toFixed(1)}%</strong> | Valor recebido: <strong>R$ ${formatarMoeda(dados.pagamentos.pago)}</strong> | Pendente: <strong>R$ ${formatarMoeda(dados.pagamentos.pendente)}</strong>. `;
  
  if (taxaPagamento >= 90) {
    analise += `Excelente desempenho no fluxo de caixa. A taxa de recebimento superior a 90% indica uma gestão eficiente de crédito e relacionamento com clientes, minimizando riscos de inadimplência.`;
  } else if (taxaPagamento >= 70) {
    analise += `Desempenho satisfatório. Com taxa de recebimento de ${taxaPagamento.toFixed(1)}%, há espaço para melhorias no follow-up de parcelas pendentes.`;
  } else {
    analise += `Taxa de recebimento abaixo do esperado. Recomenda-se intensificar cobranças e renegociações com clientes em atraso.`;
  }
  analise += '</p>';

  // Parágrafo 4: Carteira de Clientes
  analise += `<p><strong>4. GESTÃO DE CARTEIRA:</strong><br>`;
  analise += `Clientes atendidos: <strong>${dados.clientesAtendidos.size}</strong>. `;
  
  if (dados.clientesInadimplentes.length === 0) {
    analise += `Nenhum cliente em situação de inadimplência. Isso reflete um relacionamento comercial saudável e uma seleção apropriada do perfil de crédito.`;
  } else {
    analise += `${dados.clientesInadimplentes.length} cliente(s) com pendências totalizando <strong>R$ ${formatarMoeda(dados.clientesInadimplentes.reduce((a, c) => a + c.totalPendente, 0))}</strong>. Recomenda-se ação imediata de cobrança para recuperação desses valores.`;
  }
  analise += '</p>';

  // Parágrafo 5: Recomendações Finais
  analise += `<p><strong>5. RECOMENDAÇÕES FINAIS:</strong><br>`;
  
  if (metaAlvoBatida) {
    analise += `Manter a estratégia atual com foco em consolidação de relacionamentos e expansão da carteira de clientes. Considerar aumento de quotas de vendas e delegação de mentoria para novos vendedores.`;
  } else if (metaMinimaBatida) {
    analise += `Implementar ações estratégicas para atingir a meta alvo: (1) Revisar pipeline de oportunidades; (2) Aumentar frequência de prospecção ativa; (3) Focar em cross-selling e upselling com clientes existentes; (4) Analisar ciclo de vendas e gargalos.`;
  } else {
    analise += `Situação crítica requer intervenção imediata: (1) Análise técnica de causas de baixo desempenho; (2) Revisão de processo comercial; (3) Apoio gerencial intensivo; (4) Possível redefinição de targets ou mudança de categoria de vendedor.`;
  }
  analise += '</p>';

  analise += '</div>';
  
  return analise;
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function formatarMoeda(valor) {
  return parseFloat(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function obterNomeMes(mes) {
  const meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return meses[mes] || '';
}

function mostrarErro(mensagem) {
  const container = document.getElementById('conteudoPrincipal');
  container.innerHTML = `<div class="erro-mensagem">${mensagem}</div>`;
}
