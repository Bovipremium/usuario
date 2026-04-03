// ============================================
// MÓDULO DE CONTAS A PAGAR
// ============================================

const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
let contasAtivas = [];
let contaEmDelecao = null;

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
    console.log('✅ Contas carregadas:', contasAtivas.length);
    
    atualizarResumo();
    renderizarTabela();

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
    const descricao = document.getElementById('inputDescricao')?.value.trim();
    const valor = parseFloat(document.getElementById('inputValor')?.value || 0);
    const dataPagamento = document.getElementById('inputDataPagamento')?.value;
    const categoria = document.getElementById('inputCategoria')?.value;
    const recorrencia = document.getElementById('inputRecorrencia')?.value;
    const notas = document.getElementById('inputNotas')?.value || '';

    console.log('📝 Salvando nova conta:', { descricao, valor, dataPagamento, categoria });

    if (!descricao || !valor || !dataPagamento || !categoria) {
      mostrarMensagem('❌ Preencha todos os campos obrigatórios!', 'erro');
      return false;
    }

    if (valor <= 0) {
      mostrarMensagem('❌ O valor deve ser maior que zero!', 'erro');
      return false;
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
      DataPago: null
    };

    contasAtivas.push(conta);

    const resultado = await salvarContasNoGoogleDrive();

    console.log('📤 Resultado após salvar conta nova:', resultado);

    if (resultado) {
      mostrarMensagem('✅ Conta salva com sucesso!', 'sucesso');
      
      await registrarCriacaoConta(conta);

      limparFormulario();
      fecharModal();

      atualizarResumo();
      renderizarTabela();
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
    renderizarTabela();

  } catch (erro) {
    console.error('❌ Erro ao deletar:', erro);
    mostrarMensagem('Erro ao deletar: ' + erro.message, 'erro');
  }
}

