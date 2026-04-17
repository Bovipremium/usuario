// ===== VARIÁVEIS GLOBAIS =====
let clienteId = null;
let clienteNome = null;
let clienteDados = null;
let produtos = [];
let parcelas = [];
let insumosDisponiveis = []; // NOVO: Carregar produtos disponíveis

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Inicializando página de venda...");
  
  // Obter ID do cliente de sessionStorage - pode vir de clientes-detalhes.html (clienteParaVenda) ou de clientes.html (clienteNovoId)
  let clienteObj = null;
  
  // Tentar carregar cliente completo (vindo de clientes-detalhes.html)
  const clienteParaVendaJson = sessionStorage.getItem('clienteParaVenda');
  if (clienteParaVendaJson) {
    try {
      clienteObj = JSON.parse(clienteParaVendaJson);
      clienteId = clienteObj.Id;
      clienteNome = clienteObj.Nome;
      clienteDados = clienteObj;
      console.log("✅ Cliente carregado de clienteParaVenda:", clienteObj);
    } catch (e) {
      console.error("❌ Erro ao parsear clienteParaVenda:", e);
    }
    // Limpar sessionStorage
    sessionStorage.removeItem('clienteParaVenda');
    sessionStorage.removeItem('clienteParaVendaId');
  }
  
  // Se não encontrou via clienteParaVenda, tentar via clienteNovoId (forma antiga)
  if (!clienteId) {
    clienteId = sessionStorage.getItem('clienteNovoId');
    clienteNome = sessionStorage.getItem('clienteNome');
  }
  
  if (!clienteId) {
    alert('❌ Erro: Cliente não identificado.');
    window.location.href = 'clientes.html';
    return;
  }
  
  console.log(`📦 Cliente: ${clienteNome} (ID: ${clienteId})`);
  document.getElementById('nomeCliente').textContent = clienteNome;
  
  // NOVO: Carregar produtos disponíveis
  await carregarInsumos();
  
  // ✅ NOVO: Carregar vendedores para o select
  await carregarVendedoresVenda();
  
  // Carregar dados do cliente (se ainda não foi carregado)
  if (!clienteDados) {
    await carregarClienteDados();
  }
  
  // Definir data padrão
  const hoje = new Date();
  document.getElementById('dataVenda').valueAsDate = hoje;
  
  // Adicionar primeiro produto vazio
  adicionarProduto();
  
  // Gerar parcelas
  gerarParcelas();
  
  // Listeners
  document.getElementById('formVenda').addEventListener('submit', handleFormSubmit);
  document.getElementById('tipoVenda').addEventListener('change', calcularResumo);
});

