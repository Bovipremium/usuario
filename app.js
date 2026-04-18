// ============================================
// APLICAÇÃO PRINCIPAL - DASHBOARD
// ============================================

// Verificar login
let usuarioLogado = verificarLogin();

// Elementos da página
const nomeUsuario = document.getElementById("nomeUsuario");
const menu = document.getElementById("menu");
const titulo = document.getElementById("titulo");
const conteudo = document.getElementById("conteudo");
const searchBox = document.getElementById("searchBox");
const buscaInput = document.getElementById("busca");
const botoesAcao = document.getElementById("botoesAcao");

// ✅ CACHE DE DADOS EM MEMÓRIA
let clientesGlobal = null; // Cache clientes.json uma vez
let dadosAtivos = [];
let tipoAtivo = null;

// ✅ FUNÇÃO: Carregar clientes UMA ÚNICA VEZ
async function carregarClientesUmaVez() {
  if (clientesGlobal) {
    console.log('✅ Usando clientes.json do cache em memória');
    return clientesGlobal;
  }
  
  console.log('📥 Carregando clientes.json (será cacheado)...');
  clientesGlobal = await buscarArquivo("clientes.json");
  return clientesGlobal;
}

// ============================================
// INICIALIZAÇÃO
// ============================================
window.addEventListener("load", async () => {
  // Mostrar nome do usuário
  const nomeUsuarioEl = document.getElementById('nomeUsuario');
  if (nomeUsuarioEl && usuarioLogado) {
    nomeUsuarioEl.textContent = usuarioLogado.nome || 'Usuário';
  }

  // ✅ PRÉ-CARREGAR clientes.json em clientesGlobal (não bloqueia UI)
  carregarClientesUmaVez();

  // Carregar foto do usuário
  await carregarFotoUsuario();

  // Carregar comissão do usuário para exibir ao lado da foto
  await carregarComissaoUsuario();

  // Carregar menu de módulos
  await carregarMenu();
});

// ============================================
// FUNÇÃO: CARREGAR FOTO DO USUÁRIO
// ============================================
async function carregarFotoUsuario() {
  try {
    const imgElement = document.getElementById('fotoUsuario');
    if (!imgElement) return;
    
    // Mostrar quadrado vazio por padrão
    imgElement.style.display = 'block';
    
    if (!usuarioLogado || !usuarioLogado.nome) {
      console.warn('❌ Usuário não identificado para carregar foto');
      return;
    }

    const nomeUsuario = usuarioLogado.nome.trim();
    console.log(`📸 Solicitando foto do usuário: ${nomeUsuario}`);

    const deviceId = localStorage.getItem('deviceId');
    const url = `${CONFIG.API_URL}?acao=buscar_foto&usuario=${encodeURIComponent(nomeUsuario)}&deviceId=${deviceId}`;
    
    const response = await AuthManager.requisicaoSegura(url);
    
    if (!response.ok) {
      console.warn('⚠️ Erro na requisição de foto');
      return;
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.url) {
      imgElement.src = data.url;
      console.log(`✅ Foto carregada: ${data.fileName}`);
    } else if (data.status === 'not_found') {
      console.log(`ℹ️ Nenhuma foto encontrada para ${nomeUsuario}`);
    } else {
      console.warn('⚠️ Erro ao buscar foto:', JSON.stringify(data));
    }
    
  } catch (erro) {
    console.error('❌ Erro ao carregar foto do usuário:', erro);
  }
}

// ============================================
// FUNÇÃO: CARREGAR COMISSÃO DO USUÁRIO
// Mostra ao lado da foto: Vendido (mês) e Comissão
// ============================================
async function carregarComissaoUsuario() {
  try {
    if (!usuarioLogado || !usuarioLogado.nome) {
      return;
    }

    // Obter configuração de comissão do localStorage PRIMEIRO
    let configMetas = JSON.parse(localStorage.getItem('configMetas') || '{}');
    
    // Se localStorage vazio ou antigo, carregar do Drive
    if (!configMetas.comissao) {
      try {
        const configDoArquivo = await buscarArquivo('configMetas.json');
        if (configDoArquivo && configDoArquivo.comissao !== undefined) {
          configMetas = configDoArquivo;
          localStorage.setItem('configMetas', JSON.stringify(configMetas));
          console.log('✅ ConfigMetas carregada do Drive:', configMetas);
        }
      } catch (e) {
        console.warn('⚠️ Não conseguiu carregar configMetas.json do Drive');
      }
    }
    
    const percentualComissao = parseFloat(configMetas.comissao) || 0;
    console.log('💰 ConfigMetas:', configMetas);
    console.log('💰 Percentual Comissão:', percentualComissao + '%');

    // ✅ Usar cache global de clientes (carregar uma única vez)
    const clientes = await carregarClientesUmaVez();

    if (!Array.isArray(clientes)) {
      console.warn('⚠️ Erro ao carregar clientes para comissão');
      return;
    }

    // Calcular vendas do mês atual
    const agora = new Date();
    const mesAtual = agora.getMonth() + 1;
    const anoAtual = agora.getFullYear();
    
    let vendidoMes = 0;
    let faturamentoTotal = 0; // Total de TODOS os vendedores

    // Percorrer clientes e suas vendas
    clientes.forEach(cliente => {
      if (cliente.Vendas && Array.isArray(cliente.Vendas)) {
        cliente.Vendas.forEach(venda => {
          // Verificar se a venda é deste usuário (usando VendedorVenda)
          const vendedorVenda = venda.VendedorVenda || venda.Vendedor;
          const dataVenda = new Date(venda.DataVenda);
          const mesVenda = dataVenda.getMonth() + 1;
          const anoVenda = dataVenda.getFullYear();
          
          const valorVenda = parseFloat(venda.ValorTotal) || 0;

          // Somar ao total de faturamento (todos os vendedores)
          if (mesVenda === mesAtual && anoVenda === anoAtual) {
            faturamentoTotal += valorVenda;
          }

          // Somar apenas as vendas deste usuário
          if (vendedorVenda === usuarioLogado.nome && mesVenda === mesAtual && anoVenda === anoAtual) {
            vendidoMes += valorVenda;
          }
        });
      }
    });

    // Calcular comissão
    const comissao = vendidoMes * (percentualComissao / 100);

    // Nomes dos meses
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesNome = meses[mesAtual - 1];

    // Exibir ao lado da foto
    const containerComissao = document.getElementById('usuarioComissao');
    const elementoVendido = document.getElementById('usuarioVendido');
    const elementoComissao = document.getElementById('usuarioComissaoValor');
    const elementoFaturamento = document.getElementById('usuarioFaturamento');
    const labelMes = document.getElementById('usuarioVendidoLabel');
    const divTotalPendente = document.getElementById('usuarioTotalPendenteDiv');
    const elementoTotalPendente = document.getElementById('usuarioTotalPendente');

    if (containerComissao && elementoVendido && elementoComissao) {
      // Formatar valores com R$
      const vendidoFormatado = vendidoMes.toLocaleString('pt-BR', {minimumFractionDigits: 2});
      const comissaoFormatada = comissao.toLocaleString('pt-BR', {minimumFractionDigits: 2});
      const faturamentoFormatado = faturamentoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2});
      const totalPendenteFormatado = totalPendente.toLocaleString('pt-BR', {minimumFractionDigits: 2});
      
      elementoVendido.textContent = `R$ ${vendidoFormatado}`;
      elementoComissao.textContent = `R$ ${comissaoFormatada}`;
      
      // 🆕 Exibir faturamento total
      if (elementoFaturamento) {
        elementoFaturamento.textContent = `R$ ${faturamentoFormatado}`;
      }
      
      // 🆕 Mostrar Total Pendente apenas para Admin
      const ehAdmin = usuarioLogado && (usuarioLogado.nome === 'Admin' || usuarioLogado.modulos?.includes('Administrador'));
      if (divTotalPendente && elementoTotalPendente && ehAdmin) {
        elementoTotalPendente.textContent = `R$ ${totalPendenteFormatado}`;
        divTotalPendente.style.display = 'block';
      } else if (divTotalPendente) {
        divTotalPendente.style.display = 'none';
      }
      
      // Atualizar label do mês
      if (labelMes) {
        labelMes.textContent = `Vendido (${mesNome})`;
      }
      
      // Mostrar o container se houver vendas ou se percentual está configurado
      if (vendidoMes > 0 || percentualComissao > 0) {
        containerComissao.style.display = 'block';
      }

      console.log(`💰 Comissão do usuário ${usuarioLogado.nome}: Vendido R$ ${vendidoMes.toFixed(2)}, Comissão R$ ${comissao.toFixed(2)} (${percentualComissao}%)`);
      console.log(`📊 Faturamento Total (${mesNome}): R$ ${faturamentoTotal.toFixed(2)}`);
      console.log(`⚠️ Total Pendente (${mesNome}): R$ ${totalPendente.toFixed(2)}`);
    }

  } catch (erro) {
    console.error('❌ Erro ao carregar comissão do usuário:', erro);
  }
}

// ============================================
// FUNÇÃO: CARREGAR MENU DE MÓDULOS
// ============================================
async function carregarMenu() {
  const modulos = obterModulos();

  if (modulos.length === 0) {
    menu.innerHTML = '<p style="color: #c33;">Nenhum módulo autorizado</p>';
    return;
  }

  // Criar items do menu baseado nos módulos permitidos
  const modulosDisponiveis = {
    "Clientes": {
      icone: "👥",
      descricao: "Gerenciar clientes",
      arquivo: "clientes.json",
      tipo: "clientes"
    },
    "Insumos": {
      icone: "📦",
      descricao: "Controlar insumos",
      arquivo: "insumos.json",
      tipo: "insumos"
    },
    "Transporte": {
      icone: "🚚",
      descricao: "Gerenciar transportes",
      arquivo: "transporte.json",
      tipo: "transporte"
    },
    "Pagamentos": {
      icone: "💰",
      descricao: "Controlar pagamentos",
      arquivo: "clientes.json",
      tipo: "pagamentos"
    },
    "Receitas": {
      icone: "📊",
      descricao: "Ver receitas",
      arquivo: "receitas.json",
      tipo: "receitas"
    },
    "Despesas": {
      icone: "💸",
      descricao: "Análise de despesas",
      arquivo: "despesas.json",
      tipo: "despesas"
    },
    "AutoWhatsApp": {
      icone: "📞",
      descricao: "Agendar ligações para clientes",
      arquivo: "agendar-ligacoes.html",
      tipo: "agendar-ligacao"
    },
    "Administrador": {
      icone: "⚙️",
      descricao: "Gerenciar usuários e auditoria",
      arquivo: "usuarios-admin.html",
      tipo: "administrador"
    },
    "Auditoria": {
      icone: "📋",
      descricao: "Visualizar log de alterações",
      arquivo: "auditoria.html",
      tipo: "auditoria"
    },
    "Revisão Contatos": {
      icone: "📱",
      descricao: "Revisar e organizar contatos",
      arquivo: "revisao-contatos.html",
      tipo: "revisao-contatos"
    },
    "Relatório Vendedor": {
      icone: "📈",
      descricao: "Desempenho e metas de vendedores",
      arquivo: "relatorio-vendedor.html",
      tipo: "relatorio-vendedor"
    }
  };

  // Filtrar módulos que o usuário pode acessar
  const modulosFiltrados = Object.entries(modulosDisponiveis).filter(([nome]) => 
    modulos.includes(nome)
  );

  menu.innerHTML = modulosFiltrados.map(([nome, dados]) => `
    <div class="menu-item" onclick="carregarModulo('${nome}', '${dados.tipo}', '${dados.arquivo || ''}')">
      <h3>${dados.icone} ${nome}</h3>
      <p>${dados.descricao}</p>
    </div>
  `).join("");

  // Renderizar sidebar com os módulos
  renderizarSidebar(modulosDisponiveis, modulos);
}