// ============================================
// RENDERIZAR TABELA
// ============================================
function renderizarTabela(aplicarFiltroAtivo = false) {
  const tabelaContainer = document.getElementById('tabelaContainer');
  
  console.log('📊 Renderizando tabela...');
  console.log('📦 Total de contas:', contasAtivas.length);
  console.log('🔍 Aplicar filtro:', aplicarFiltroAtivo);

  // Atualizar todos os status automaticamente
  atualizarStatusTodasAsContas();

  // Se há filtro ativo, filtrar os dados
  let contasParaExibir = contasAtivas;
  
  if (aplicarFiltroAtivo) {
    const mes = document.getElementById('filtroMes')?.value || '';
    const ano = document.getElementById('filtroAno')?.value || '';
    const status = document.getElementById('filtroStatus')?.value || '';
    const categoria = document.getElementById('filtroCategoria')?.value || '';

    console.log('🔎 Filtros:', { mes, ano, status, categoria });

    contasParaExibir = contasAtivas.filter(conta => {
      if (mes) {
        const dataConta = new Date(conta.DataPagamento);
        const mesConta = (dataConta.getMonth() + 1).toString();
        if (mesConta !== mes) return false;
      }

      if (ano) {
        const dataConta = new Date(conta.DataPagamento);
        const anoConta = dataConta.getFullYear().toString();
        if (anoConta !== ano) return false;
      }

      if (status && conta.StatusPagamento !== status) {
        return false;
      }

      if (categoria && conta.Categoria !== categoria) {
        return false;
      }

      return true;
    });

    console.log('✅ Contas após filtro:', contasParaExibir.length);
  }

  if (contasParaExibir.length === 0) {
    tabelaContainer.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">Nenhuma conta encontrada. Tente ajustar seus filtros.</p>';
    return;
  }

  const contasOrdenadas = [...contasParaExibir].sort((a, b) => 
    new Date(a.DataPagamento) - new Date(b.DataPagamento)
  );

  let html = `
    <table>
      <thead>
        <tr>
          <th>Data de Pagamento</th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Valor</th>
          <th>Recorrência</th>
          <th>Responsável</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
  `;

  contasOrdenadas.forEach(conta => {
    const statusClass = conta.StatusPagamento === 'Pago' ? 'status-pago' : 
                       conta.StatusPagamento === 'Vencido' ? 'status-vencido' :
                       'status-avencer';
    
    const statusTexto = conta.StatusPagamento === 'Pago' ? '✅ PAGO' : 
                        conta.StatusPagamento === 'Vencido' ? '⚠️ VENCIDO' :
                        '⏳ A VENCER';

    html += `
      <tr>
        <td>${formatarData(conta.DataPagamento)}</td>
        <td>${conta.Descricao}</td>
        <td>${conta.Categoria}</td>
        <td style="font-weight: bold; color: #d4af37;">R$ ${formatarMoeda(conta.Valor)}</td>
        <td>
          <span class="status-badge ${conta.IsRecorrente ? 'status-recorrente' : 'status-unica'}">
            ${conta.IsRecorrente ? `📅 ${(conta.Frequencia || '').toUpperCase()}` : '🔔 ÚNICA'}
          </span>
        </td>
        <td>${conta.Responsavel}</td>
        <td>
          <span class="status-badge ${statusClass}">
            ${statusTexto}
          </span>
        </td>
        <td>
          <div class="acoes">
            <button class="btn-editar" onclick="editarConta('${conta.Id}')">✏️ Editar</button>
            <button class="btn-deletar" onclick="deletarConta('${conta.Id}')">🗑️ Deletar</button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

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

// ============================================
// SALVAR EDIÇÃO DE CONTA
// ============================================
async function salvarEdicaoConta(event) {
  if (event) event.preventDefault();

  try {
    const id = window.contaEmEdicao;
    if (!id) throw new Error('ID da conta não identificado');

    console.log('💾 Salvando edição da conta ID:', id, 'Tipo:', typeof id);

    // Procurar pela conta comparando como string
    let contaIndex = contasAtivas.findIndex(c => String(c.Id) === String(id));
    if (contaIndex === -1) {
      console.error('❌ Conta não encontrada. IDs:', contasAtivas.map(c => c.Id));
      throw new Error('Conta não encontrada');
    }

    const conta = contasAtivas[contaIndex];
    console.log('✅ Conta encontrada:', conta);

    const novoStatus = document.getElementById('editStatusPagamento').value;
    console.log('🔄 Novo status selecionado:', novoStatus);

    if (novoStatus === 'Pago') {
      conta.StatusPagamento = 'Pago';
      conta.DataPago = new Date().toISOString();
      console.log('✅ Marcada como PAGO em:', conta.DataPago);
    }

    const notas = document.getElementById('editNotas').value;
    if (notas !== conta.Notas) {
      conta.Notas = notas;
      console.log('📝 Notas atualizadas');
    }

    console.log('💾 Conta editada (final):', conta);

    const resultado = await salvarContasNoGoogleDrive();

    console.log('📤 Resultado após salvar:', resultado);

    if (resultado) {
      mostrarMensagem('✅ Conta atualizada com sucesso!', 'sucesso');
      
      fecharModal('modalEdicao');
      window.contaEmEdicao = null;
      atualizarResumo();
      renderizarTabela();
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
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const data = new Date(dataPagamento);
  data.setHours(0, 0, 0, 0);
  
  if (data > hoje) {
    return 'A Vencer';
  } else if (data < hoje) {
    return 'Vencido';
  } else {
    return 'A Vencer';
  }
}

// ============================================
// ATUALIZAR TODOS OS STATUS
// ============================================
function atualizarStatusTodasAsContas() {
  contasAtivas.forEach(conta => {
    if (conta.StatusPagamento !== 'Pago') {
      conta.StatusPagamento = calcularStatusAutomatico(conta.DataPagamento);
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

function limparFormulario() {
  const form = document.getElementById('formContaBridge');
  if (form) {
    form.reset();
  }
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

function aplicarFiltros() {
  const mes = document.getElementById('filtroMes')?.value || '';
  const ano = document.getElementById('filtroAno')?.value || '';
  const status = document.getElementById('filtroStatus')?.value || '';
  const categoria = document.getElementById('filtroCategoria')?.value || '';

  const contagemFiltros = [mes, ano, status, categoria].filter(v => v !== '').length;
  console.log(`🔍 Aplicando ${contagemFiltros} filtro(s)...`);

  renderizarTabela(contagemFiltros > 0);
  
  if (contagemFiltros > 0) {
    mostrarMensagem(`✅ ${contagemFiltros} filtro(s) aplicado(s).`, 'sucesso');
  }
}

function limparFiltros() {
  document.getElementById('filtroMes').value = '';
  document.getElementById('filtroAno').value = '';
  document.getElementById('filtroStatus').value = '';
  document.getElementById('filtroCategoria').value = '';
  
  renderizarTabela(false);
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

  // Fechar modais com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fecharModal();
      fecharModal('modalConfirmacao');
      fecharModal('modalEdicao');
    }
  });
});