// ===== CARREGAR INSUMOS/PRODUTOS DISPONÍVEIS =====
async function carregarInsumos() {
  try {
    console.log("📦 Carregando produtos de insumos.json...");
    
    const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
    
    // Fazer requisição IGUAL ao admin
    const response = await fetch(
      `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.INSUMOS}&deviceId=${deviceId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let dados = await response.json();

    // Se for string, tenta parsear
    if (typeof dados === 'string') {
      try {
        dados = JSON.parse(dados);
      } catch (e) {
        dados = [];
      }
    }

    insumosDisponiveis = Array.isArray(dados) ? dados : [];
    
    console.log(`✅ ${insumosDisponiveis.length} produto(s) carregado(s)`);
    console.log("📦 Produtos disponíveis:", insumosDisponiveis);

  } catch (erro) {
    console.error("❌ Erro ao carregar insumos:", erro);
    insumosDisponiveis = [];
  }
}

// ===== ✅ CARREGAR VENDEDORES PARA SELECT =====
async function carregarVendedoresVenda() {
  try {
    console.log("📥 Carregando vendedores...");
    
    const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
    
    const response = await fetch(
      `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.USUARIOS}&deviceId=${deviceId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let dados = await response.json();

    if (typeof dados === 'string') {
      try {
        dados = JSON.parse(dados);
      } catch (e) {
        dados = [];
      }
    }

    const vendedores = Array.isArray(dados) ? dados : [];
    const selectVendedor = document.getElementById('vendedorVenda');
    
    if (vendedores.length === 0) {
      selectVendedor.innerHTML = '<option value="">Nenhum vendedor encontrado</option>';
      return;
    }

    // Preencher o select
    selectVendedor.innerHTML = '<option value="">-- Selecione um vendedor --</option>';
    
    vendedores.forEach(usuario => {
      if (usuario.Nome) {
        const option = document.createElement('option');
        option.value = usuario.Nome;
        option.textContent = usuario.Nome;
        selectVendedor.appendChild(option);
      }
    });

    // ✅ Pré-selecionar usuário logado
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    if (usuarioLogado) {
      try {
        const user = JSON.parse(usuarioLogado);
        const nomeUser = user.nome || user.Nome;
        if (nomeUser) {
          selectVendedor.value = nomeUser;
          console.log(`✅ Vendedor pré-selecionado: ${nomeUser}`);
        }
      } catch (e) {
        console.warn('Erro ao parsear usuário logado');
      }
    }

    console.log(`✅ ${vendedores.length} vendedor(es) carregado(s)`);

  } catch (erro) {
    console.error("❌ Erro ao carregar vendedores:", erro);
    const selectVendedor = document.getElementById('vendedorVenda');
    selectVendedor.innerHTML = '<option value="">Erro ao carregar vendedores</option>';
  }
}

// ===== CARREGAR DADOS DO CLIENTE =====
async function carregarClienteDados() {
  try {
    console.log(`🔍 Procurando cliente ID: ${clienteId}`);
    
    // Carregar clientes do Drive (MESMA FORMA DO ADMIN)
    const clientes = await carregarClientesDrive();
    const clientesList = Array.isArray(clientes) ? clientes : [];
    
    console.log(`📊 ${clientesList.length} cliente(s) carregado(s)`);
    
    clienteDados = clientesList.find(c => c.Id == clienteId);
    
    if (!clienteDados) {
      throw new Error(`Cliente ${clienteId} não encontrado`);
    }
    
    console.log("✅ Dados do cliente carregados:", clienteDados);
    console.log(`   📝 Nome: ${clienteDados.Nome}`);
    console.log(`   🏷️ Vendedor: ${clienteDados.Vendedor || clienteDados.vendedor || '⚠️ NÃO ENCONTRADO'}`);
    console.log(`   📞 Telefone: ${clienteDados.Telefone1}`);
  } catch (erro) {
    console.error("❌ Erro ao carregar cliente:", erro);
    alert(`❌ Erro: ${erro.message}`);
    // Voltar para clientes após 2 segundos
    setTimeout(() => {
      window.location.href = 'index.html?tipo=clientes';
    }, 2000);
  }
}

// ===== ADICIONAR PRODUTO =====
function adicionarProduto(produto = {}) {
  const idProduto = 'prod_' + Date.now() + Math.random();
  
  // Criar opções do select com produtos
  let opcoesHtml = '<option value="">-- Selecione um produto --</option>';
  insumosDisponiveis.forEach(insumo => {
    const selecionado = produto.Nome === insumo.Nome ? 'selected' : '';
    opcoesHtml += `<option value="${insumo.Id}" ${selecionado}>${insumo.Nome}</option>`;
  });
  
  const novaLinha = document.createElement('tr');
  novaLinha.id = idProduto;
  novaLinha.innerHTML = `
    <td>
      <select class="produto-nome" onchange="preencherDadosProduto('${idProduto}')">
        ${opcoesHtml}
      </select>
    </td>
    <td style="width: 100px; text-align: center;">
      <input type="number" class="produto-quantidade" placeholder="0" value="${produto.Quantidade || 1}" min="0" step="0.01" onchange="calcularResumo()">
    </td>
    <td style="width: 100px; text-align: center;">
      <input type="text" class="produto-unidade" placeholder="UN" value="${produto.Unidade || ''}" readonly>
    </td>
    <td style="width: 110px; text-align: center;">
      <input type="number" class="produto-peso" placeholder="0" value="${produto.PesoUnidade || 0}" step="0.01" onchange="calcularResumo()">
    </td>
    <td style="width: 120px; text-align: right;">
      <input type="number" class="produto-valor" placeholder="0.00" value="${produto.Valor || 0}" step="0.01" onchange="calcularResumo()" style="text-align: right;">
    </td>
    <td style="width: 120px; text-align: right;">
      <span class="produto-total">R$ 0,00</span>
    </td>
    <td style="width: 90px; text-align: center;">
      <input type="text" class="produto-ncm" placeholder="NCM" value="${produto.NCM || ''}" maxlength="8" readonly>
    </td>
    <td style="width: 60px; text-align: center;">
      <button type="button" class="btn btn-danger" onclick="removerProduto('${idProduto}')">
        🗑️
      </button>
    </td>
  `;
  
  document.getElementById('corpoTabela').appendChild(novaLinha);
  
  // Guardar referência do objeto
  const lineObj = {
    id: idProduto,
    nome: novaLinha.querySelector('.produto-nome'),
    quantidade: novaLinha.querySelector('.produto-quantidade'),
    unidade: novaLinha.querySelector('.produto-unidade'),
    peso: novaLinha.querySelector('.produto-peso'),
    valor: novaLinha.querySelector('.produto-valor'),
    ncm: novaLinha.querySelector('.produto-ncm'),
    total: novaLinha.querySelector('.produto-total')
  };
  
  produtos.push(lineObj);
  
  calcularResumo();
}

// ===== PREENCHER DADOS DO PRODUTO (QUANDO SELECIONA) =====
function preencherDadosProduto(idProduto) {
  const linha = document.getElementById(idProduto);
  const selectNome = linha.querySelector('.produto-nome');
  const insumoId = selectNome.value;
  
  if (!insumoId) {
    // Limpar campos se não selecionou
    linha.querySelector('.produto-unidade').value = '';
    linha.querySelector('.produto-peso').value = 0;
    linha.querySelector('.produto-ncm').value = '';
    return;
  }
  
  // Encontrar o insumo selecionado
  const insumoSelecionado = insumosDisponiveis.find(i => i.Id == insumoId);
  
  if (insumoSelecionado) {
    console.log(`📦 Produto selecionado:`, insumoSelecionado);
    
    // Preencher campos automaticamente
    linha.querySelector('.produto-unidade').value = insumoSelecionado.Unidade || 'UN';
    linha.querySelector('.produto-peso').value = insumoSelecionado.Peso || 0;
    linha.querySelector('.produto-ncm').value = insumoSelecionado.CodigoProduto || '';
    
    console.log(`✅ Dados preenchidos: Unidade=${insumoSelecionado.Unidade}, Peso=${insumoSelecionado.Peso}`);
  }
  
  calcularResumo();
}

// ===== REMOVER PRODUTO =====
function removerProduto(idProduto) {
  document.getElementById(idProduto).remove();
  produtos = produtos.filter(p => p.id !== idProduto);
  calcularResumo();
}

// ===== GERAR PARCELAS =====
function gerarParcelas() {
  const numeroParcelas = parseInt(document.getElementById('numeroParcelas').value) || 1;
  const tipoVenda = document.getElementById('tipoVenda').value;
  
  // ⚠️ IMPORTANTE: Detectar se há uma primeira parcela já digitada
  // Se o usuário já digitou a primeira data e depois muda numeroParcelas,
  // devemos MANTER a primeira data e gerar as próximas a partir dela
  let dataPrimeiraParcelaNova = null;
  const parcelasExistentes = document.querySelectorAll('#corpoParcelasTabela tr');
  
  if (parcelasExistentes.length > 0) {
    // Já existem parcelas, preserve a primeira
    const primeiraLinha = parcelasExistentes[0];
    const inputDataPrimeira = primeiraLinha.querySelector('.parcela-data');
    if (inputDataPrimeira && inputDataPrimeira.value) {
      // Parsear a data da forma correta (YYYY-MM-DD é local, não UTC)
      const [ano, mes, dia] = inputDataPrimeira.value.split('-');
      dataPrimeiraParcelaNova = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    }
  }
  
  // Se não encontrou primeira data customizada, usar "hoje"
  if (!dataPrimeiraParcelaNova) {
    const hoje = new Date();
    dataPrimeiraParcelaNova = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  }
  
  parcelas = [];
  const corpo = document.getElementById('corpoParcelasTabela');
  corpo.innerHTML = '';
  
  for (let i = 1; i <= numeroParcelas; i++) {
    // ✅ CORRIGIDO: Usar método correto para adicionar meses (não apenas days)
    // Começar a partir de dataPrimeiraParcelaNova
    const dataParcela = new Date(dataPrimeiraParcelaNova);
    
    // Adicionar (i-1) meses + guardar o dia original
    const diaOriginal = dataPrimeiraParcelaNova.getDate();
    dataParcela.setMonth(dataParcela.getMonth() + (i - 1));
    
    // Se o mês tem menos dias, ajustar (ex: jan 31 + 1 mês = fev 28/29)
    const ultimoDiaDoMes = new Date(dataParcela.getFullYear(), dataParcela.getMonth() + 1, 0).getDate();
    if (diaOriginal > ultimoDiaDoMes) {
      dataParcela.setDate(ultimoDiaDoMes);
    } else {
      dataParcela.setDate(diaOriginal);
    }
    
    const idParcela = 'parc_' + i;
    
    const novaLinha = document.createElement('tr');
    novaLinha.id = idParcela;
    novaLinha.innerHTML = `
      <td>${i}/${numeroParcelas}</td>
      <td>
        <input type="date" class="parcela-data" value="${dataParcela.toISOString().split('T')[0]}" required>
      </td>
      <td style="text-align: right;">
        <input type="number" class="parcela-valor" placeholder="0.00" value="0" step="0.01" required style="text-align: right; width: 120px;">
      </td>
      <td>
        <select class="parcela-status">
          <option value="false" selected>Pendente</option>
          <option value="true">Pago</option>
        </select>
      </td>
    `;
    
    corpo.appendChild(novaLinha);
    
    parcelas.push({
      numero: i,
      id: idParcela,
      data: novaLinha.querySelector('.parcela-data'),
      valor: novaLinha.querySelector('.parcela-valor'),
      status: novaLinha.querySelector('.parcela-status')
    });
  }
  
  calcularResumo();
}

// ===== CALCULAR RESUMO =====
function calcularResumo() {
  let valorTotal = 0;
  
  // Calcular valor total dos produtos
  produtos.forEach(prod => {
    const qtd = parseFloat(prod.quantidade.value) || 0;
    const valor = parseFloat(prod.valor.value) || 0;
    const total = qtd * valor;
    
    prod.total.textContent = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    valorTotal += total;
  });
  
  // Distribuir valor nas parcelas
  const numeroParcelas = parcelas.length;
  if (numeroParcelas > 0) {
    const valorPorParcela = valorTotal / numeroParcelas;
    
    parcelas.forEach((parc, index) => {
      if (index === numeroParcelas - 1) {
        // Última parcela pega o arredondamento
        parc.valor.value = (valorTotal - (valorPorParcela * (numeroParcelas - 1))).toFixed(2);
      } else {
        parc.valor.value = valorPorParcela.toFixed(2);
      }
    });
  }
  
  // Atualizar resumo
  document.getElementById('resumoVenda').innerHTML = `
    <div class="resumo-box">
      <div class="resumo-box-label">Total de Produtos</div>
      <div class="resumo-box-valor">${produtos.length}</div>
    </div>
    <div class="resumo-box">
      <div class="resumo-box-label">Valor Total</div>
      <div class="resumo-box-valor">R$ ${valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
    </div>
    <div class="resumo-box">
      <div class="resumo-box-label">Parcelas</div>
      <div class="resumo-box-valor">${numeroParcelas}x</div>
    </div>
  `;
}

// ===== HANDLE FORM SUBMIT =====
async function handleFormSubmit(e) {
  e.preventDefault();
  
  console.log("🔄 INÍCIO: Validando venda...");
  
  // Validações
  if (produtos.length === 0 || !produtos.some(p => p.nome.value.trim())) {
    mostrarAlert('error', '❌ Adicione pelo menos um produto!');
    return;
  }
  
  try {
    // show loader during save
    console.log("📡 Mostrando loader...");
    const loaderEl = document.getElementById('loaderContainer');
    if (loaderEl) loaderEl.classList.remove('hidden');
    
    // Montar objeto de venda
    const novaVenda = montarObjVenda();
    console.log("✅ Venda montada:", novaVenda);
    
    // Buscar clientes
    console.log("📥 Carregando clientes do Drive...");
    let clientes = await carregarClientesDrive();
    clientes = Array.isArray(clientes) ? clientes : [];
    console.log(`✅ ${clientes.length} cliente(s) carregado(s)`);
    
    // Encontrar cliente e adicionar venda
    const indexCliente = clientes.findIndex(c => c.Id == clienteId);
    if (indexCliente === -1) {
      throw new Error(`Cliente ID ${clienteId} não encontrado entre ${clientes.length} registros`);
    }
    
    console.log(`✅ Cliente encontrado no índice ${indexCliente}: ${clientes[indexCliente].Nome}`);
    
    // Inicializar array de vendas se não existir
    if (!clientes[indexCliente].Vendas) {
      clientes[indexCliente].Vendas = [];
      console.log("✅ Array Vendas inicializado");
    }
    
    // Atribuir número sequencial
    novaVenda.NumeroVenda = (clientes[indexCliente].Vendas ? clientes[indexCliente].Vendas.length : 0) + 1;
    console.log(`✅ Número da venda atribuído: ${novaVenda.NumeroVenda}`);
    
    // Adicionar venda ao cliente
    clientes[indexCliente].Vendas.push(novaVenda);
    clientes[indexCliente].NumeroVendas = clientes[indexCliente].Vendas.length;
    console.log(`✅ Venda adicionada. Total de vendas do cliente: ${clientes[indexCliente].NumeroVendas}`);
    
    // Salvar
    console.log("📤 Iniciando salvar clientes no Drive...");
    const salvoComSucesso = await salvarClientesDrive(clientes);
    
    if (!salvoComSucesso) {
      throw new Error("Falha ao salvar venda no Drive - API retornou false");
    }
    
    console.log(`✅ SUCESSO: Venda salva! ID do cliente: ${clienteId}, NumeroVenda: ${novaVenda.NumeroVenda}`);
    
    // 📋 REGISTRAR EM AUDITORIA
    if (typeof registrarCriacaoVenda === 'function') {
      await registrarCriacaoVenda(novaVenda);
    }
    
    // Mostrar sucesso (loader ficará visível até a etapa de impressão)
    mostrarAlert('success', `✅ Venda #${novaVenda.NumeroVenda} salva com sucesso!`);

    // Aguardar e abrir diálogo de impressão (manter loader até a impressão iniciar)
    setTimeout(() => {
      abrirDialogoImpressao(clientes[indexCliente], novaVenda);
    }, 800);
    
  } catch (erro) {
    console.error("❌ ERRO ao salvar venda:", erro);
    console.error("Stack trace:", erro.stack);
    
    const loaderEl = document.getElementById('loaderContainer');
    if (loaderEl) loaderEl.classList.add('hidden');
    
    mostrarAlert('error', `❌ Erro: ${erro.message}`);
  }
}

// ===== MONTAR OBJETO VENDA =====
function montarObjVenda() {
  const formData = new FormData(document.getElementById('formVenda'));
  
  // Montar array de produtos
  const produtosArray = produtos
    .filter(p => p.nome.value.trim())
    .map(p => {
      // Procurar o insumo para pegar o nome completo
      const insumoId = p.nome.value;
      const insumo = insumosDisponiveis.find(i => i.Id == insumoId);
      const nomeProduto = insumo ? insumo.Nome : p.nome.value;
      
      return {
        InsumoId: parseInt(insumoId) || 0,
        Nome: nomeProduto,
        Quantidade: parseFloat(p.quantidade.value) || 0,
        Unidade: p.unidade.value.trim() || 'UN',
        PesoUnidade: parseFloat(p.peso.value) || 0,
        Valor: parseFloat(p.valor.value) || 0,
        ValorUnitario: 0,
        NCM: p.ncm.value.trim() || '00000000',
        CSOSN_CST: '102',
        CFOP: '5102',
        CodigoInterno: '',
        DescricaoDetalhada: ''
      };
    });
  
  // Montar array de parcelas (com mesma correção de fuso horário)
  const parcelasArray = parcelas.map(parc => {
    const dataParc = parc.data.value;
    if (!dataParc) return null;
    
    const [anoParc, mesParc, diaParc] = dataParc.split('-');
    const dataParcelaLocal = new Date(parseInt(anoParc), parseInt(mesParc) - 1, parseInt(diaParc));
    const dataParcelaISO = dataParcelaLocal.toISOString();
    
    return {
      DataVencimento: dataParcelaISO,
      Valor: parseFloat(parc.valor.value) || 0,
      Pago: parc.status.value === 'true',
      DataPagamento: parc.status.value === 'true' ? new Date().toISOString() : null
    };
  }).filter(p => p !== null);
  
  const valorTotal = produtosArray.reduce((sum, p) => sum + (p.Quantidade * p.Valor), 0);
  
  console.log("🛒 Montando objeto da venda:");
  console.log(`   Vendedor (do cliente): ${clienteDados?.Vendedor || clienteDados?.vendedor || 'NÃO ENCONTRADO'}`);
  console.log(`   ValorTotal: R$ ${valorTotal}`);
  console.log(`   Produtos: ${produtosArray.length}`);
  console.log(`   Parcelas: ${parcelasArray.length}`);
  
  // ⚠️ CORREÇÃO DE FUSO HORÁRIO: A data YYYY-MM-DD precisa ser interpretada como local, não UTC
  const dataVendaStr = formData.get('dataVenda');
  const [ano, mes, dia] = dataVendaStr.split('-');
  const dataVendaLocal = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
  const dataVendaISO = dataVendaLocal.toISOString();
  
  console.log(`📅 Data da venda processada:`);
  console.log(`   String do formulário: ${dataVendaStr}`);
  console.log(`   Data local criada: ${dataVendaLocal.toLocaleDateString('pt-BR')}`);
  console.log(`   ISO para salvar: ${dataVendaISO}`);
  console.log(`   Mês/Ano (para comissão): ${parseInt(mes)}/${ano}`);

  return {
    Id: 0,
    NumeroNF: formData.get('numeroNF').trim(),
    QuantidadeAnimais: parseInt(formData.get('quantidadeAnimais')) || 0,
    Produtos: produtosArray,
    Vendedor: clienteDados?.Vendedor || clienteDados?.vendedor || 'Desconhecido',
    VendedorVenda: formData.get('vendedorVenda').trim() || 'Desconhecido', // ✅ NOVO: Vendedor que efetua a venda
    ValorTotal: Math.round(valorTotal * 100) / 100,
    TipoVenda: formData.get('tipoVenda').trim() || '',
    NumeroParcelas: parcelas.length,
    Parcelas: parcelasArray,
    DataVenda: dataVendaISO,
    ObservacaoPreparo: formData.get('observacaoPreparo').trim() || ''
  };
}

// ===== MOSTRAR ALERT =====
function mostrarAlert(tipo, mensagem) {
  const container = document.getElementById('alertContainer');
  container.innerHTML = `
    <div class="alert ${tipo} show">
      ${mensagem}
    </div>
  `;
}

// ===== ABRIR DIÁLOGO DE IMPRESSÃO =====
function abrirDialogoImpressao(cliente, venda) {
  const deseja = confirm('✅ Venda salva! Deseja imprimir o comprovante?');
  if (!deseja) {
    // usuário cancelou: esconder loader e voltar
    if (typeof hideLoader === 'function') hideLoader();
    setTimeout(() => {
      window.location.href = 'clientes.html';
    }, 400);
    return;
  }

  // usuário optou por imprimir: chamar função de impressão (ela ocultará o loader quando o iframe carregar)
  imprimirComprovante(cliente, venda);
}

// ===== IMPRIMIR COMPROVANTE (PROFISSIONAL) =====
function imprimirComprovante(cliente, venda) {
  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const valorTotal = venda.Produtos ? venda.Produtos.reduce((sum, p) => sum + (p.Quantidade * p.Valor), 0) : 0;
  
  let htmlProdutos = '';
  if (venda.Produtos && venda.Produtos.length > 0) {
    // Calcular totais
    let totalQtd = 0;
    let totalPeso = 0;
    let totalValor = 0;
    
    const linhasProdutos = venda.Produtos.map(p => {
      const qtd = parseFloat(p.Quantidade) || 0;
      const peso = parseFloat(p.PesoUnidade) || 0;
      const valor = parseFloat(p.Valor) || 0;
      const subtotal = qtd * valor;
      
      totalQtd += qtd;
      totalPeso += peso;
      totalValor += subtotal;
      
      return `
      <tr>
        <td style="width: 40%; padding: 8px; border-bottom: 1px solid #ecf0f1;">${p.Nome || ''}</td>
        <td style="text-align: center; width: 10%; padding: 8px; border-bottom: 1px solid #ecf0f1;">${qtd}</td>
        <td style="text-align: center; width: 10%; padding: 8px; border-bottom: 1px solid #ecf0f1;">${p.Unidade || ''}</td>
        <td style="text-align: center; width: 10%; padding: 8px; border-bottom: 1px solid #ecf0f1;">${peso.toLocaleString('pt-BR')} kg</td>
        <td style="text-align: right; width: 15%; padding: 8px; border-bottom: 1px solid #ecf0f1;">R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        <td style="text-align: right; width: 15%; padding: 8px; border-bottom: 1px solid #ecf0f1; font-weight: bold;">R$ ${subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
      </tr>
    `;
    }).join('');
    
    // Adicionar rodapé com totalizações
    const rodape = `
      <tr style="background: #f0f0f0; border-top: 2px solid #1fa37a; font-weight: bold;">
        <td style="width: 40%; padding: 10px 8px; text-align: right; color: #1fa37a;">TOTAL:</td>
        <td style="text-align: center; width: 10%; padding: 10px 8px; color: #1fa37a;">${totalQtd.toLocaleString('pt-BR')}</td>
        <td style="text-align: center; width: 10%; padding: 10px 8px; color: #1fa37a;">-</td>
        <td style="text-align: center; width: 10%; padding: 10px 8px; color: #1fa37a;">${totalPeso.toLocaleString('pt-BR')}</td>
        <td style="text-align: right; width: 15%; padding: 10px 8px; color: #1fa37a;">-</td>
        <td style="text-align: right; width: 15%; padding: 10px 8px; color: #1fa37a; font-size: 14px;">R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
      </tr>
    `;
    
    htmlProdutos = linhasProdutos + rodape;
  }
  
  let htmlParcelas = '';
  if (venda.Parcelas && venda.Parcelas.length > 0) {
    htmlParcelas = venda.Parcelas.map((p, i) => {
      const dataParcela = new Date(p.DataVencimento);
      const isPago = p.Pago === true || p.Pago === 'true' || p.Pago === 1;
      return `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #ecf0f1; text-align: center;"><strong>${i + 1}/${venda.Parcelas.length}</strong></td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #ecf0f1;">${dataParcela.toLocaleDateString('pt-BR')}</td>
          <td style="text-align: right; padding: 12px 8px; border-bottom: 1px solid #ecf0f1; font-weight: bold;">R$ ${(parseFloat(p.Valor) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
          <td style="text-align: center; padding: 12px 8px; border-bottom: 1px solid #ecf0f1;">
            <span style="color: ${isPago ? '#27ae60' : '#e74c3c'}; font-weight: bold; padding: 4px 8px; background: ${isPago ? '#ecfdf5' : '#ffecec'}; border-radius: 3px;">
              ${isPago ? '✅ PAGO' : '⏳ PENDENTE'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  const htmlImpressao = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Comprovante de Venda - ${venda.NumeroNF || 'N/A'}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
          background: white;
          color: #333;
          line-height: 1.6;
        }
        
        .container {
          max-width: 100%;
        }
        
        @page { size: A4; margin: 10mm; }
        .cabecalho {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid #1fa37a;
        }

        .cabecalho-logo img { height: 64px; object-fit: contain; }

        .cabecalho-empresa {
          font-size: 14px;
          font-weight: 700;
          color: #1fa37a;
          margin-bottom: 2px;
        }

        .cabecalho-info {
          font-size: 11px;
          line-height: 1.4;
          color: #666;
        }
        
        .secao-titulo {
          background: linear-gradient(135deg, #1fa37a 0%, #15a566 100%);
          color: white;
          padding: 12px 16px;
          margin-top: 20px;
          margin-bottom: 15px;
          font-weight: bold;
          font-size: 14px;
          border-radius: 4px;
          text-decoration: underline;
          text-decoration-thickness: 2px;
          text-underline-offset: 5px;
        }
        
        .info-venda {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
          font-size: 11px;
        }
        
        .info-box {
          background: #f5f5f5;
          padding: 12px;
          border-left: 4px solid #1fa37a;
          border-radius: 2px;
        }
        
        .info-box-label {
          font-weight: bold;
          color: #1fa37a;
          display: block;
          margin-bottom: 4px;
        }
        
        .info-box-valor {
          color: #333;
          font-size: 13px;
        }
        
        .cliente-info {
          font-size: 12px;
          line-height: 1.8;
          margin-bottom: 15px;
        }
        
        .cliente-info-linha {
          display: flex;
          gap: 8px;
          margin-bottom: 6px;
        }
        
        .cliente-info-label {
          font-weight: bold;
          color: #1fa37a;
        }
        
        .cliente-info-valor {
          color: #333;
        }
        
        table {
          width: 100%;
          font-size: 12px;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        table thead {
          background: #ecf0f1;
          border-top: 2px solid #1fa37a;
          border-bottom: 2px solid #1fa37a;
        }
        
        table th {
          padding: 12px 8px;
          text-align: left;
          font-weight: bold;
          color: #1fa37a;
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 3px;
        }
        
        table tbody tr:last-child td {
          border-bottom: 2px solid #1fa37a;
        }
        
        .resumo {
          background: linear-gradient(135deg, #f0f9f7 0%, #e8f5f2 100%);
          padding: 10px;
          margin: 10px 0;
          border: 1px solid #1fa37a;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .resumo-linha {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #ddd;
        }
        
        .resumo-linha:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        
        .resumo-label {
          font-weight: bold;
          color: #333;
        }
        
        .resumo-valor {
          color: #1fa37a;
          font-weight: bold;
          font-size: 14px;
        }
        
        .resumo-total {
          font-size: 16px;
          color: #1fa37a;
          padding-top: 10px;
          border-top: 2px solid #1fa37a !important;
          margin-top: 10px !important;
          padding-bottom: 0 !important;
          margin-bottom: 0 !important;
          border-bottom: none !important;
        }
        
        .observacao {
          background: #fffacd;
          border: 2px solid #f0c674;
          padding: 12px;
          margin-top: 15px;
          font-size: 11px;
          border-radius: 4px;
          line-height: 1.6;
        }
        
        .observacao-titulo {
          font-weight: bold;
          color: #ff6b35;
          margin-bottom: 5px;
        }
        
        .rodape {
          text-align: center;
          font-size: 11px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #1fa37a;
          line-height: 1.8;
          color: #666;
        }
        
        .rodape-emoji {
          font-size: 14px;
          margin-bottom: 5px;
        }
        
        .data-emissao {
          text-align: right;
          font-size: 11px;
          color: #999;
          margin-bottom: 10px;
          font-style: italic;
        }
        
        @media print {
          body {
            max-width: 100%;
            margin: 0;
            padding: 0;
          }
          
          .container {
            max-width: 100%;
          }
        }
        
        @media screen and (max-width: 600px) {
          body {
            padding: 10px;
          }
          
          .info-venda {
            grid-template-columns: 1fr;
          }
          
          .cliente-info-linha {
            grid-template-columns: 120px 1fr;
            font-size: 11px;
          }
          
          table {
            font-size: 11px;
          }
          
          table th,
          table td {
            padding: 8px 4px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- CABEÇALHO -->
        <div class="cabecalho">
          <div class="cabecalho-logo"><img src="assets/img/logo.png" alt="Logo" /></div>
          <div>
            <div class="cabecalho-empresa">COMPROVANTE DE VENDA</div>
            <div class="cabecalho-info"><strong> BOVI PREMIUM NUTRIÇÅO ANIMAL */</strong> &nbsp;|&nbsp; CNPJ: 55.951.841/1000-76</div>
          </div>
        </div>
        
        <div class="data-emissao">Emitido em: ${dataAtual}</div>
        
        <!-- DADOS DA VENDA -->
        <div class="info-venda">
          <div class="info-box">
            <span class="info-box-label">Número da NF</span>
            <span class="info-box-valor">${venda.NumeroNF || 'N/A'}</span>
          </div>
          <div class="info-box">
            <span class="info-box-label">Data da Venda</span>
            <span class="info-box-valor">${new Date(venda.DataVenda).toLocaleDateString('pt-BR')}</span>
          </div>
            <div class="info-box">
              <span class="info-box-label">Nº da Venda</span>
              <span class="info-box-valor">${venda.NumeroVenda || venda.NumeroSequencia || '—'}</span>
            </div>
          <div class="info-box">
            <span class="info-box-label">Tipo de Venda</span>
            <span class="info-box-valor">${venda.TipoVenda || 'N/A'}</span>
          </div>
          <div class="info-box">
            <span class="info-box-label">Quantidade de Animais</span>
            <span class="info-box-valor">${venda.QuantidadeAnimais || 0}</span>
          </div>
        </div>
        
        <!-- DADOS DO CLIENTE -->
        <div class="secao-titulo">👤 DADOS DO CLIENTE</div>
  <div class="cliente-info">
  <div class="cliente-info-linha"><strong>Nome:</strong> ${cliente.Nome || 'N/A'}</div>
          <div class="cliente-info-linha"><strong>CPF/CNPJ:</strong> ${cliente.CPF || 'N/A'}</div>
  <div class="cliente-info-linha"><strong>Representante:</strong> ${cliente.RepresentanteNome || ''} ${cliente.RepresentanteCPF ? '('+cliente.RepresentanteCPF+')' : ''}</div>
  <div class="cliente-info-linha"><strong>Mídia/Origem:</strong> ${cliente.Midia || 'N/A'}</div>
          <div class="cliente-info-linha"><strong>Inscrição:</strong> ${cliente.Inscricao || 'N/A'}</div>
          <div class="cliente-info-linha"><strong>Endereço:</strong> ${cliente.Endereco || ''} ${cliente.NumeroEndereco || ''} ${cliente.ComplementoEndereco || ''}</div>
          <div class="cliente-info-linha"><strong>Bairro:</strong> ${cliente.Bairro || 'N/A'} &nbsp; <strong>CEP:</strong> ${cliente.CEP || 'N/A'}</div>
          <div class="cliente-info-linha"><strong>Cidade/Estado:</strong> ${cliente.Cidade || 'N/A'}, ${cliente.Estado || 'N/A'}</div>
          <div class="cliente-info-linha"><strong>Telefone:</strong> ${cliente.Telefone1 || 'N/A'} &nbsp; <strong>Tel2:</strong> ${cliente.Telefone2 || ''}</div>
          <div class="cliente-info-linha"><strong>E-mail:</strong> ${cliente.Email || 'N/A'}</div>
          <div class="cliente-info-linha"><strong>Vendedor:</strong> <strong>${cliente.Vendedor || 'N/A'}</strong></div>
        </div>
        
        <!-- PRODUTOS -->
        <div class="secao-titulo">📦 PRODUTOS</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40%;">Descrição</th>
              <th style="text-align: center; width: 10%;">Qtd</th>
              <th style="text-align: center; width: 10%;">Unidade</th>
              <th style="text-align: center; width: 10%;">Peso (KG)</th>
              <th style="text-align: right; width: 15%;">Valor Unit.</th>
              <th style="text-align: right; width: 15%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${htmlProdutos || '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum produto registrado</td></tr>'}
          </tbody>
        </table>
        
        <!-- PARCELAS -->
        <div class="secao-titulo">💳 FORMAS DE PAGAMENTO</div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">Parc.</th>
              <th>Vencimento</th>
              <th style="text-align: right;">Valor</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${htmlParcelas || '<tr><td colspan="4" style="text-align: center; padding: 20px;">Nenhuma parcela registrada</td></tr>'}
          </tbody>
        </table>
        
        <!-- RESUMO -->
        <div class="resumo">
          <div class="resumo-linha">
            <span class="resumo-label">Subtotal:</span>
            <span class="resumo-valor">R$ ${valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
          </div>
          <div class="resumo-linha">
            <span class="resumo-label">Quantidade de Parcelas:</span>
            <span class="resumo-valor">${venda.NumeroParcelas || 1}x</span>
          </div>
          <div class="resumo-linha resumo-total">
            <span class="resumo-label">VALOR TOTAL:</span>
            <span class="resumo-valor" style="font-size: 18px;">R$ ${valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
          </div>
        </div>
        
        ${venda.ObservacaoPreparo ? `
          <div class="observacao">
            <div class="observacao-titulo">📝 OBSERVAÇÕES:</div>
            ${venda.ObservacaoPreparo}
          </div>
        ` : ''}
        
        <!-- RODAPÉ -->
        <div class="rodape">
          <div class="rodape-emoji">✅ 📄 ✅</div>
          <div>Documento emitido automaticamente pelo sistema</div>
          <div style="margin-top: 10px; font-size: 10px;">Obrigado pela preferência!</div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Criar iframe oculta para impressão (mais segura que window.open)
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.id = 'framePrint_' + Date.now();
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(htmlImpressao);
  iframeDoc.close();
  
  // Esperar carregar e imprimir
  iframe.onload = function() {
    setTimeout(() => {
      try {
        // Esconder loader apenas quando o documento de impressão estiver pronto
        if (typeof hideLoader === 'function') hideLoader();

        iframe.contentWindow.print();
        
        // Remover iframe após imprimir
        iframe.onafterprint = () => {
          document.body.removeChild(iframe);
          window.location.href = 'clientes.html';
        };
        
        // Se onafterprint não funcionar, remover após delay
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
            window.location.href = 'clientes.html';
          }
        }, 2000);
        
      } catch (e) {
        console.error('Erro ao imprimir:', e);
        document.body.removeChild(iframe);
        mostrarAlert('error', '❌ Erro ao imprimir: ' + e.message);
      }
    }, 500);
  };
}

// ===== VOLTAR =====
function goBack() {
  if (confirm('Deseja voltar? Os dados não salvos serão perdidos.')) {
    sessionStorage.removeItem('clienteNovoId');
    sessionStorage.removeItem('clienteNome');
    window.location.href = 'clientes.html';
  }
}

// ===== CARREGAR CLIENTES DO DRIVE (MESMA FORMA DO ADMIN) =====
async function carregarClientesDrive() {
  try {
    const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
    
    // Fazer requisição IGUAL ao admin
    const response = await fetch(
      `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.CLIENTES}&deviceId=${deviceId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let dados = await response.json();
    console.log("📥 Clientes carregados:", dados);

    // Se for string, tenta parsear
    if (typeof dados === 'string') {
      try {
        dados = JSON.parse(dados);
      } catch (e) {
        dados = [];
      }
    }

    return Array.isArray(dados) ? dados : [];

  } catch (erro) {
    console.error("❌ Erro ao carregar clientes:", erro);
    return [];
  }
}

// ===== SALVAR CLIENTES NO DRIVE (MESMA FORMA DO ADMIN) =====
async function salvarClientesDrive(clientes) {
  try {
    const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
    const dadosJson = JSON.stringify(clientes);

    console.log('📤 Enviando dados para salvar:', {
      acao: 'salvar',
      arquivo: CONFIG.ARQUIVOS.CLIENTES,
      tamanhoDados: dadosJson.length,
      clientesCount: clientes.length
    });

    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'acao': 'salvar',
        'arquivo': CONFIG.ARQUIVOS.CLIENTES,
        'dados': dadosJson,
        'deviceId': deviceId
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    let resultado;
    try {
      resultado = await response.json();
    } catch (e) {
      // Se não for JSON válido, trata como sucesso se resposta for OK
      const texto = await response.text();
      console.log('⚠️ Resposta não JSON:', texto);
      resultado = { success: true, mensagem: texto };
    }

    console.log('📤 Resultado salvar:', resultado);

    // Checar de múltiplas formas se foi sucesso
    const foiSucesso = resultado.success === true || 
                       resultado.success === 'true' || 
                       resultado.sucesso === true ||
                       resultado.mensagem === 'Arquivo salvo com sucesso' ||
                       !resultado.erro;

    if (foiSucesso) {
      console.log('✅ Clientes salvos com sucesso!');
      return true;
    } else {
      console.error('❌ Falha ao salvar clientes:', resultado);
      return false;
    }

  } catch (erro) {
    console.error('❌ Erro ao salvar clientes no Drive:', erro);
    return false;
  }
}