// ============================================
// FUNÇÃO: RENDERIZAR SIDEBAR COM ÍCONES
// ============================================
function renderizarSidebar(modulosDisponiveis, modulosPermitidos) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Começar com o ícone de home
  let sidebarHTML = `
    <div class="sidebar-item" onclick="window.location.href='index.html'" title="Ir para página inicial">
      🏠
      <div class="tooltip">Home</div>
    </div>
    <div class="sidebar-divider"></div>
  `;

  // Adicionar ícones de cada módulo
  Object.entries(modulosDisponiveis).forEach(([nome, dados]) => {
    // Mostrar todos os módulos (o acesso será validado no carregarModulo)
    sidebarHTML += `
      <div class="sidebar-item" onclick="carregarModulo('${nome}', '${dados.tipo}', '${dados.arquivo || ''}')" title="${nome}">
        ${dados.icone}
        <div class="tooltip">${nome}</div>
      </div>
    `;
  });

  // Adicionar divisor e ícone de logout
  sidebarHTML += `
    <div class="sidebar-divider"></div>
    <div class="sidebar-item" onclick="logout()" style="margin-top: auto;" title="Sair do sistema">
      🚪
      <div class="tooltip">Sair</div>
    </div>
  `;

  sidebar.innerHTML = sidebarHTML;

  // Adicionar event listeners para toggle de tooltips no mobile
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    const sidebarItems = sidebar.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Remover classe active de todos os itens
        sidebarItems.forEach(i => i.classList.remove('active'));
        // Adicionar classe active ao item clicado
        item.classList.add('active');
      });
    });
  }
}

// ============================================
// FUNÇÃO: CARREGAR MÓDULO
// ============================================
async function carregarModulo(nome, tipo, arquivo) {
  console.log('carregarModulo called with', { nome, tipo, arquivo });
  
  // Verificar permissão de acesso ao módulo (mantido comentado por padrão)
  // if (!validarAcesso(tipo)) {
  //   alert(`❌ Você não tem permissão para acessar o módulo: ${nome}`);
  //   return;
  // }

  try {
    titulo.textContent = `📋 ${nome}`;
  conteudo.innerHTML = '<div class="loading"><div class="spinner"></div> <p>Carregando...</p></div>';

  // 🎯 SCROLL AUTOMÁTICO PARA O CONTEÚDO
  const contentDiv = document.querySelector('.content');
  if (contentDiv) {
    setTimeout(() => {
      contentDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
    if (tipo === "dashboard") {
      // Limpar botões de ação
      botoesAcao.innerHTML = "";
      // Dashboard vazio por enquanto
      mostrarDashboard();
    } 
    // TRATAMENTO ESPECIAL PARA PAGAMENTOS
    else if (tipo === "pagamentos") {
      // ✅ Usar cache global de clientes (carregar uma única vez)
      const clientes = await carregarClientesUmaVez();
      
      tipoAtivo = tipo;
      dadosAtivos = Array.isArray(clientes) ? clientes : [];
      
      // Armazenar dados de filtro
      window.todosClientesPagamentos = dadosAtivos;
      
      // Botões para abrir relatório E DESPESAS (LADO DO TÍTULO)
      const botoes = `
        <button onclick="abrirDespesasModulo()" style="padding: 10px 20px; background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%); color: white; border: none; border-radius: 5px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap;">
          💸 Despesas
        </button>
        <button onclick="abrirContasModulo()" style="padding: 10px 20px; background: linear-gradient(135deg, #1fa37a 0%, #0f6b52 100%); color: white; border: none; border-radius: 5px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap;">
          💰 Contas
        </button>
        <button onclick="abrirRelatorioPagamentos()" style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 5px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap;">
          📊 Relatório
        </button>
      `;
      botoesAcao.innerHTML = botoes;
      
      // Renderizar tabela de pagamentos (agrupado por cliente) PRIMEIRO
      renderizarTabelaPagamentos(dadosAtivos);
      
      // Depois inserir os filtros ACIMA da tabela
      renderizarFiltrosPagamentos();
      
      searchBox.classList.remove("hidden");
      buscaInput.value = "";
      buscaInput.onkeyup = () => filtrarDadosPagamentos();
      
      // 🎯 ADICIONAR EVENTO DE ENTER COM AUTO-SCROLL PARA PAGAMENTOS
      buscaInput.onkeypress = (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          filtrarDadosPagamentos();
          
          // Auto-scroll para o primeiro resultado encontrado
          setTimeout(() => {
            const tabela = conteudo.querySelector('table');
            if (tabela) {
              const primeiroVisivel = tabela.querySelector('tbody tr:not([style*="display: none"])');
              if (primeiroVisivel) {
                primeiroVisivel.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center'
                });
                console.log('✅ Auto-scroll para primeiro resultado (Pagamentos)');
              }
            }
          }, 100);
        }
      };
    }
    // PÁGINA ESPECIAL DE TRANSPORTE
    else if (tipo === "transporte") {
      window.location.href = "transporte.html";
      return;
    }
    // PÁGINA ESPECIAL DE RECEITAS
    else if (tipo === "receitas") {
      window.location.href = "receita.html";
      return;
    }
    // PÁGINA ESPECIAL DE DESPESAS
    else if (tipo === "despesas") {
      window.location.href = "despesas.html";
      return;
    }
    // PÁGINA ESPECIAL DE ADMINISTRADOR
    else if (tipo === "administrador") {
      window.location.href = "usuarios-admin.html";
      return;
    }
    // PÁGINA ESPECIAL DE AUDITORIA
    else if (tipo === "auditoria") {
      window.location.href = "auditoria.html";
      return;
    }
    // PÁGINA ESPECIAL DE AGENDAR LIGAÇÃO
    else if (tipo === "agendar-ligacao") {
      window.location.href = "agendar-ligacoes.html";
      return;
    }
    // PÁGINA ESPECIAL DE REVISÃO DE CONTATOS
    else if (tipo === "revisao-contatos") {
      window.location.href = "revisao-contatos.html";
      return;
    }
    // PÁGINA ESPECIAL DE RELATÓRIO VENDEDOR
    else if (tipo === "relatorio-vendedor") {
      window.location.href = "relatorio-vendedor.html";
      return;
    }
    else if (arquivo) {
      // Limpar botões de ação (exceto para pagamentos)
      botoesAcao.innerHTML = "";
      
      // Buscar dados do arquivo JSON
      const dados = await buscarArquivo(arquivo);
      
      // Verificar se é um array ou objeto
      let lista = Array.isArray(dados) ? dados : (dados.dados || []);
      
      // ✅ FILTRO: Mostrar apenas clientes do usuário logado (com permissões)
      if (tipo === "clientes" && usuarioLogado && usuarioLogado.nome) {
        // Verificar se é admin (por módulo)
        const isAdmin = usuarioLogado.modulos && usuarioLogado.modulos.includes('Administrador');
        
        // ✅ BUSCAR DADOS ATUALIZADOS DO USUÁRIO DO DRIVE (como em calcular-meta-alvo.js)
        try {
          const usuarios = await buscarArquivo('usuarios.json');
          const usuariosArray = Array.isArray(usuarios) ? usuarios : [];
          const usuarioDadosAtualizados = usuariosArray.find(u => 
            (u.Nome === usuarioLogado.nome || u.nome === usuarioLogado.nome)
          );
          
          if (usuarioDadosAtualizados) {
            console.log(`✅ Dados do usuário atualizados do Drive:`, usuarioDadosAtualizados);
            // Atualizar com dados frescos do Drive
            usuarioLogado.VendedoresVisualizacao = usuarioDadosAtualizados.VendedoresVisualizacao || [];
            usuarioLogado.VendedoresPermitidos = usuarioDadosAtualizados.VendedoresPermitidos || [];
          }
        } catch (erro) {
          console.warn('⚠️ Erro ao buscar dados atualizados do usuário do Drive:', erro);
        }
        
        console.log(`📋 usuarioLogado (atualizado):`, usuarioLogado);
        console.log(`📋 VendedoresVisualizacao:`, usuarioLogado.VendedoresVisualizacao);
        
        if (!isAdmin) {
          // ✅ ADICIONADO: Verificar se tem permissão "Ver Todos"
          const vendedoresVisualizacao = usuarioLogado.VendedoresVisualizacao || [];
          
          console.log(`🔍 Verificando __VER_TODOS__: ${vendedoresVisualizacao.includes('__VER_TODOS__')}`);
          
          if (vendedoresVisualizacao.includes('__VER_TODOS__')) {
            // Se marcou "Ver Todos", mostra todos os clientes de qualquer vendedor
            console.log(`✅ Permissão "Ver Todos" ativa: Mostrando ${lista.length} clientes (TODOS)`);
          } else {
            // Caso normal: filtra por vendedor
            const vendedorLogado = usuarioLogado.nome.trim().toLowerCase();
            const vendedoresVisualizacaoNormalizados = vendedoresVisualizacao.map(v => v.trim().toLowerCase());
            
            // Vendedor VÊ SEMPRE seus clientes + clientes de vendedores que tem permissão
            // ✅ NORMALIZADO: Comparação case-insensitive
            lista = lista.filter(cliente => {
              const vendedorCliente = (cliente.Vendedor || '').trim().toLowerCase();
              // SEMPRE mostrar clientes do próprio vendedor
              if (vendedorCliente === vendedorLogado) return true;
              // ALÉM disso, mostrar clientes de vendedores em VendedoresVisualizacao
              if (vendedoresVisualizacaoNormalizados.includes(vendedorCliente)) return true;
              return false;
            });
            
            const detalhes = vendedoresVisualizacao.length > 0 
              ? `${lista.length} clientes (seus + permitidos)`
              : `${lista.length} clientes (apenas seus)`;
            console.log(`✅ Filtrado: ${detalhes}`);
          }
        } else {
          // Admin vê todos os clientes
          console.log(`✅ Admin logado: vendo todos os ${lista.length} clientes`);
        }
      }
      
      tipoAtivo = tipo;
      dadosAtivos = lista;
      
      // Armazenar dados originais para filtros
      window.dadosOriginais = JSON.parse(JSON.stringify(lista));

      // Renderizar tabela PRIMEIRO
      renderizarTabela(tipo, lista);
      
      // Depois renderizar filtros apropriados
      if (tipo === "clientes") {
        // Adicionar botão de novo cliente
        const botoesClientes = `
          <button onclick="window.location.href='clientes-novo.html'" style="padding: 10px 20px; background: linear-gradient(135deg, #1fa37a 0%, #0f6b52 100%); color: white; border: none; border-radius: 5px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap;">
            ➕ Novo Cliente
          </button>
        `;
        botoesAcao.innerHTML = botoesClientes;
        renderizarFiltrosClientes();
      } else if (tipo === "insumos") {
        renderizarFiltrosInsumos();
      }
      
      // Mostrar caixa de busca
      searchBox.classList.remove("hidden");
      
      // Adicionar event listener de busca
      buscaInput.value = "";
      buscaInput.onkeyup = () => filtrarDados(tipo);
      
      // 🎯 ADICIONAR EVENTO DE ENTER COM AUTO-SCROLL
      buscaInput.onkeypress = (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          filtrarDados(tipo);
          
          // Auto-scroll para o primeiro resultado encontrado
          setTimeout(() => {
            const tabela = conteudo.querySelector('table');
            if (tabela) {
              const primeiroVisivel = tabela.querySelector('tbody tr:not([style*="display: none"])');
              if (primeiroVisivel) {
                primeiroVisivel.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center'
                });
                console.log('✅ Auto-scroll para primeiro resultado');
              }
            }
          }, 100);
        }
      };
    }
  } catch (erro) {
    const mensagemErro = traduzirErro(erro);
    conteudo.innerHTML = `<div class="erro">❌ ${mensagemErro}</div>`;
  }
}

// ============================================
// FUNÇÃO: TRADUZIR ERRO DE REDE
// ============================================
function traduzirErro(erro) {
  if (!erro.message) return 'Erro desconhecido';
  const msg = erro.message.toLowerCase();
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout')) {
    return 'Falta de conexão com a internet. Verifique sua conexão.';
  }
  return `Erro ao carregar dados: ${erro.message}`;
}

// ============================================
// FUNÇÃO: RENDERIZAR TABELA
// ============================================
function renderizarTabela(tipo, dados) {
  searchBox.classList.remove("hidden");

  // Remover mensagem de carregamento se existir
  const loading = conteudo.querySelector('.loading');
  if (loading) loading.remove();

  if (dados.length === 0) {
    // Remover tabela anterior se existir
    const tabelaAnterior = conteudo.querySelector('table');
    if (tabelaAnterior) {
      tabelaAnterior.remove();
    }
    // Adicionar mensagem vazia
    const msg = document.createElement('p');
    msg.textContent = 'Nenhum registro encontrado';
    msg.style.color = '#999';
    msg.id = 'msgVazia';
    conteudo.appendChild(msg);
    return;
  }

  // Remover mensagem vazia se existir
  const msgVazia = conteudo.querySelector('#msgVazia');
  if (msgVazia) msgVazia.remove();

  // Remover tabela anterior
  const tabelaAnterior = conteudo.querySelector('table');
  if (tabelaAnterior) {
    tabelaAnterior.remove();
  }

  // Definir colunas por tipo (baseado no C#)
  const colunasPorTipo = {
    clientes: ["Id", "Nome", "CPF", "Telefone1"],
    insumos: ["Nome", "Quantidade", "Valor", "Unidade"],
    transporte: ["NomeCliente", "Cidade", "Estado", "CodigoRastreio", "ValorFrete", "Status"],
    pagamentos: ["ClienteNome", "ClienteCPF", "NumeroNF", "DataVencimento", "Valor", "Pago", "DataPagamento"],
    receitas: ["Nome", "Tipo", "PesoPadrao", "CustoPorKg", "Descricao"]
  };

  const colunas = colunasPorTipo[tipo] || Object.keys(dados[0] || {});

  // Criar tabela
  let html = '<table><thead><tr>';
  colunas.forEach(col => {
    html += `<th>${col}</th>`;
  });
  if (tipo === "clientes") {
    html += '<th style="text-align: center;">Status</th>';
  }
  html += '</tr></thead><tbody>';

  dados.forEach((item, index) => {
    const classe = tipo === "pagamentos" ? "click-pagamento" : "";
    const onclick = tipo === "pagamentos" ? `onclick="abrirDetalhePagamento('${item.Nome}')"` : (tipo === "clientes" ? `onclick="abrirDetalhesCliente('${item.Nome}')"` : "");
    const cursor = (tipo === 'pagamentos' || tipo === 'clientes') ? 'cursor: pointer;' : '';
    const dataCliente = tipo === "clientes" ? `data-cliente="${item.Nome}"` : "";
    
    html += `<tr class="${classe}" ${onclick} ${dataCliente} style="${cursor}" title="${tipo === 'clientes' ? 'Clique para detalhes' : 'Clique para detalhes'}">`;
    colunas.forEach(col => {
      const valor = obterValor(item, col, tipo);
      html += `<td>${valor}</td>`;
    });
    
    // Adicionar status para clientes
    if (tipo === "clientes") {
      const inadimplente = verificarInadimplenciaCliente(item);
      const statusTexto = inadimplente ? '❌ Inadimplente' : '✅ Ativo';
      const statusCor = inadimplente ? '#d9534f' : '#4a7c2c';
      const produtoStatus = item.ProdutoPronto ? '📦' : '⏳';
      const satisfacao = item.Satisfacao === 'Satisfeito' ? '😊' : item.Satisfacao === 'Insatisfeito' ? '😞' : item.Satisfacao === 'SemGado' ? '🐄' : '❓';
      
      html += `<td style="text-align: center; white-space: nowrap;">
        <span style="background: ${statusCor}; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; display: inline-block; margin-right: 5px;" title="${statusTexto}">${statusTexto}</span>
        <span style="font-size: 14px; margin: 0 3px;" title="Produto: ${item.ProdutoPronto ? 'Pronto' : 'Não pronto'}">${produtoStatus}</span>
        <span style="font-size: 14px; cursor: pointer;" title="Satisfação: ${item.Satisfacao}" onclick="expandirStatusCliente(event, '${item.Nome}')">${satisfacao} ▼</span>
      </td>`;
    }
    
    html += '</tr>';
  });

  html += '</tbody></table>';
  
  // Adicionar tabela ao final do conteúdo (após os filtros)
  conteudo.insertAdjacentHTML('beforeend', html);

  // Adicionar evento para clique direito em clientes (abrir em nova aba)
  if (tipo === "clientes") {
    setTimeout(() => {
      const tabela = conteudo.querySelector('table');
      if (tabela) {
        const linhas = tabela.querySelectorAll('tbody tr[data-cliente]');
        linhas.forEach(linha => {
          linha.addEventListener('mousedown', function(e) {
            // Detectar clique direito (button 2) ou Ctrl/Cmd + clique (button 0 com ctrl/cmd)
            if (e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
              e.preventDefault();
              const nomeCliente = this.getAttribute('data-cliente');
              abrirClienteNovaAba(nomeCliente);
            }
          });
          
          // Bloquear menu de contexto para permitir ação customizada
          linha.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const nomeCliente = this.getAttribute('data-cliente');
            abrirClienteNovaAba(nomeCliente);
          });
        });
      }
    }, 50);
  }
}

// ============================================
// FUNÇÃO: ABRIR CLIENTE EM NOVA ABA
// ============================================
function abrirClienteNovaAba(nomeCliente) {
  carregarClientesUmaVez().then(clientes => {
    const cliente = Array.isArray(clientes) ? 
      clientes.find(c => c.Nome === nomeCliente) : 
      null;

    if (cliente) {
      const clienteJSON = JSON.stringify(cliente);
      localStorage.setItem('clienteSelecionado', clienteJSON);
      sessionStorage.setItem('clienteSelecionado', clienteJSON);
      window.open('clientes-detalhes.html', '_blank');
    }
  });
}

// ============================================
// FUNÇÃO: ABRIR DETALHE DE PAGAMENTO
// ============================================
// ============================================
// FUNÇÃO: ABRIR DETALHE DE PAGAMENTO
// ============================================
function abrirDetalhePagamento(nomeCliente) {
  // ✅ Usar cache global de clientes (carregar uma única vez)
  carregarClientesUmaVez().then(clientes => {
    const cliente = Array.isArray(clientes) ? 
      clientes.find(c => c.Nome === nomeCliente) : 
      null;

    if (cliente) {
      // Armazenar cliente no sessionStorage E localStorage
      console.log('💾 Salvando cliente para pagamentos:', cliente);
      const clienteJSON = JSON.stringify(cliente);
      sessionStorage.setItem('clienteSelecionado', clienteJSON);
      localStorage.setItem('clienteSelecionado', clienteJSON);
      console.log('✅ Cliente salvo. Redirecionando...');
      
      // Redirecionar para página de detalhes
      setTimeout(() => {
        window.location.href = 'pagamentos-detalhes.html';
      }, 100);
    } else {
      alert('Erro: Cliente não encontrado');
    }
  }).catch(erro => {
    alert('Erro ao buscar detalhes: ' + erro.message);
  });
}

// ============================================
// FUNÇÃO: ABRIR DETALHES DO CLIENTE
// ============================================
function abrirDetalhesCliente(nomeCliente) {
  // 📍 MOSTRAR LOADING IMEDIATAMENTE
  mostrarLoadingCliente();

  // ✅ Usar cache global de clientes (carregar uma única vez)
  carregarClientesUmaVez().then(clientes => {
    const cliente = Array.isArray(clientes) ? 
      clientes.find(c => c.Nome === nomeCliente) : 
      null;

    if (cliente) {
      // Armazenar cliente no sessionStorage E localStorage
      console.log('💾 Salvando cliente:', cliente);
      const clienteJSON = JSON.stringify(cliente);
      sessionStorage.setItem('clienteSelecionado', clienteJSON);
      localStorage.setItem('clienteSelecionado', clienteJSON);
      
      // Garantir que foi setado
      const teste = sessionStorage.getItem('clienteSelecionado');
      console.log('✅ Cliente salvo no sessionStorage:', teste ? 'SIM' : 'NÃO');
      console.log('✅ Cliente salvo no localStorage:', localStorage.getItem('clienteSelecionado') ? 'SIM' : 'NÃO');
      console.log('🚀 Redirecionando...');
      
      // Redirecionar para página de detalhes (loading continua até carregar)
      setTimeout(() => {
        window.location.href = 'clientes-detalhes.html';
      }, 100);
    } else {
      ocultarLoadingCliente();
      alert('Erro: Cliente não encontrado');
    }
  }).catch(erro => {
    ocultarLoadingCliente();
    alert('Erro ao buscar detalhes: ' + erro.message);
  });
}

// 📍 FUNCÕES DE LOADING DO CLIENTE
function mostrarLoadingCliente() {
  if (document.getElementById('loadingClienteOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'loadingClienteOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    backdrop-filter: blur(8px);
  `;
  overlay.innerHTML = `
    <div style="text-align: center;">
      <div style="
        width: 60px;
        height: 60px;
        border: 4px solid rgba(31,163,122,.2);
        border-top: 4px solid #1fa37a;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 20px;
      "></div>
      <p style="color: #7cf0c2; font-size: 16px; font-weight: 600; margin: 0;">⏳ Carregando Cliente...</p>
      <p style="color: #8fb9ac; font-size: 12px; margin: 8px 0 0;">Por favor, aguarde</p>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(overlay);
}

function ocultarLoadingCliente() {
  const overlay = document.getElementById('loadingClienteOverlay');
  if (overlay) overlay.remove();
}

// Verificar inadimplência do cliente
function verificarInadimplenciaCliente(cliente) {
  if (!cliente.Vendas) return false;
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (let venda of cliente.Vendas) {
    if (!venda.Parcelas) continue;
    
    for (let parcela of venda.Parcelas) {
      const dataVencimento = new Date(parcela.DataVencimento);
      dataVencimento.setHours(0, 0, 0, 0);
      
      if (!parcela.Pago && dataVencimento <= hoje) {
        return true;
      }
    }
  }
  
  return false;
}

// Expandir/Retrair detalhes de status do cliente
function expandirStatusCliente(event, nomeCliente) {
  event.stopPropagation();
  
  const id = `detalhes-${nomeCliente.replace(/\s+/g, '-')}`;
  let detalhes = document.getElementById(id);
  
  // Se já existe, remove (fecha)
  if (detalhes) {
    detalhes.style.display = 'none';
    return;
  }
  
  // ✅ Usar cache global de clientes (carregar uma única vez)
  carregarClientesUmaVez().then(clientes => {
    const cliente = Array.isArray(clientes) ? 
      clientes.find(c => c.Nome === nomeCliente) : 
      null;

    if (!cliente) {
      alert('Cliente não encontrado');
      return;
    }

    const inadimplente = verificarInadimplenciaCliente(cliente);
    const statusText = inadimplente ? '❌ INADIMPLENTE' : '✅ ATIVO';
    const statusColor = inadimplente ? '#d9534f' : '#4a7c2c';
    const produtoText = cliente.ProdutoPronto ? '✅ Sim' : '❌ Não';
    const satisfacaoTexto = {
      'Satisfeito': '😊 Satisfeito',
      'Insatisfeito': '😞 Insatisfeito',
      'SemGado': '🐄 Sem Gado',
      'NaoInformado': '❓ Não Informado'
    }[cliente.Satisfacao || 'NaoInformado'];

    // Encontrar a linha do cliente na tabela
    const tabela = document.querySelector('table');
    if (!tabela) return;

    // Criar linha de detalhes
    const htmlDetalhes = `
<tr id="${id}" style="
  background: rgba(15,42,34,.65);
  border-top: 1px solid rgba(31,163,122,.35);
  backdrop-filter: blur(12px);
">
  <td colspan="100" style="padding:14px;">
    
    <div style="
      background: linear-gradient(145deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
      border: 1px solid rgba(31,163,122,.25);
      border-radius:16px;
      padding:16px;
      box-shadow:0 20px 40px rgba(0,0,0,.45);
    ">

      <h3 style="
        color:#7cf0c2;
        margin-bottom:12px;
        font-size:13px;
        font-weight:600;
        letter-spacing:.3px;
      ">
        📊 Detalhes — ${nomeCliente}
      </h3>

      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
        gap:12px;
        margin-bottom:14px;
      ">

        <!-- STATUS -->
        <div style="
          background:rgba(0,0,0,.35);
          border:1px solid rgba(31,163,122,.25);
          padding:10px;
          border-radius:12px;
          backdrop-filter: blur(8px);
        ">
          <div style="
            font-size:9px;
            color:#9ca3af;
            text-transform:uppercase;
            letter-spacing:.5px;
            margin-bottom:6px;
          ">Status</div>

          <div style="
            font-size:12px;
            font-weight:600;
            color:white;
            background:${statusColor};
            padding:6px;
            border-radius:8px;
            text-align:center;
          ">
            ${statusText}
          </div>
        </div>

        <!-- PRODUTO -->
        <div style="
          background:rgba(0,0,0,.35);
          border:1px solid rgba(31,163,122,.25);
          padding:10px;
          border-radius:12px;
          backdrop-filter: blur(8px);
        ">
          <div style="
            font-size:9px;
            color:#9ca3af;
            text-transform:uppercase;
            letter-spacing:.5px;
            margin-bottom:6px;
          ">Produto</div>

          <div style="
            font-size:12px;
            font-weight:600;
            color:#7cf0c2;
            text-align:center;
          ">
            ${produtoText}
          </div>
        </div>

        <!-- SATISFAÇÃO -->
        <div style="
          grid-column:1/-1;
          background:rgba(0,0,0,.35);
          border:1px solid rgba(31,163,122,.25);
          padding:10px;
          border-radius:12px;
          backdrop-filter: blur(8px);
        ">
          <div style="
            font-size:9px;
            color:#9ca3af;
            text-transform:uppercase;
            letter-spacing:.5px;
            margin-bottom:6px;
          ">Satisfação</div>

          <div style="
            font-size:12px;
            font-weight:600;
            color:#e5e7eb;
            text-align:center;
          ">
            ${satisfacaoTexto}
          </div>
        </div>
      </div>

      <!-- BOTÃO -->
      <button onclick="
        buscarArquivo('clientes.json').then(clientes => {
          const c = clientes.find(x => x.Nome === '${nomeCliente}');
          if (c) {
            sessionStorage.setItem('clienteSelecionado', JSON.stringify(c));
            window.location.href = 'clientes-detalhes.html';
          }
        })
      " style="
        width:100%;
        background:linear-gradient(135deg,#1fa37a,#0f6b52);
        color:#052018;
        border:none;
        padding:10px;
        border-radius:12px;
        cursor:pointer;
        font-weight:600;
        font-size:12px;
        transition:.3s;
        box-shadow:0 10px 30px rgba(31,163,122,.35);
      "
      onmouseover="this.style.transform='translateY(-2px)'"
      onmouseout="this.style.transform='translateY(0)'">
        Ver detalhes completos
      </button>

    </div>
  </td>
</tr>
`;
    
    // Encontrar a linha do cliente e inserir o detalhe depois dela
    const linhas = tabela.querySelectorAll('tbody tr');
    let inserido = false;
    
    linhas.forEach((linha, idx) => {
      const celulas = linha.querySelectorAll('td');
      if (celulas.length > 1 && celulas[1].textContent.includes(nomeCliente)) {
        linha.insertAdjacentHTML('afterend', htmlDetalhes);
        inserido = true;
      }
    });
    
    if (!inserido) {
      // Se não encontrar a linha, inserir no final
      tabela.querySelector('tbody').insertAdjacentHTML('beforeend', htmlDetalhes);
    }
  }).catch(erro => {
    console.error('Erro ao buscar cliente:', erro);
    alert('Erro ao buscar cliente: ' + erro.message);
  });
}

// ============================================
// FUNÇÃO: EXPANDIR VENDAS EM PAGAMENTOS
// ============================================
function expandirVendasPagamentos(event, nomeCliente) {
  event.stopPropagation();
  
  // Encontrar a linha atual do cliente
  const linhaAtual = event.target.closest('tr');
  if (!linhaAtual) return;
  
  // Encontrar a próxima linha (linha de expansão)
  const linhaExpansao = linhaAtual.nextElementSibling;
  if (!linhaExpansao) return;
  
  // Toggle display da linha de expansão
  const estaVisivel = linhaExpansao.style.display !== 'none';
  linhaExpansao.style.display = estaVisivel ? 'none' : 'table-row';
  
  // Girar a seta
  const setinha = event.target;
  setinha.style.transform = estaVisivel ? 'rotate(0deg)' : 'rotate(90deg)';
  setinha.style.transition = 'transform 0.3s ease';
}

// ============================================
// FUNÇÃO: ABRIR CONTAS NO MÓDULO PAGAMENTOS
// ============================================
async function abrirContasModulo() {
  // Redirecionar para contas.html
  window.location.href = 'contas.html';
}

// ============================================
// FUNÇÃO: ABRIR DESPESAS NO MÓDULO PAGAMENTOS
// ============================================
async function abrirDespesasModulo() {
  // Redirecionar para despesas.html
  window.location.href = 'despesas.html';
}

// ============================================
// FUNÇÃO: RENDERIZAR DESPESAS NO MÓDULO
// ============================================
function renderizarTabelaDespesasModulo(dados) {
  searchBox.classList.add("hidden");
  
  // Remover loading se existir
  const loading = conteudo.querySelector('.loading');
  if (loading) loading.remove();
  
  if (dados.length === 0) {
    conteudo.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">Nenhuma despesa encontrada</p>';
    return;
  }

  // Calcular resumo
  const total = dados.reduce((sum, d) => sum + (d.Valor || 0), 0);
  const media = dados.length > 0 ? total / dados.length : 0;
  const maior = dados.length > 0 ? Math.max(...dados.map(d => d.Valor || 0)) : 0;
  const maiorDespesa = dados.find(d => d.Valor === maior);

  // Criar HTML da tabela
  const html = `
    <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
      <h3 style="color: #1fa37a; margin-bottom: 10px;">📊 Resumo de Despesas</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
        <div style="padding: 10px; background: rgba(255,255,255,0.03); border-radius: 6px;">
          <div style="color: #8fb9ac; font-size: 12px; font-weight: bold;">Total</div>
          <div style="color: #d4af37; font-size: 18px; font-weight: bold;">${formatarMoeda(total)}</div>
        </div>
        <div style="padding: 10px; background: rgba(255,255,255,0.03); border-radius: 6px;">
          <div style="color: #8fb9ac; font-size: 12px; font-weight: bold;">Média</div>
          <div style="color: #7cf0c2; font-size: 18px; font-weight: bold;">${formatarMoeda(media)}</div>
        </div>
        <div style="padding: 10px; background: rgba(255,255,255,0.03); border-radius: 6px;">
          <div style="color: #8fb9ac; font-size: 12px; font-weight: bold;">Maior</div>
          <div style="color: #1fa37a; font-size: 18px; font-weight: bold;">${formatarMoeda(maior)}</div>
        </div>
        <div style="padding: 10px; background: rgba(255,255,255,0.03); border-radius: 6px;">
          <div style="color: #8fb9ac; font-size: 12px; font-weight: bold;">Quantidade</div>
          <div style="color: #e5f3ee; font-size: 18px; font-weight: bold;">${dados.length}</div>
        </div>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;">
      <thead style="background: rgba(31,163,122,0.2); border-bottom: 2px solid rgba(31,163,122,0.3);">
        <tr>
          <th style="padding: 15px; text-align: left; color: #7cf0c2; font-weight: bold; font-size: 12px; text-transform: uppercase;">Data</th>
          <th style="padding: 15px; text-align: left; color: #7cf0c2; font-weight: bold; font-size: 12px; text-transform: uppercase;">Mês/Ano</th>
          <th style="padding: 15px; text-align: left; color: #7cf0c2; font-weight: bold; font-size: 12px; text-transform: uppercase;">Descrição</th>
          <th style="padding: 15px; text-align: right; color: #7cf0c2; font-weight: bold; font-size: 12px; text-transform: uppercase;">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${dados.sort((a, b) => new Date(b.DataCadastro) - new Date(a.DataCadastro)).map(d => `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); transition: all 0.3s;">
            <td style="padding: 12px 15px; color: #b9d8ce;">${new Date(d.DataCadastro).toLocaleDateString('pt-BR')}</td>
            <td style="padding: 12px 15px; color: #7cf0c2; font-weight: 600;">${String(d.Mes).padStart(2, '0')}/${d.Ano}</td>
            <td style="padding: 12px 15px; color: #b9d8ce;">${d.Descricao || '-'}</td>
            <td style="padding: 12px 15px; text-align: right; color: #d4af37; font-weight: bold;">${formatarMoeda(d.Valor)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  conteudo.innerHTML = html;
}

// ============================================
// FUNÇÃO: VOLTAR DE DESPESAS PARA PAGAMENTOS
// ============================================
function voltarPagamentos() {
  carregarModulo("Pagamentos", "pagamentos", "clientes.json");
}

// ============================================
// FUNÇÃO: ABRIR RELATÓRIO DE PAGAMENTOS
// ============================================
function abrirRelatorioPagamentos() {
  window.location.href = 'relatorio-pagamentos.html';
}

// ============================================
// FUNÇÃO: FORMATAR MOEDA
// ============================================
function formatarMoeda(valor) {
  if (!valor) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

// ============================================
// FUNÇÃO: FORMATAR CPF
// ============================================
function formatarCPF(cpf) {
  if (!cpf || typeof cpf !== 'string') return '-';
  // Remove caracteres não numéricos
  const apenas = cpf.replace(/\D/g, '');
  // Formata como XXX.XXX.XXX-XX
  return apenas.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// ============================================
// FUNÇÃO: OBTER VALOR ANINHADO
// ============================================
function obterValor(obj, caminho, tipoTabela = "") {
  if (!obj) return "-";
  
  const partes = caminho.split(".");
  let valor = obj;

  for (const parte of partes) {
    valor = valor?.[parte];
    if (valor === undefined || valor === null) return "-";
  }

  // Se campo Nome está vazio em INSUMOS, mostrar Descrição
  if (tipoTabela === "insumos" && caminho === "Nome") {
    if (!valor || valor.trim() === "") {
      // Tentar pegar a descrição
      const descricao = obj.Descricao;
      if (descricao && descricao.trim() !== "") {
        return descricao.trim();
      }
      return "-";
    }
  }

  // Converter boolean para português
  if (typeof valor === "boolean") {
    return valor ? "✅ Sim" : "⏳ Não";
  }

  // Formatar números ANTES de verificar se é vazio
  if (typeof valor === "number") {
    // Sempre exibir números (mesmo que sejam 0)
    if (caminho.includes("Valor")) {
      return "R$ " + valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    }
    // Para Id, Quantidade, etc
    return valor.toString();
  }

  // Formatar datas
  if (typeof valor === "string" && valor.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(valor).toLocaleDateString("pt-BR");
  }

  // Se for string
  if (typeof valor === "string") {
    return valor.trim() === "" ? "-" : valor;
  }

  // Fallback
  return "-";
}

// ============================================
// FUNÇÃO: FILTRAR DADOS
// ============================================
function filtrarDados(tipo) {
  const termo = buscaInput.value.toLowerCase();

  if (!termo) {
    renderizarTabela(tipo, dadosAtivos);
    return;
  }

  let filtrados = [];

  if (tipo === "clientes") {
    // Busca genérica: Nome, CPF, Telefone1, Telefone2, Email, NumeroNF
    filtrados = dadosAtivos.filter(cliente => {
      const temNome = cliente.Nome && cliente.Nome.toLowerCase().includes(termo);
      const temCPF = cliente.CPF && cliente.CPF.includes(termo);
      const temTelefone1 = cliente.Telefone1 && cliente.Telefone1.includes(termo);
      const temTelefone2 = cliente.Telefone2 && cliente.Telefone2.includes(termo);
      const temEmail = cliente.Email && cliente.Email.toLowerCase().includes(termo);
      
      // Buscar também em números de NF das vendas
      let temNF = false;
      if (cliente.Vendas && Array.isArray(cliente.Vendas)) {
        temNF = cliente.Vendas.some(v => v.NumeroNF && v.NumeroNF.includes(termo));
      }

      return temNome || temCPF || temTelefone1 || temTelefone2 || temEmail || temNF;
    });
  } else {
    // Para outros tipos, busca genérica em todos os campos
    filtrados = dadosAtivos.filter(item => {
      return JSON.stringify(item).toLowerCase().includes(termo);
    });
  }

  renderizarTabela(tipo, filtrados);
  
  // 🎯 AUTO-SCROLL ENQUANTO DIGITA
  setTimeout(() => {
    const tabela = conteudo.querySelector('table');
    if (tabela) {
      const primeiroVisivel = tabela.querySelector('tbody tr:not([style*="display: none"])');
      if (primeiroVisivel) {
        primeiroVisivel.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, 50);
}

// ============================================
// FUNÇÃO: FILTRAR DADOS DE PAGAMENTOS
// ============================================
function filtrarDadosPagamentos() {
  const termo = buscaInput.value.toLowerCase();

  if (!termo) {
    renderizarTabelaPagamentos(window.todosClientesPagamentos);
    return;
  }

  const filtrados = window.todosClientesPagamentos.filter(cliente => {
    // Buscar por nome, CPF, telefones ou NF
    const temNome = cliente.Nome && cliente.Nome.toLowerCase().includes(termo);
    const temCPF = cliente.CPF && cliente.CPF.includes(termo);
    const temTelefone1 = cliente.Telefone1 && cliente.Telefone1.includes(termo);
    const temTelefone2 = cliente.Telefone2 && cliente.Telefone2.includes(termo);
    
    // Buscar também em números de NF das vendas
    let temNF = false;
    if (cliente.Vendas && Array.isArray(cliente.Vendas)) {
      temNF = cliente.Vendas.some(v => v.NumeroNF && v.NumeroNF.includes(termo));
    }

    return temNome || temCPF || temTelefone1 || temTelefone2 || temNF;
  });

  renderizarTabelaPagamentos(filtrados);
  
  // 🎯 AUTO-SCROLL ENQUANTO DIGITA (PAGAMENTOS)
  setTimeout(() => {
    const tabela = conteudo.querySelector('table');
    if (tabela) {
      const primeiroVisivel = tabela.querySelector('tbody tr:not([style*="display: none"])');
      if (primeiroVisivel) {
        primeiroVisivel.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, 50);
}

// ============================================
// FUNÇÃO: MOSTRAR DASHBOARD
// ============================================
async function mostrarDashboard() {
  searchBox.classList.add("hidden");
  
  const usuario = obterUsuario();
  const permissoes = obterPermissoes();

  let html = `
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
      <h3 style="color: #667eea; margin-bottom: 15px;">📊 Bem-vindo ao Sistema</h3>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
        <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea;">
          <p style="color: #999; margin-bottom: 5px;">Usuário</p>
          <h4 style="color: #333;">${usuario.nome}</h4>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #764ba2;">
          <p style="color: #999; margin-bottom: 5px;">Módulos</p>
          <h4 style="color: #333;">${obterModulos().length}</h4>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea;">
          <p style="color: #999; margin-bottom: 5px;">Status</p>
          <h4 style="color: #3c3;">✅ Ativo</h4>
        </div>
      </div>

      <h4 style="color: #333; margin-top: 20px;">📋 Acesso autorizado a:</h4>
      <ul style="margin-top: 10px; color: #666;">
        ${obterModulos().map(m => `<li>✓ ${m}</li>`).join("")}
      </ul>

      <!-- DESEMPENHO DE VENDEDORES -->
      <div id="desempenhoVendedores" style="margin-top: 30px;"></div>
      
      <!-- PRÓXIMAS LIGAÇÕES AGENDADAS -->
      <div id="proximasLigacoes" style="margin-top: 30px;"></div>
    </div>
  `;

  conteudo.innerHTML = html;
  
  // ✅ RECARREGAR COMISSÃO (pode ter sido atualizada em admin)
  await carregarComissaoUsuario();
  
  // Carregar próximos agendamentos (async sem await)
  carregarProximasLigacoesDashboard();
  
  // Carregar desempenho de vendedores (usa cache global)
  carregarDesempenhoVendedoresDashboard();
}

// ============================================
// FUNÇÃO: CARREGAR DESEMPENHO DE VENDEDORES NO DASHBOARD
// ============================================
async function carregarDesempenhoVendedoresDashboard() {
  try {
    const container = document.getElementById('desempenhoVendedores');
    if (!container) return;

    // ✅ USAR CACHE GLOBAL - não fazer requisição extra!
    const clientes = clientesGlobal || [];
    if (!Array.isArray(clientes) || clientes.length === 0) {
      console.warn('⚠️ Clientes ainda não carregados globalmente');
      container.innerHTML = '';
      return;
    }

    // Obter mês/ano atual
    const agora = new Date();
    const mesAtual = agora.getMonth() + 1;
    const anoAtual = agora.getFullYear();
    const meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesNome = meses[mesAtual];

    // Calcular vendas por vendedor
    const vendasPorVendedor = {};
    let totalGeral = 0;

    clientes.forEach(cliente => {
      if (cliente.Vendas && Array.isArray(cliente.Vendas)) {
        cliente.Vendas.forEach(venda => {
          const dataVenda = new Date(venda.DataVenda);
          const mesVenda = dataVenda.getMonth() + 1;
          const anoVenda = dataVenda.getFullYear();

          if (mesVenda === mesAtual && anoVenda === anoAtual) {
            const vendedor = venda.VendedorVenda || venda.Vendedor || 'Não atribuído';
            const valor = parseFloat(venda.ValorTotal) || 0;

            if (!vendasPorVendedor[vendedor]) {
              vendasPorVendedor[vendedor] = 0;
            }
            vendasPorVendedor[vendedor] += valor;
            totalGeral += valor;
          }
        });
      }
    });

    // Se não tem vendas, não mostra nada
    if (totalGeral === 0 || Object.keys(vendasPorVendedor).length === 0) {
      container.innerHTML = '';
      return;
    }

    // Ordena por valor (maior para menor)
    const vendedoresOrdenados = Object.entries(vendasPorVendedor)
      .sort((a, b) => b[1] - a[1])
      .map(([nome, valor]) => ({ nome, valor }));

    // Renderizar HTML
    const html = `
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      <h4 style="color: #333; margin-bottom: 15px;">💰 Desempenho de Vendedores - ${mesNome}/${anoAtual}</h4>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 20px;">
        ${vendedoresOrdenados.map((vendedor, idx) => {
          const percentual = ((vendedor.valor / totalGeral) * 100).toFixed(1);
          return `
            <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: #333; font-size: 14px;">👤 ${vendedor.nome}</strong>
                <span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">${percentual}%</span>
              </div>
              <h3 style="color: #667eea; font-size: 18px; margin: 10px 0;">R$ ${vendedor.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              
              <!-- Barra de progresso -->
              <div style="background: #e3f2fd; border-radius: 4px; height: 6px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: ${percentual}%; transition: width 0.3s ease;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- TOTAL VENDIDO DO MÊS -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); text-align: center;">
        <p style="font-size: 14px; margin-bottom: 8px; opacity: 0.9;">📊 TOTAL VENDIDO DO MÊS</p>
        <h2 style="font-size: 32px; font-weight: 700; margin: 0;">R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        <p style="font-size: 12px; margin-top: 8px; opacity: 0.8;">🎯 ${Object.keys(vendasPorVendedor).length} ${Object.keys(vendasPorVendedor).length === 1 ? 'vendedor' : 'vendedores'} ativo(s) em ${mesNome}</p>
      </div>
    `;

    container.innerHTML = html;
    console.log('📊 Desempenho de vendedores carregado (via cache):', vendasPorVendedor);

  } catch (erro) {
    console.warn('⚠️ Erro ao carregar desempenho de vendedores:', erro);
    // Falha silenciosa
  }
}

// ============================================
// FUNÇÃO: CARREGAR PRÓXIMAS LIGAÇÕES NO DASHBOARD
// ============================================
async function carregarProximasLigacoesDashboard() {
  try {
    const container = document.getElementById('proximasLigacoes');
    if (!container) return;

    // Buscar agendamentos
    const agendamentos = await buscarArquivo('agendamentos_ligacoes.json');
    const lista = Array.isArray(agendamentos) ? agendamentos : (agendamentos.dados || []);

    if (lista.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Filtrar agendamentos futuros e próximos 5 dias
    const agora = new Date();
    const proximosDias = new Date(agora.getTime() + 5 * 24 * 60 * 60 * 1000);

    const proximosAgendamentos = lista
      .filter(ag => {
        const dataHora = new Date(ag.DataHoraInicio);
        return dataHora >= agora && dataHora <= proximosDias;
      })
      .sort((a, b) => new Date(a.DataHoraInicio) - new Date(b.DataHoraInicio))
      .slice(0, 5);

    if (proximosAgendamentos.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Renderizar próximos agendamentos
    const html = `
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      <h4 style="color: #333; margin-bottom: 15px;">📞 Próximas Ligações Agendadas</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
        ${proximosAgendamentos.map(ag => {
          const dataHora = new Date(ag.DataHoraInicio);
          const dataFormatada = dataHora.toLocaleDateString('pt-BR');
          const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          
          // Calcular tempo restante
          const tempoRestante = dataHora - agora;
          const horas = Math.floor(tempoRestante / (1000 * 60 * 60));
          const minutos = Math.floor((tempoRestante % (1000 * 60 * 60)) / (1000 * 60));
          
          const tempoRestanteStr = horas > 0 ? 
            `${horas}h ${minutos}min` : 
            `${minutos}min`;

          return `
            <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #1fa37a; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <strong style="color: #1fa37a; font-size: 16px;">☎️ ${ag.Numero}</strong>
                <span style="background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">⏳ ${tempoRestanteStr}</span>
              </div>
              <p style="color: #999; font-size: 13px; margin-bottom: 6px;">📅 ${dataFormatada} às ${horaFormatada}</p>
              ${ag.Descricao ? `<p style="color: #666; font-size: 12px; font-style: italic; margin: 6px 0;">📝 ${ag.Descricao}</p>` : ''}
              <p style="color: #999; font-size: 12px;">🔄 Repete a cada ${ag.IntervalMinutos} min</p>
            </div>
          `;
        }).join('')}
      </div>
      <div style="text-align: center; margin-top: 15px;">
        <button onclick="window.location.href='agendar-ligacoes.html'" style="padding: 8px 16px; background: linear-gradient(135deg, #1fa37a, #0f6b52); color: white; border: none; border-radius: 5px; font-weight: 600; cursor: pointer;">
          Ver Todas as Ligações Agendadas →
        </button>
      </div>
    `;

    container.innerHTML = html;

  } catch (erro) {
    console.warn('⚠️ Erro ao carregar agendamentos:', erro);
    // Não mostrar erro visível, apenas falha silenciosa
  }
}

// ============================================
// FUNÇÃO: RENDERIZAR FILTROS DE PAGAMENTOS
// ============================================
function renderizarFiltrosPagamentos() {
  const filtrosHTML = `
    <div id="filtrosPagamentos" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
      
      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Status de Pagamento</label>
        <select id="filtroStatus" onchange="aplicarFiltrosPagamentos()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
          <option value="">Todos</option>
          <option value="pago">Pago (✅ Sim)</option>
          <option value="pendente">Pendente (⏳ Não)</option>
        </select>
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Data Vencimento (De)</label>
        <input type="date" id="filtroDataDe" onchange="aplicarFiltrosPagamentos()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Data Vencimento (Até)</label>
        <input type="date" id="filtroDataAte" onchange="aplicarFiltrosPagamentos()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Valor Mínimo</label>
        <input type="number" id="filtroValorMin" onchange="aplicarFiltrosPagamentos()" placeholder="0,00" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Valor Máximo</label>
        <input type="number" id="filtroValorMax" onchange="aplicarFiltrosPagamentos()" placeholder="9999,99" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
      </div>

      <div style="display: flex; gap: 5px; align-items: flex-end;">
        <button onclick="limparFiltrosPagamentos()" style="flex: 1; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">🔄 Limpar</button>
      </div>

    </div>
  `;
  
  // Inserir filtros no topo do conteúdo
  conteudo.insertAdjacentHTML('afterbegin', filtrosHTML);
}

// ============================================
// FUNÇÃO: RENDERIZAR TABELA DE PAGAMENTOS (AGRUPADO POR CLIENTE)
// ============================================
function renderizarTabelaPagamentos(clientes) {
  // Remover loading se existir
  const loading = conteudo.querySelector('.loading');
  if (loading) loading.remove();

  if (!Array.isArray(clientes) || clientes.length === 0) {
    conteudo.innerHTML = '<p style="color: #999;">Nenhum cliente encontrado</p>';
    return;
  }

  // Criar cabeçalho da tabela SIMPLIFICADO
  let html = '<table><thead><tr>';
  html += '<th style="min-width: 30px; text-align: center; width: 25px;"></th>';
  html += '<th style="flex: 1; min-width: 150px;">Cliente</th>';
  html += '<th style="min-width: 80px; text-align: center; font-size: 12px;">Total</th>';
  html += '<th style="min-width: 80px; text-align: center; font-size: 12px;">Pagos</th>';
  html += '</tr></thead><tbody>';

  // Preencher dados dos clientes
  clientes.forEach((cliente, clienteIndex) => {
    if (!cliente.Vendas || !Array.isArray(cliente.Vendas) || cliente.Vendas.length === 0) {
      return; // Pular clientes sem vendas
    }

    // Calcular totais para este cliente
    let totalBoletos = 0;
    let boletosPagos = 0;
    const statusIdx = document.getElementById("filtroStatus")?.value || "";
    const dataDe = document.getElementById("filtroDataDe")?.value || "";
    const dataAte = document.getElementById("filtroDataAte")?.value || "";
    const valorMin = parseFloat(document.getElementById("filtroValorMin")?.value) || 0;
    const valorMax = parseFloat(document.getElementById("filtroValorMax")?.value) || Infinity;

    // Coletar informações de cada venda
    let exibirCliente = false;

    cliente.Vendas.forEach((venda, vendaIdx) => {
      // Filtrar parcelas por critérios
      let parcelas = venda.Parcelas || [];
      parcelas = parcelas.filter(p => {
        // Filtro de status
        if (statusIdx === "pago" && !p.Pago) return false;
        if (statusIdx === "pendente" && p.Pago) return false;

        // Filtro de data
        const dataVencimento = new Date(p.DataVencimento);
        if (dataDe) {
          const dataDeParsed = new Date(dataDe);
          if (dataVencimento < dataDeParsed) return false;
        }
        if (dataAte) {
          const dataAteParsed = new Date(dataAte);
          if (dataVencimento > dataAteParsed) return false;
        }

        // Filtro de valor
        if (p.Valor < valorMin || p.Valor > valorMax) return false;

        return true;
      });

      const totalVenda = parcelas.length;
      const pagosVenda = parcelas.filter(p => p.Pago).length;

      if (totalVenda > 0) {
        totalBoletos += totalVenda;
        boletosPagos += pagosVenda;
        exibirCliente = true;
      }
    });

    // Só exibir cliente se tiver pelo menos um boleto que passa nos filtros
    if (!exibirCliente) {
      return;
    }

    // Determinar cor da linha
    let corFundo = "rgba(255,255,255,.02)";
    if (totalBoletos > 0) {
      if (boletosPagos === 0) corFundo = "rgba(220, 50, 50, 0.25)"; // vermelho forte
      else if (boletosPagos === totalBoletos) corFundo = "rgba(50, 200, 50, 0.25)"; // verde forte
      else corFundo = "rgba(255, 200, 0, 0.25)"; // amarelo forte
    }

    // Adicionar linha do cliente COM SETINHA
    html += `<tr style="background-color: ${corFundo}; cursor: pointer;">`;
    html += `<td style="text-align: center; font-size: 18px; color: #1fa37a; cursor: pointer; padding: 8px;" onclick="expandirVendasPagamentos(event, '${cliente.Nome.replace(/'/g, "\\'")}')">▶</td>`;
    html += `<td style="font-weight: 500; color: #e5f3ee; padding: 12px; cursor: pointer;" onclick="abrirDetalhePagamento('${cliente.Nome.replace(/'/g, "\\'")}'); event.stopPropagation();">${cliente.Nome}</td>`;
    html += `<td style="font-weight: bold; text-align: center; color: #e5f3ee; font-size: 13px;">${totalBoletos}</td>`;
    html += `<td style="font-weight: bold; text-align: center; color: #e5f3ee; font-size: 13px;">${boletosPagos}</td>`;
    html += '</tr>';

    // Linha expansível para as vendas (inicialmente oculta)
    html += `<tr id="exp-vendas-${clienteIndex}" style="display: none;">`;
    html += `<td colspan="4" style="padding: 0;">`;
    html += `<div id="vendas-${clienteIndex}" style="padding: 15px; background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02)); border-left: 3px solid #1fa37a;">`;
    html += `<p style="color: #b9d8ce; font-size: 12px; margin-bottom: 10px;">📋 Vendas e Boletos:</p>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    html += `<thead><tr style="border-bottom: 1px solid rgba(255,255,255,.1);">`;
    html += `<th style="text-align: left; padding: 8px; color: #8fb9ac; font-size: 12px;">Venda</th>`;
    html += `<th style="text-align: center; padding: 8px; color: #8fb9ac; font-size: 12px;">Status</th>`;
    html += `</tr></thead><tbody>`;

    // Preencher vendas dentro da expansão
    cliente.Vendas.forEach((venda, vendaIdx) => {
      const parcelas = (venda.Parcelas || []).filter(p => {
        if (statusIdx === "pago" && !p.Pago) return false;
        if (statusIdx === "pendente" && p.Pago) return false;
        const dataVencimento = new Date(p.DataVencimento);
        if (dataDe) {
          const dataDeParsed = new Date(dataDe);
          if (dataVencimento < dataDeParsed) return false;
        }
        if (dataAte) {
          const dataAteParsed = new Date(dataAte);
          if (dataVencimento > dataAteParsed) return false;
        }
        if (p.Valor < valorMin || p.Valor > valorMax) return false;
        return true;
      });

      const totalVenda = parcelas.length;
      const pagosVenda = parcelas.filter(p => p.Pago).length;

      if (totalVenda > 0) {
        let corStatus = '#ff6b6b'; // Vermelho padrão
        let statusTexto = `${pagosVenda}/${totalVenda}`;
        
        if (pagosVenda === totalVenda) {
          corStatus = '#32c832'; // Verde - tudo pago
        } else if (pagosVenda > 0) {
          corStatus = '#ffc107'; // Amarelo - parcial
        }

        let corVenda = "rgba(255,255,255,.02)";
        if (pagosVenda === 0) corVenda = "rgba(220, 50, 50, 0.15)";
        else if (pagosVenda === totalVenda) corVenda = "rgba(50, 200, 50, 0.15)";
        else corVenda = "rgba(255, 200, 0, 0.15)";

        html += `<tr style="background-color: ${corVenda}; border-bottom: 1px solid rgba(255,255,255,.05);">`;
        html += `<td style="padding: 8px; color: #b9d8ce; font-size: 12px;">Venda #${vendaIdx + 1}</td>`;
        html += `<td style="text-align: center; padding: 8px; color: ${corStatus}; font-size: 13px; font-weight: bold;">${statusTexto}</td>`;
        html += `</tr>`;
      }
    });

    html += `</tbody></table>`;
    html += `</div>`;
    html += `</td>`;
    html += `</tr>`;
  });

  html += '</tbody></table>';
  
  // Adicionar resumo de estatísticas
  const resumoHTML = `
    <div style="margin-top: 20px; padding: 15px; background: linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02)); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; backdrop-filter: blur(10px); display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
      <div style="background: rgba(31,163,122,.08); padding: 12px; border-radius: 8px; border-left: 3px solid #1fa37a;">
        <p style="color: #8fb9ac; margin-bottom: 3px; font-size: 10px; text-transform: uppercase;">Total de Clientes</p>
        <h3 id="totalClientes" style="color: #1fa37a; margin: 0; font-size: 16px;">0</h3>
      </div>
      <div style="background: rgba(144,238,144,.1); padding: 12px; border-radius: 8px; border-left: 3px solid #90ee90;">
        <p style="color: #8fb9ac; margin-bottom: 3px; font-size: 10px; text-transform: uppercase;">Boletos Pagos</p>
        <h3 id="totalPagos" style="color: #90ee90; margin: 0; font-size: 16px;">0</h3>
      </div>
      <div style="background: rgba(217,83,79,.1); padding: 12px; border-radius: 8px; border-left: 3px solid #d9534f;">
        <p style="color: #8fb9ac; margin-bottom: 3px; font-size: 10px; text-transform: uppercase;">Boletos Pendentes</p>
        <h3 id="totalPendentes" style="color: #d9534f; margin: 0; font-size: 16px;">0</h3>
      </div>
      <div style="background: rgba(212,175,55,.1); padding: 12px; border-radius: 8px; border-left: 3px solid #d4af37;">
        <p style="color: #8fb9ac; margin-bottom: 3px; font-size: 10px; text-transform: uppercase;">Valor Total</p>
        <h3 id="valorTotal" style="color: #d4af37; margin: 0; font-size: 16px;">R$ 0,00</h3>
      </div>
    </div>
  `;

  // ✅ Limpar COMPLETAMENTE o conteúdo antes de renderizar
  conteudo.innerHTML = '';
  
  // Adicionar tabela e resumo limpos
  conteudo.insertAdjacentHTML('beforeend', html + resumoHTML);
  
  // Atualizar estatísticas
  atualizarEstatisticasPagamentos(clientes);
}

// ============================================
// FUNÇÃO: ATUALIZAR ESTATÍSTICAS DE PAGAMENTOS
// ============================================
function atualizarEstatisticasPagamentos(clientes) {
  let totalClientes = 0;
  let totalBoletos = 0;
  let boletosPagos = 0;
  let valorTotal = 0;

  const statusIdx = document.getElementById("filtroStatus")?.value || "";
  const dataDe = document.getElementById("filtroDataDe")?.value || "";
  const dataAte = document.getElementById("filtroDataAte")?.value || "";
  const valorMin = parseFloat(document.getElementById("filtroValorMin")?.value) || 0;
  const valorMax = parseFloat(document.getElementById("filtroValorMax")?.value) || Infinity;

  clientes.forEach(cliente => {
    if (!cliente.Vendas || !Array.isArray(cliente.Vendas)) return;

    let temBoletos = false;
    cliente.Vendas.forEach(venda => {
      let parcelas = venda.Parcelas || [];
      parcelas = parcelas.filter(p => {
        if (statusIdx === "pago" && !p.Pago) return false;
        if (statusIdx === "pendente" && p.Pago) return false;

        const dataVencimento = new Date(p.DataVencimento);
        if (dataDe) {
          if (dataVencimento < new Date(dataDe)) return false;
        }
        if (dataAte) {
          if (dataVencimento > new Date(dataAte)) return false;
        }

        if (p.Valor < valorMin || p.Valor > valorMax) return false;

        return true;
      });

      if (parcelas.length > 0) {
        temBoletos = true;
        totalBoletos += parcelas.length;
        boletosPagos += parcelas.filter(p => p.Pago).length;
        valorTotal += parcelas.reduce((sum, p) => sum + (p.Valor || 0), 0);
      }
    });

    if (temBoletos) totalClientes++;
  });

  document.getElementById("totalClientes").textContent = totalClientes;
  document.getElementById("totalPagos").textContent = boletosPagos;
  document.getElementById("totalPendentes").textContent = totalBoletos - boletosPagos;
  document.getElementById("valorTotal").textContent = "R$ " + valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

// ============================================
// FUNÇÃO: RENDERIZAR TABELA DE PAGAMENTOS FILTRADA (sem apagar conteúdo)
// ============================================
function renderizarTabelaPagamentosFiltered(clientes) {
  // Remover loading se existir
  const loading = conteudo.querySelector('.loading');
  if (loading) loading.remove();

  if (!Array.isArray(clientes) || clientes.length === 0) {
    const tabelaExistente = document.querySelector('table');
    if (tabelaExistente) tabelaExistente.remove();
    conteudo.insertAdjacentHTML('beforeend', '<p style="color: #999; text-align: center; padding: 20px;">Nenhum cliente encontrado com os filtros selecionados</p>');
    return;
  }

  // Criar cabeçalho da tabela SIMPLIFICADO
  let html = '<table><thead><tr>';
  html += '<th style="min-width: 30px; text-align: center; width: 25px;"></th>';
  html += '<th style="flex: 1; min-width: 150px;">Cliente</th>';
  html += '<th style="min-width: 80px; text-align: center; font-size: 12px;">Total</th>';
  html += '<th style="min-width: 80px; text-align: center; font-size: 12px;">Pagos</th>';
  html += '</tr></thead><tbody>';

  // Preencher dados dos clientes
  clientes.forEach((cliente, clienteIndex) => {
    if (!cliente.Vendas || !Array.isArray(cliente.Vendas) || cliente.Vendas.length === 0) {
      return;
    }

    let totalBoletos = 0;
    let boletosPagos = 0;
    const statusIdx = document.getElementById("filtroStatus")?.value || "";
    const dataDe = document.getElementById("filtroDataDe")?.value || "";
    const dataAte = document.getElementById("filtroDataAte")?.value || "";
    const valorMin = parseFloat(document.getElementById("filtroValorMin")?.value) || 0;
    const valorMax = parseFloat(document.getElementById("filtroValorMax")?.value) || Infinity;

    let exibirCliente = false;

    cliente.Vendas.forEach((venda, vendaIdx) => {
      let parcelas = venda.Parcelas || [];
      parcelas = parcelas.filter(p => {
        if (statusIdx === "pago" && !p.Pago) return false;
        if (statusIdx === "pendente" && p.Pago) return false;

        const dataVencimento = new Date(p.DataVencimento);
        if (dataDe && dataVencimento < new Date(dataDe)) return false;
        if (dataAte && dataVencimento > new Date(dataAte)) return false;

        if (p.Valor < valorMin || p.Valor > valorMax) return false;

        return true;
      });

      const totalVenda = parcelas.length;
      const pagosVenda = parcelas.filter(p => p.Pago).length;

      if (totalVenda > 0) {
        totalBoletos += totalVenda;
        boletosPagos += pagosVenda;
        exibirCliente = true;
      }
    });

    if (!exibirCliente) return;

    // Determinar cor da linha
    let corFundo = "rgba(255,255,255,.02)";
    if (totalBoletos > 0) {
      if (boletosPagos === 0) corFundo = "rgba(220, 50, 50, 0.25)"; // vermelho forte
      else if (boletosPagos === totalBoletos) corFundo = "rgba(50, 200, 50, 0.25)"; // verde forte
      else corFundo = "rgba(255, 200, 0, 0.25)"; // amarelo forte
    }

    // Adicionar linha do cliente COM SETINHA
    html += `<tr style="background-color: ${corFundo}; cursor: pointer;">`;
    html += `<td style="text-align: center; font-size: 18px; color: #1fa37a; cursor: pointer; padding: 8px;" onclick="expandirVendasPagamentos(event, '${cliente.Nome.replace(/'/g, "\\'")}')">▶</td>`;
    html += `<td style="font-weight: 500; color: #e5f3ee; padding: 12px; cursor: pointer;" onclick="abrirDetalhePagamento('${cliente.Nome.replace(/'/g, "\\'")}'); event.stopPropagation();">${cliente.Nome}</td>`;
    html += `<td style="font-weight: bold; text-align: center; color: #e5f3ee; font-size: 13px;">${totalBoletos}</td>`;
    html += `<td style="font-weight: bold; text-align: center; color: #e5f3ee; font-size: 13px;">${boletosPagos}</td>`;
    html += '</tr>';

    // Linha expansível para as vendas (inicialmente oculta)
    html += `<tr id="exp-vendas-${clienteIndex}" style="display: none;">`;
    html += `<td colspan="4" style="padding: 0;">`;
    html += `<div id="vendas-${clienteIndex}" style="padding: 15px; background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02)); border-left: 3px solid #1fa37a;">`;
    html += `<p style="color: #b9d8ce; font-size: 12px; margin-bottom: 10px;">📋 Vendas e Boletos:</p>`;
    html += `<table style="width: 100%; border-collapse: collapse;">`;
    html += `<thead><tr style="border-bottom: 1px solid rgba(255,255,255,.1);">`;
    html += `<th style="text-align: left; padding: 8px; color: #8fb9ac; font-size: 12px;">Venda</th>`;
    html += `<th style="text-align: center; padding: 8px; color: #8fb9ac; font-size: 12px;">Status</th>`;
    html += `</tr></thead><tbody>`;

    // Preencher vendas dentro da expansão
    cliente.Vendas.forEach((venda, vendaIdx) => {
      let parcelas = venda.Parcelas || [];
      parcelas = parcelas.filter(p => {
        if (statusIdx === "pago" && !p.Pago) return false;
        if (statusIdx === "pendente" && p.Pago) return false;
        const dataVencimento = new Date(p.DataVencimento);
        if (dataDe && dataVencimento < new Date(dataDe)) return false;
        if (dataAte && dataVencimento > new Date(dataAte)) return false;
        
        // Considerar pagamento parcial no filtro de valor
        let valorParaFiltrar = p.Valor;
        if (p.ValorPago > 0) {
          valorParaFiltrar = p.ValorPago;
        }
        if (valorParaFiltrar < valorMin || valorParaFiltrar > valorMax) return false;
        
        return true;
      });

      const totalVenda = parcelas.length;
      const pagosVenda = parcelas.filter(p => p.Pago).length;

      if (totalVenda > 0) {
        let corStatus = '#ff6b6b'; // Vermelho padrão
        let statusTexto = `${pagosVenda}/${totalVenda}`;
        
        if (pagosVenda === totalVenda) {
          corStatus = '#32c832'; // Verde - tudo pago
        } else if (pagosVenda > 0) {
          corStatus = '#ffc107'; // Amarelo - parcial
        }

        let corVenda = "rgba(255,255,255,.02)";
        if (pagosVenda === 0) corVenda = "rgba(220, 50, 50, 0.15)";
        else if (pagosVenda === totalVenda) corVenda = "rgba(50, 200, 50, 0.15)";
        else corVenda = "rgba(255, 200, 0, 0.15)";

        html += `<tr style="background-color: ${corVenda}; border-bottom: 1px solid rgba(255,255,255,.05);">`;
        html += `<td style="padding: 8px; color: #b9d8ce; font-size: 12px;">Venda #${vendaIdx + 1}</td>`;
        html += `<td style="text-align: center; padding: 8px; color: ${corStatus}; font-size: 13px; font-weight: bold;">${statusTexto}</td>`;
        html += `</tr>`;
      }
    });

    html += `</tbody></table>`;
    html += `</div>`;
    html += `</td>`;
    html += `</tr>`;
  });

  html += '</tbody></table>';

  // Remover tabela antiga
  const tabelaExistente = document.querySelector('table');
  if (tabelaExistente) tabelaExistente.remove();

  // Inserir nova tabela
  conteudo.insertAdjacentHTML('beforeend', html);
  
  atualizarEstatisticasPagamentos(clientes);
}

// ============================================
// FUNÇÃO: APLICAR FILTROS DE PAGAMENTOS
// ============================================
function aplicarFiltrosPagamentos() {
  if (tipoAtivo !== "pagamentos") return;
  
  // Obter valores dos filtros
  const status = document.getElementById("filtroStatus")?.value || "";
  const dataDe = document.getElementById("filtroDataDe")?.value || "";
  const dataAte = document.getElementById("filtroDataAte")?.value || "";
  const valorMin = parseFloat(document.getElementById("filtroValorMin")?.value) || 0;
  const valorMax = parseFloat(document.getElementById("filtroValorMax")?.value) || Infinity;

  // Filtrar clientes baseado nos critérios
  const clientesFiltrados = window.todosClientesPagamentos.filter(cliente => {
    if (!cliente.Vendas || !Array.isArray(cliente.Vendas)) return false;

    // Verificar se este cliente tem alguma parcela que corresponde aos filtros
    for (let venda of cliente.Vendas) {
      if (!venda.Parcelas || !Array.isArray(venda.Parcelas)) continue;

      for (let parcela of venda.Parcelas) {
        // Filtro de status
        if (status === "pago" && !parcela.Pago) continue;
        if (status === "pendente" && parcela.Pago) continue;

        // Filtro de data de vencimento
        if (dataDe || dataAte) {
          const dataVencimento = new Date(parcela.DataVencimento);
          if (dataDe && dataVencimento < new Date(dataDe)) continue;
          if (dataAte && dataVencimento > new Date(dataAte)) continue;
        }

        // Filtro de valor - CONSIDERAR PAGAMENTO PARCIAL
        let valorParaFiltrar = parcela.Valor;
        if (parcela.ValorPago > 0) {
          // Se houve pagamento parcial, usar o valor pago para filtrar
          valorParaFiltrar = parcela.ValorPago;
        }
        if (valorParaFiltrar < valorMin || valorParaFiltrar > valorMax) continue;

        // Se chegou aqui, este cliente passa pelos filtros
        return true;
      }
    }

    return false;
  });

  // Renderizar apenas a tabela (sem apagar os filtros)
  const tabelaContainer = document.querySelector('table');
  if (tabelaContainer) {
    tabelaContainer.remove();
  }
  
  // Criar elemento temporário para inserir a tabela
  const divTabela = document.createElement('div');
  divTabela.id = 'tabelaPagamentos';
  conteudo.appendChild(divTabela);
  
  // Renderizar tabela com dados filtrados
  renderizarTabelaPagamentosFiltered(clientesFiltrados);
}

// ============================================
// FUNÇÃO: LIMPAR FILTROS DE PAGAMENTOS
// ============================================
function limparFiltrosPagamentos() {
  document.getElementById("filtroStatus").value = "";
  document.getElementById("filtroDataDe").value = "";
  document.getElementById("filtroDataAte").value = "";
  document.getElementById("filtroValorMin").value = "";
  document.getElementById("filtroValorMax").value = "";
  
  // Renderizar tabela completa sem filtros
  const tabelaExistente = document.querySelector('table');
  if (tabelaExistente) tabelaExistente.remove();
  
  // Remover mensagem de "nenhum cliente"
  const mensagem = conteudo.querySelector('p');
  if (mensagem) mensagem.remove();
  
  renderizarTabelaPagamentosFiltered(window.todosClientesPagamentos);
}

// ============================================
// FUNÇÃO: RENDERIZAR FILTROS DE CLIENTES
// ============================================
function renderizarFiltrosClientes() {
  const filtrosHTML = `
    <div id="filtrosClientes" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
      
      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Nome</label>
        <input type="text" id="filtroNomeCliente" placeholder="Pesquisar..." onkeyup="aplicarFiltrosClientes()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Min. Vendas</label>
        <input type="number" id="filtroMinVendas" placeholder="0" onchange="aplicarFiltrosClientes()" min="0" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Data Cadastro Início</label>
        <input type="date" id="filtroDataInicioCliente" onchange="aplicarFiltrosClientes()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Data Cadastro Fim</label>
        <input type="date" id="filtroDataFimCliente" onchange="aplicarFiltrosClientes()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Data Venda Início</label>
        <input type="date" id="filtroDataVendaInicioCliente" onchange="aplicarFiltrosClientes()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Data Venda Fim</label>
        <input type="date" id="filtroDataVendaFimCliente" onchange="aplicarFiltrosClientes()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Produto Pronto</label>
        <select id="filtroProdutoPronto" onchange="aplicarFiltrosClientes()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
          <option value="">Todos</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Satisfação</label>
        <select id="filtroSatisfacao" onchange="aplicarFiltrosClientes()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
          <option value="">Todos</option>
          <option value="satisfeitos">Satisfeitos</option>
          <option value="insatisfeitos">Insatisfeitos</option>
          <option value="nao-informado">Não Informado</option>
        </select>
      </div>

      <div>
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Ordenar</label>
        <select id="filtroOrdenacaoCliente" onchange="aplicarFiltrosClientes()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
          <option value="">Padrão</option>
          <option value="venda_asc">Venda: Mais Antiga Primeiro</option>
          <option value="venda_desc">Venda: Mais Recente Primeiro</option>
        </select>
      </div>

      <div style="display: flex; gap: 5px; align-items: flex-end;">
        <button onclick="limparFiltrosClientes()" style="flex: 1; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">🔄 Limpar</button>
      </div>

    </div>
  `;
  
  // Inserir filtros no topo do conteúdo
  conteudo.insertAdjacentHTML('afterbegin', filtrosHTML);
}

// ============================================
// FUNÇÃO: APLICAR FILTROS DE CLIENTES
// ============================================
function aplicarFiltrosClientes() {
  const nome = document.getElementById("filtroNomeCliente")?.value.toLowerCase() || "";
  const minVendas = parseInt(document.getElementById("filtroMinVendas")?.value) || 0;
  const dataInicio = document.getElementById("filtroDataInicioCliente")?.value || "";
  const dataFim = document.getElementById("filtroDataFimCliente")?.value || "";
  const dataVendaInicio = document.getElementById("filtroDataVendaInicioCliente")?.value || "";
  const dataVendaFim = document.getElementById("filtroDataVendaFimCliente")?.value || "";
  const produtoPronto = document.getElementById("filtroProdutoPronto")?.value || "";
  const satisfacao = document.getElementById("filtroSatisfacao")?.value || "";
  const ordenacao = document.getElementById("filtroOrdenacaoCliente")?.value || "";

  const filtrados = window.dadosOriginais.filter(cliente => {
    // Filtro de nome
    if (nome && !cliente.Nome.toLowerCase().includes(nome)) return false;

    // Filtro de vendas mínimas
    const numVendas = cliente.Vendas ? cliente.Vendas.length : 0;
    if (minVendas > 0 && numVendas < minVendas) return false;

    // Filtro de datas de cadastro (se tiver campo de data no cliente, filtrar)
    if (dataInicio && cliente.DataCadastro) {
      if (new Date(cliente.DataCadastro) < new Date(dataInicio)) return false;
    }
    if (dataFim && cliente.DataCadastro) {
      if (new Date(cliente.DataCadastro) > new Date(dataFim)) return false;
    }

    // Filtro de data de venda (verifica em todas as vendas)
    if (dataVendaInicio || dataVendaFim) {
      if (!cliente.Vendas || cliente.Vendas.length === 0) return false;
      
      const temVendaNoPeriodo = cliente.Vendas.some(venda => {
        const dataVenda = venda.DataVenda ? new Date(venda.DataVenda) : null;
        if (!dataVenda) return false;
        
        if (dataVendaInicio && dataVenda < new Date(dataVendaInicio)) return false;
        if (dataVendaFim && dataVenda > new Date(dataVendaFim)) return false;
        
        return true;
      });
      
      if (!temVendaNoPeriodo) return false;
    }

    // Filtro de produto pronto
    if (produtoPronto) {
      const temProduto = cliente.ProdutoPronto === true;
      if (produtoPronto === "sim" && !temProduto) return false;
      if (produtoPronto === "nao" && temProduto) return false;
    }

    // Filtro de satisfação
    if (satisfacao) {
      if (satisfacao === "satisfeitos" && !cliente.Satisfeito) return false;
      if (satisfacao === "insatisfeitos" && cliente.Satisfeito !== false) return false;
      if (satisfacao === "nao-informado" && cliente.Satisfeito !== null && cliente.Satisfeito !== undefined) return false;
    }

    return true;
  });

  // Aplicar ordenação
  if (ordenacao === "venda_asc") {
    // Mais antiga primeiro
    filtrados.sort((a, b) => {
      const dataA = a.Vendas && a.Vendas.length > 0 ? new Date(a.Vendas[0].DataVenda) : new Date("9999-12-31");
      const dataB = b.Vendas && b.Vendas.length > 0 ? new Date(b.Vendas[0].DataVenda) : new Date("9999-12-31");
      return dataA - dataB;
    });
  } else if (ordenacao === "venda_desc") {
    // Mais recente primeiro
    filtrados.sort((a, b) => {
      const dataA = a.Vendas && a.Vendas.length > 0 ? new Date(a.Vendas[0].DataVenda) : new Date("1900-01-01");
      const dataB = b.Vendas && b.Vendas.length > 0 ? new Date(b.Vendas[0].DataVenda) : new Date("1900-01-01");
      return dataB - dataA;
    });
  }

  renderizarTabela("clientes", filtrados);
}

// ============================================
// FUNÇÃO: LIMPAR FILTROS DE CLIENTES
// ============================================
function limparFiltrosClientes() {
  document.getElementById("filtroNomeCliente").value = "";
  document.getElementById("filtroMinVendas").value = "";
  document.getElementById("filtroDataInicioCliente").value = "";
  document.getElementById("filtroDataFimCliente").value = "";
  document.getElementById("filtroDataVendaInicioCliente").value = "";
  document.getElementById("filtroDataVendaFimCliente").value = "";
  document.getElementById("filtroProdutoPronto").value = "";
  document.getElementById("filtroSatisfacao").value = "";
  document.getElementById("filtroOrdenacaoCliente").value = "";
  
  renderizarTabela("clientes", window.dadosOriginais);
}

// ============================================
// FUNÇÃO: RENDERIZAR FILTROS DE INSUMOS
// ============================================
function renderizarFiltrosInsumos() {
  const filtrosHTML = `
    <div id="filtrosInsumos" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
      
      <div style="flex: 1;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Pesquisar Insumo</label>
        <input type="text" id="filtroNomeInsumo" placeholder="Nome..." onkeyup="aplicarFiltrosInsumos()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
      </div>

      <div style="display: flex; gap: 5px; align-items: flex-end;">
        <button onclick="limparFiltrosInsumos()" style="flex: 1; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">🔄 Limpar</button>
      </div>

    </div>
  `;
  
  // Inserir filtros no topo do conteúdo
  conteudo.insertAdjacentHTML('afterbegin', filtrosHTML);
}

// ============================================
// FUNÇÃO: APLICAR FILTROS DE INSUMOS
// ============================================
function aplicarFiltrosInsumos() {
  const nome = document.getElementById("filtroNomeInsumo")?.value.toLowerCase() || "";

  const filtrados = window.dadosOriginais.filter(insumo => {
    if (nome && !insumo.Nome.toLowerCase().includes(nome)) return false;
    return true;
  });

  renderizarTabela("insumos", filtrados);
}

// ============================================
// FUNÇÃO: LIMPAR FILTROS DE INSUMOS
// ============================================
function limparFiltrosInsumos() {
  document.getElementById("filtroNomeInsumo").value = "";
  renderizarTabela("insumos", window.dadosOriginais);
}

// ============================================
// FUNÇÃO: RENDERIZAR FILTROS DE TRANSPORTE
// ============================================
function renderizarFiltrosTransporte() {
  const filtrosHTML = `
    <div id="filtrosTransporte" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
      
      <div style="flex: 1;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333; font-size: 14px;">Pesquisar</label>
        <input type="text" id="filtroNomeTransporte" placeholder="Cliente/Cidade..." onkeyup="aplicarFiltrosTransporte()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
      </div>

      <div style="display: flex; gap: 5px; align-items: flex-end;">
        <button onclick="limparFiltrosTransporte()" style="flex: 1; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">🔄 Limpar</button>
      </div>

    </div>
  `;
  
  // Inserir filtros no topo do conteúdo
  conteudo.insertAdjacentHTML('afterbegin', filtrosHTML);
}

// ============================================
// FUNÇÃO: APLICAR FILTROS DE TRANSPORTE
// ============================================
function aplicarFiltrosTransporte() {
  const termo = document.getElementById("filtroNomeTransporte")?.value.toLowerCase() || "";

  const filtrados = window.dadosOriginais.filter(transporte => {
    if (termo && !JSON.stringify(transporte).toLowerCase().includes(termo)) return false;
    return true;
  });

  renderizarTabela("transporte", filtrados);
}

// ============================================
// FUNÇÃO: LIMPAR FILTROS DE TRANSPORTE
// ============================================
function limparFiltrosTransporte() {
  document.getElementById("filtroNomeTransporte").value = "";
  renderizarTabela("transporte", window.dadosOriginais);
}

// ============================================
// FUNÇÃO: LOGOUT
// ============================================
function logout() {
  if (confirm("Deseja sair da sua conta?")) {
    fazerLogout();
  }
}

// ============================================
// FUNÇÃO: ATUALIZAR METAS INTELIGENTES
// Calcula metas baseado em inadimplência, despesas e boletos
// ============================================
async function atualizarMetasInteligentes() {
  try {
    // 1. Carregar configuração de metas do localStorage
    const configMetas = JSON.parse(localStorage.getItem('configMetas') || '{}');
    
    // 2. Carregar dados de clientes do localStorage
    const clientesJSON = localStorage.getItem('clientes');
    const clientes = clientesJSON ? JSON.parse(clientesJSON) : [];
    
    // 3. Carregar dados de despesas
    const despesasJSON = localStorage.getItem('despesas');
    const despesas = despesasJSON ? JSON.parse(despesasJSON) : [];
    
    // 4. Calcular taxa de inadimplência
    const totalClientes = clientes.length || 1;
    const clientesInadimplentes = clientes.filter(c => verificarInadimplenciaCliente(c)).length;
    const taxaInadimplencia = totalClientes > 0 ? ((clientesInadimplentes / totalClientes) * 100).toFixed(1) : 0;
    
    // 5. Calcular despesas fixas (próximo mês)
    const agora = new Date();
    const proximoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
    const despesasFixasProximoMes = despesas
      .filter(d => d.Tipo === 'Fixa' || d.Tipo === 'FIXA')
      .reduce((acc, d) => acc + (parseFloat(d.Valor) || 0), 0);
    
    // 6. Calcular boletos a receber (próximo mês)
    let boletosAReceberProximoMes = 0;
    clientes.forEach(cliente => {
      if (cliente.Vendas) {
        cliente.Vendas.forEach(venda => {
          if (venda.Parcelas) {
            venda.Parcelas.forEach(parcela => {
              const dataVencimento = new Date(parcela.DataVencimento);
              if (dataVencimento.getMonth() === proximoMes.getMonth() && 
                  dataVencimento.getFullYear() === proximoMes.getFullYear() &&
                  !parcela.Pago) {
                boletosAReceberProximoMes += parseFloat(parcela.Valor) || 0;
              }
            });
          }
        });
      }
    });
    
    // 7. Retornar objeto com metas calculadas
    const metasCalculadas = {
      taxaInadimplencia: parseFloat(taxaInadimplencia),
      despesasFixasProximoMes: despesasFixasProximoMes,
      boletosAReceberProximoMes: boletosAReceberProximoMes,
      clientesInadimplentes: clientesInadimplentes,
      totalClientes: totalClientes,
      receitaLiquida: boletosAReceberProximoMes * (1 - parseFloat(taxaInadimplencia) / 100),
      metaMinima: despesasFixasProximoMes * 1.2, // Meta mínima = 20% acima das despesas
      metaAlvo: despesasFixasProximoMes * 1.5    // Meta alvo = 50% acima das despesas
    };
    
    console.log('📊 Metas Inteligentes Calculadas:', metasCalculadas);
    return metasCalculadas;
  } catch (erro) {
    console.error('❌ Erro ao calcular metas inteligentes:', erro);
    
    // Retornar valores padrão em caso de erro
    return {
      taxaInadimplencia: 0,
      despesasFixasProximoMes: 0,
      boletosAReceberProximoMes: 0,
      clientesInadimplentes: 0,
      totalClientes: 0,
      receitaLiquida: 0,
      metaMinima: 0,
      metaAlvo: 0
    };
  }
}

// ============================================
// FUNÇÃO: CALCULAR COMISSÃO DO MÊS ATUAL
// ============================================
async function calcularComissaoMesAtual() {
  try {
    // Carregar dados de vendas do localStorage
    const vendedoresJSON = localStorage.getItem('vendedores');
    const vendedores = vendedoresJSON ? JSON.parse(vendedoresJSON) : {};
    
    const clientesJSON = localStorage.getItem('clientes');
    const clientes = clientesJSON ? JSON.parse(clientesJSON) : [];
    
    // Carregar configuração de comissão
    const configMetas = JSON.parse(localStorage.getItem('configMetas') || '{}');
    const percentualComissao = parseFloat(configMetas.percentualComissao || 5);
    
    const agora = new Date();
    const mesAtual = agora.getMonth() + 1;
    const anoAtual = agora.getFullYear();
    
    const comissoes = {};
    let comissaoTotalGeral = 0;
    
    // Calcular comissão por vendedor
    Object.keys(vendedores).forEach(vendedor => {
      let vendaTotal = 0;
      
      clientes.forEach(cliente => {
        if (cliente.Vendedor === vendedor && cliente.Vendas) {
          cliente.Vendas.forEach(venda => {
            const dataVenda = new Date(venda.DataVenda || venda.Data);
            if (dataVenda.getMonth() + 1 === mesAtual && dataVenda.getFullYear() === anoAtual) {
              vendaTotal += parseFloat(venda.Total || 0);
            }
          });
        }
      });
      
      const comissaoVendedor = vendaTotal * (percentualComissao / 100);
      comissoes[vendedor] = comissaoVendedor;
      comissaoTotalGeral += comissaoVendedor;
    });
    
    // Obter usuário para verificar se é admin
    const usuario = obterUsuario();
    const isAdmin = (usuario && usuario.modulos && usuario.modulos.includes('Administrador')) || 
                    (usuario && usuario.ModulosPermitidos && usuario.ModulosPermitidos.includes('Administrador'));
    
    // Construir array de comissões
    const comissoesArray = Object.entries(comissoes).map(([vendedor, valor]) => ({
      vendedor,
      valor: parseFloat(valor) || 0
    }));
    
    const resultado = {
      comissaoTotal: comissaoTotalGeral,
      percentualComissao: percentualComissao,
      comissoes: comissoes,
      comissoesArray: comissoesArray,
      isAdmin: isAdmin,
      mesAtual: mesAtual,
      anoAtual: anoAtual
    };
    
    console.log('💰 Comissões do Mês Atual:', resultado);
    return resultado;
  } catch (erro) {
    console.error('❌ Erro ao calcular comissões:', erro);
    return {
      comissaoTotal: 0,
      percentualComissao: 0,
      comissoes: {},
      comissoesArray: [],
      isAdmin: false,
      mesAtual: new Date().getMonth() + 1,
      anoAtual: new Date().getFullYear()
    };
  }
}


