// ============================================
// MÓDULO DE ADMINISTRAÇÃO DE USUÁRIOS
// ============================================

const adminDeviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
let usuariosAtivos = [];
let usuarioEmEdicao = null;

// Módulos disponíveis no sistema
const MODULOS_SISTEMA = [
  "Clientes",
  "Insumos",
  "Transporte",
  "Pagamentos",
  "Receitas",
  "Despesas",
  "Análise Vendedor",
  "AutoWhatsApp",
  "Administrador"
];

// ============================================
// INICIALIZAÇÃO
// ============================================
window.addEventListener('load', async () => {
  console.log('🚀 Iniciando módulo de administração de usuários...');
  
  // Renderizar sidebar com módulos
  renderizarSidebarAdmin();
  
  // Verificar se é administrador
  if (!temPermissaoAdministrador()) {
    alert('❌ Você não tem permissão para acessar este módulo!');
    window.location.href = 'index.html';
    return;
  }

  // Renderizar checkboxes de módulos
  renderizarModulosCheckbox();
  
  // Carregar usuários
  await carregarUsuarios();
  
  // Carregar config de metas quando a página inicia (para a aba metas ficar pronta)
  setTimeout(() => {
    carregarConfigMetas();
  }, 500);
});

// ============================================
// VERIFICAR PERMISSÃO DE ADMINISTRADOR
// ============================================
function temPermissaoAdministrador() {
  const usuario = obterUsuario();
  if (!usuario) return false;
  
  const modulos = usuario.ModulosPermitidos || usuario.modulos || [];
  return modulos.includes('Administrador');
}

// ============================================
// CARREGAR USUÁRIOS DO DRIVE
// ============================================
async function carregarUsuarios() {
  try {
    const tabelaContainer = document.getElementById('tabelaUsuarios');
    tabelaContainer.innerHTML = `
      <tr>
        <td colspan="6" class="loading">
          <div class="spinner"></div>
          Carregando usuários...
        </td>
      </tr>
    `;

    const response = await fetch(
      `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.USUARIOS}&deviceId=${adminDeviceId}`
    );

    if (!response.ok) throw new Error('Erro ao buscar usuários');

    let dados = await response.json();

    // Se for string, tenta parsear
    if (typeof dados === 'string') {
      try {
        dados = JSON.parse(dados);
      } catch (e) {
        dados = [];
      }
    }

    usuariosAtivos = Array.isArray(dados) ? dados : [];
    console.log('✅ Usuários carregados:', usuariosAtivos.length);
    
    renderizarTabelaUsuarios();

  } catch (erro) {
    console.error('❌ Erro ao carregar usuários:', erro);
    mostrarMensagem('Erro ao carregar usuários: ' + erro.message, 'erro');
    document.getElementById('tabelaUsuarios').innerHTML = `
      <tr>
        <td colspan="6" style="color: #ff9999; padding: 20px;">
          Erro ao carregar usuários. Tente novamente.
        </td>
      </tr>
    `;
  }
}

// ============================================
// RENDERIZAR TABELA DE USUÁRIOS
// ============================================
function renderizarTabelaUsuarios() {
  const tabelaContainer = document.getElementById('tabelaUsuarios');

  if (usuariosAtivos.length === 0) {
    tabelaContainer.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
          📭 Nenhum usuário cadastrado. Clique em "+ Novo Usuário" para começar.
        </td>
      </tr>
    `;
    return;
  }

  tabelaContainer.innerHTML = usuariosAtivos.map(usuario => `
    <tr>
      <td>
        <strong>${usuario.Nome || 'N/A'}</strong>
      </td>
      <td>
        ${usuario.Email || 'N/A'}
      </td>
      <td>
        <code style="background: rgba(255,255,255,.1); padding: 4px 8px; border-radius: 4px;">
          ${usuario.Login || 'N/A'}
        </code>
      </td>
      <td>
        <span style="font-size: 12px; color: #d4af37;">
          ${(usuario.ModulosPermitidos || []).length > 0 
            ? usuario.ModulosPermitidos.slice(0, 2).join(', ') + (usuario.ModulosPermitidos.length > 2 ? ` +${usuario.ModulosPermitidos.length - 2}` : '')
            : 'Nenhum'}
        </span>
      </td>
      <td>
        <span class="status-badge status-ativo">✓ Ativo</span>
      </td>
      <td>
        <div class="acoes">
          <button class="btn-acao" onclick="editarUsuario(${usuario.Id})">✏️ Editar</button>
          <button class="btn-acao delete" onclick="confirmarDelecao(${usuario.Id})">🗑️ Deletar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ============================================
// FILTRAR USUÁRIOS POR PESQUISA
// ============================================
function filtrarUsuarios() {
  const termo = document.getElementById('pesquisaUsuarios').value.toLowerCase();
  
  const usuariosFiltrados = usuariosAtivos.filter(usuario => 
    usuario.Nome.toLowerCase().includes(termo) ||
    usuario.Email.toLowerCase().includes(termo) ||
    usuario.Login.toLowerCase().includes(termo)
  );

  const tabelaContainer = document.getElementById('tabelaUsuarios');

  if (usuariosFiltrados.length === 0) {
    tabelaContainer.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
          🔍 Nenhum usuário encontrado para "${termo}"
        </td>
      </tr>
    `;
    return;
  }

  tabelaContainer.innerHTML = usuariosFiltrados.map(usuario => `
    <tr>
      <td>
        <strong>${usuario.Nome || 'N/A'}</strong>
      </td>
      <td>
        ${usuario.Email || 'N/A'}
      </td>
      <td>
        <code style="background: rgba(255,255,255,.1); padding: 4px 8px; border-radius: 4px;">
          ${usuario.Login || 'N/A'}
        </code>
      </td>
      <td>
        <span style="font-size: 12px; color: #d4af37;">
          ${(usuario.ModulosPermitidos || []).length > 0 
            ? usuario.ModulosPermitidos.slice(0, 2).join(', ') + (usuario.ModulosPermitidos.length > 2 ? ` +${usuario.ModulosPermitidos.length - 2}` : '')
            : 'Nenhum'}
        </span>
      </td>
      <td>
        <span class="status-badge status-ativo">✓ Ativo</span>
      </td>
      <td>
        <div class="acoes">
          <button class="btn-acao" onclick="editarUsuario(${usuario.Id})">✏️ Editar</button>
          <button class="btn-acao delete" onclick="confirmarDelecao(${usuario.Id})">🗑️ Deletar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ============================================
// RENDERIZAR CHECKBOXES DE MÓDULOS
// ============================================
function renderizarModulosCheckbox() {
  const grid = document.getElementById('modulosGrid');
  
  grid.innerHTML = MODULOS_SISTEMA.map(modulo => `
    <div class="modulo-item">
      <label>
        <input type="checkbox" name="modulo" value="${modulo}">
        ${modulo}
      </label>
    </div>
  `).join('');
}

// ============================================
// CARREGAR E RENDERIZAR VENDEDORES
// ============================================
async function carregarVendedoresCheckboxes() {
  try {
    const clientes = await buscarArquivo('clientes.json');
    const clientesList = Array.isArray(clientes) ? clientes : [];
    
    // Extrair vendedores únicos
    const vendedoresSet = new Set();
    clientesList.forEach(cliente => {
      if (cliente.Vendedor) {
        vendedoresSet.add(cliente.Vendedor);
      }
    });
    
    const vendedores = Array.from(vendedoresSet).sort();
    console.log(`📊 Vendedores únicos encontrados: ${vendedores.length}`, vendedores);
    
    // Renderizar checkboxes de comissão
    const gridComissao = document.getElementById('vendedoresComissaoGrid');
    gridComissao.innerHTML = vendedores.length > 0 
      ? vendedores.map(vendedor => `
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <input 
            type="checkbox" 
            name="vendedor-comissao" 
            value="${vendedor}" 
            id="comissao-${vendedor}"
            style="margin-right: 8px; cursor: pointer;"
          >
          <label for="comissao-${vendedor}" style="cursor: pointer; flex: 1; margin: 0;">${vendedor}</label>
        </div>
      `).join('')
      : '<p style="color: #999; font-size: 11px;">Nenhum vendedor encontrado</p>';
    
    // Renderizar checkboxes de visualização
    const gridVisualizacao = document.getElementById('vendedoresVisualizacaoGrid');
    gridVisualizacao.innerHTML = vendedores.length > 0
      ? vendedores.map(vendedor => `
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <input 
            type="checkbox" 
            name="vendedor-visualizacao" 
            value="${vendedor}" 
            id="visual-${vendedor}"
            style="margin-right: 8px; cursor: pointer;"
          >
          <label for="visual-${vendedor}" style="cursor: pointer; flex: 1; margin: 0;">${vendedor}</label>
        </div>
      `).join('')
      : '<p style="color: #999; font-size: 11px;">Nenhum vendedor encontrado</p>';
      
  } catch (erro) {
    console.error('❌ Erro ao carregar vendedores:', erro);
    document.getElementById('vendedoresComissaoGrid').innerHTML = '<p style="color: #ff6b6b;">Erro ao carregar vendedores</p>';
    document.getElementById('vendedoresVisualizacaoGrid').innerHTML = '<p style="color: #ff6b6b;">Erro ao carregar vendedores</p>';
  }
}

// ============================================
// ABRIR MODAL NOVO USUÁRIO
// ============================================
async function abrirModalNovoUsuario() {
  usuarioEmEdicao = null;
  document.getElementById('modalTitulo').textContent = '➕ Novo Usuário';
  
  // Limpar formulário
  document.getElementById('formularioUsuario').reset();
  document.querySelectorAll('input[name="modulo"]').forEach(cb => cb.checked = false);
  document.getElementById('inputSenha').style.display = 'block';
  
  // Carregar e renderizar vendedores
  await carregarVendedoresCheckboxes();
  
  // Limpar seleções de vendedores
  document.querySelectorAll('input[name="vendedor-comissao"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('input[name="vendedor-visualizacao"]').forEach(cb => cb.checked = false);
  
  // Abrir modal
  document.getElementById('modalUsuario').classList.add('active');
}

// ============================================
// EDITAR USUÁRIO
// ============================================
async function editarUsuario(id) {
  usuarioEmEdicao = usuariosAtivos.find(u => u.Id === id);
  
  if (!usuarioEmEdicao) {
    mostrarMensagem('❌ Usuário não encontrado', 'erro');
    return;
  }

  document.getElementById('modalTitulo').textContent = '✏️ Editar Usuário';
  
  // Preencher formulário
  document.getElementById('inputNome').value = usuarioEmEdicao.Nome || '';
  document.getElementById('inputEmail').value = usuarioEmEdicao.Email || '';
  document.getElementById('inputLogin').value = usuarioEmEdicao.Login || '';
  document.getElementById('inputSenha').value = usuarioEmEdicao.Senha || '';
  
  // Marcar módulos permitidos
  document.querySelectorAll('input[name="modulo"]').forEach(cb => {
    cb.checked = (usuarioEmEdicao.ModulosPermitidos || []).includes(cb.value);
  });

  // Carregar e renderizar vendedores
  await carregarVendedoresCheckboxes();
  
  // Marcar vendedores para comissão
  const vendedoresComissao = usuarioEmEdicao.VendedoresPermitidos || [];
  document.querySelectorAll('input[name="vendedor-comissao"]').forEach(cb => {
    cb.checked = vendedoresComissao.includes(cb.value);
  });
  
  // Marcar vendedores para visualização
  const vendedoresVisualizacao = usuarioEmEdicao.VendedoresVisualizacao || [];
  document.querySelectorAll('input[name="vendedor-visualizacao"]').forEach(cb => {
    cb.checked = vendedoresVisualizacao.includes(cb.value);
  });

  // Mostrar campo de senha como opcional em edição
  const labelSenha = document.querySelector('label[for="inputSenha"]') || 
    Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Senha'));
  
  document.getElementById('modalUsuario').classList.add('active');
}

// ============================================
// SALVAR USUÁRIO
// ============================================
async function salvarUsuario(event) {
  event.preventDefault();

  try {
    const nome = document.getElementById('inputNome').value.trim();
    const email = document.getElementById('inputEmail').value.trim();
    const login = document.getElementById('inputLogin').value.trim();
    const senha = document.getElementById('inputSenha').value.trim();

    // Validações
    if (!nome || !email || !login || (!usuarioEmEdicao && !senha)) {
      mostrarMensagem('❌ Preencha todos os campos obrigatórios!', 'erro');
      return;
    }

    if (!email.includes('@')) {
      mostrarMensagem('❌ Email inválido!', 'erro');
      return;
    }

    if (login.length < 3) {
      mostrarMensagem('❌ Login deve ter no mínimo 3 caracteres!', 'erro');
      return;
    }

    // Obter módulos selecionados
    const modulos = Array.from(document.querySelectorAll('input[name="modulo"]:checked'))
      .map(cb => cb.value);

    if (modulos.length === 0) {
      mostrarMensagem('❌ Selecione pelo menos um módulo!', 'erro');
      return;
    }

    // Obter vendedores para comissão
    const vendedoresComissao = Array.from(document.querySelectorAll('input[name="vendedor-comissao"]:checked'))
      .map(cb => cb.value);
    
    // Obter vendedores para visualização
    const vendedoresVisualizacao = Array.from(document.querySelectorAll('input[name="vendedor-visualizacao"]:checked'))
      .map(cb => cb.value);

    let usuario;

    if (usuarioEmEdicao) {
      // Editar usuário existente
      usuario = {
        ...usuarioEmEdicao,
        Nome: nome,
        Email: email,
        Login: login,
        ModulosPermitidos: modulos,
        VendedoresPermitidos: vendedoresComissao,
        VendedoresVisualizacao: vendedoresVisualizacao
      };

      // Atualizar senha apenas se fornecida
      if (senha) {
        usuario.Senha = senha;
      }

      // Encontrar e atualizar na lista
      const indice = usuariosAtivos.findIndex(u => u.Id === usuario.Id);
      if (indice !== -1) {
        usuariosAtivos[indice] = usuario;
      }

      console.log('📝 Usuário atualizado:', usuario);
    } else {
      // Criar novo usuário
      usuario = {
        Id: Math.max(...usuariosAtivos.map(u => u.Id || 0), 0) + 1,
        Nome: nome,
        Email: email,
        Login: login,
        Senha: senha,
        ModulosPermitidos: modulos,
        VendedoresPermitidos: vendedoresComissao,
        VendedoresVisualizacao: vendedoresVisualizacao,
        PermiteMetaMinima: false,
        PermiteMetaDesejada: false,
        PermitePrevGanhoMes: false,
        PermiteGanhoParticipacaoAno: false,
        PermiteVendidoMesAtual: false,
        PermiteGanhoRealMes: false,
        MetaPanelX: -1,
        MetaPanelY: -1,
        MetaPanelWidth: 340,
        MetaPanelHeight: 280,
        MetaPanelLocked: false,
        MetaPanelFontSize: 0
      };

      usuariosAtivos.push(usuario);
      console.log('✨ Novo usuário criado:', usuario);
    }

    // Salvar no Drive
    const resultado = await salvarUsuariosNoDrive();

    if (resultado) {
      // Registrar auditoria
      if (usuarioEmEdicao) {
        await registrarAuditoria(
          'Atualizar',
          'Usuario',
          usuario.Id,
          usuario.Nome,
          `Administrador atualizou usuário: ${usuario.Nome}`,
          usuarioEmEdicao,
          usuario
        );
      } else {
        await registrarAuditoria(
          'Criar',
          'Usuario',
          usuario.Id,
          usuario.Nome,
          `Administrador criou novo usuário: ${usuario.Nome}`,
          {},
          usuario
        );
      }

      mostrarMensagem(
        usuarioEmEdicao 
          ? '✅ Usuário atualizado com sucesso!' 
          : '✅ Usuário criado com sucesso!',
        'sucesso'
      );

      fecharModal();
      renderizarTabelaUsuarios();
    } else {
      throw new Error('Falha ao salvar usuário');
    }

  } catch (erro) {
    console.error('❌ Erro ao salvar usuário:', erro);
    mostrarMensagem('❌ Erro ao salvar: ' + erro.message, 'erro');
  }
}

// ============================================
// CONFIRMAR DELEÇÃO
// ============================================
function confirmarDelecao(id) {
  const usuario = usuariosAtivos.find(u => u.Id === id);
  
  if (!usuario) {
    mostrarMensagem('❌ Usuário não encontrado', 'erro');
    return;
  }

  if (confirm(`⚠️ Tem certeza que deseja deletar o usuário "${usuario.Nome}"?\n\nEsta ação não pode ser desfeita!`)) {
    deletarUsuario(id);
  }
}

// ============================================
// DELETAR USUÁRIO
// ============================================
async function deletarUsuario(id) {
  try {
    const indice = usuariosAtivos.findIndex(u => u.Id === id);
    
    if (indice === -1) {
      mostrarMensagem('❌ Usuário não encontrado', 'erro');
      return;
    }

    const usuarioDeletado = usuariosAtivos[indice];
    usuariosAtivos.splice(indice, 1);

    console.log('🗑️ Usuário deletado:', usuarioDeletado);

    const resultado = await salvarUsuariosNoDrive();

    if (resultado) {
      // Registrar auditoria
      await registrarAuditoria(
        'Deletar',
        'Usuario',
        usuarioDeletado.Id,
        usuarioDeletado.Nome,
        `Administrador deletou usuário: ${usuarioDeletado.Nome}`,
        usuarioDeletado,
        {}
      );

      mostrarMensagem(`✅ Usuário "${usuarioDeletado.Nome}" deletado com sucesso!`, 'sucesso');
      renderizarTabelaUsuarios();
    } else {
      throw new Error('Falha ao deletar usuário');
    }

  } catch (erro) {
    console.error('❌ Erro ao deletar usuário:', erro);
    mostrarMensagem('❌ Erro ao deletar: ' + erro.message, 'erro');
  }
}

// ============================================
// SALVAR USUÁRIOS NO DRIVE
// ============================================
async function salvarUsuariosNoDrive() {
  try {
    const dadosJson = JSON.stringify(usuariosAtivos);

    console.log('📤 Enviando dados para salvar:', {
      acao: 'salvar',
      arquivo: CONFIG.ARQUIVOS.USUARIOS,
      tamanhoDados: dadosJson.length,
      usuariosCount: usuariosAtivos.length
    });

    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'acao': 'salvar',
        'arquivo': CONFIG.ARQUIVOS.USUARIOS,
        'dados': dadosJson,
        'deviceId': adminDeviceId
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
                       resultado.mensaje === 'Arquivo salvo com sucesso' ||
                       resultado.mensagem === 'Arquivo salvo com sucesso' ||
                       !resultado.erro;

    if (!foiSucesso) {
      console.error('❌ Falha na resposta:', resultado);
      throw new Error('Servidor retornou erro: ' + (resultado.mensagem || resultado.error || 'Desconhecido'));
    }

    return true;

  } catch (erro) {
    console.error('❌ Erro ao salvar usuários:', erro);
    throw erro;
  }
}

// ============================================
// FECHAR MODAL
// ============================================
function fecharModal() {
  document.getElementById('modalUsuario').classList.remove('active');
  usuarioEmEdicao = null;
  document.getElementById('formularioUsuario').reset();
}

// ============================================
// MOSTRAR MENSAGEM
// ============================================
function mostrarMensagem(texto, tipo) {
  const div = document.createElement('div');
  div.className = `mensagem ${tipo}`;
  div.textContent = texto;
  document.body.appendChild(div);

  setTimeout(() => {
    div.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => div.remove(), 300);
  }, 3000);
}

// Fechar modal ao clicar fora
document.addEventListener('click', (event) => {
  const modal = document.getElementById('modalUsuario');
  if (event.target === modal) {
    fecharModal();
  }
});

// ============================================
// FUNÇÕES DE ABAS
// ============================================
function mudarAba(abaId, el) {
  // Remove ativo
  document.querySelectorAll('.aba-botao').forEach(b => b.classList.remove('ativo'));
  document.querySelectorAll('.aba-conteudo').forEach(c => c.classList.remove('ativo'));

  // Marcar botão ativo: se elemento foi passado, usa ele; caso contrário, tenta encontrar pelo onclick
  if (el && el.classList) {
    el.classList.add('ativo');
  } else {
    const btn = Array.from(document.querySelectorAll('.aba-botao')).find(b => {
      const attr = b.getAttribute('onclick') || '';
      return attr.includes(`mudarAba('${abaId}'`) || attr.includes(`mudarAba("${abaId}")`);
    });
    if (btn) btn.classList.add('ativo');
  }

  const abaEl = document.getElementById(`aba-${abaId}`);
  if (abaEl) {
    abaEl.classList.add('ativo');
  }

  // Carregar dados se auditoria
  if (abaId === 'auditoria') {
    carregarAuditoria();
  }

  // Carregar dados se metas
  if (abaId === 'metas') {
    carregarConfigMetas();
  }
}

// ============================================
// AUDITORIA
// ============================================
let todosRegistrosAuditoria = [];
let registrosFiltrados = [];

async function carregarAuditoria() {
  try {
    const response = await fetch(
      `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.AUDITORIA}&deviceId=${adminDeviceId}`
    );

    if (!response.ok) throw new Error('Erro ao buscar auditoria');

    let dados = await response.json();
    if (typeof dados === 'string') {
      dados = JSON.parse(dados);
    }


    todosRegistrosAuditoria = Array.isArray(dados) ? dados : [];
    registrosFiltrados = [...todosRegistrosAuditoria];

    // Ordenar por data DESC
    registrosFiltrados.sort((a, b) => {
      const dataA = new Date(a.DataHora || a.data_hora);
      const dataB = new Date(b.DataHora || b.data_hora);
      return dataB - dataA;
    });

    preencherSelectUsuarios();
    renderizarTabelaAuditoria();

  } catch (erro) {
    console.error('❌ Erro ao carregar auditoria:', erro);
    // Mostrar mensagem de erro na interface e remover o spinner
    const tbody = document.getElementById('tabelaAuditoria');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="color: #ff9999; padding: 20px;">Erro ao carregar auditoria. Verifique sua conexão e tente novamente.</td>
        </tr>
      `;
    }
    try { mostrarMensagem('❌ Falha ao carregar auditoria. Veja o console para detalhes.', 'erro'); } catch (e) { /* silent */ }
  }
}

function preencherSelectUsuarios() {
  const usuarios = [...new Set(todosRegistrosAuditoria.map(r => r.NomeUsuario || r.nome_usuario))];
  const select = document.getElementById('filtroUsuarioAuditoria');
  
  // Limpar exceto primeira opção
  while (select.options.length > 1) {
    select.remove(1);
  }
  
  usuarios.forEach(usuario => {
    const option = document.createElement('option');
    option.value = usuario;
    option.textContent = usuario;
    select.appendChild(option);
  });
}

function aplicarFiltrosAuditoria() {
  const usuario = document.getElementById('filtroUsuarioAuditoria').value;
  const dataInicio = document.getElementById('filtroDataInicioAuditoria').value;
  const dataFim = document.getElementById('filtroDataFimAuditoria').value;
  const nomeObjeto = document.getElementById('filtroNomeObjetoAuditoria').value.toLowerCase();

  registrosFiltrados = todosRegistrosAuditoria.filter(r => {
    // Filtro por usuário
    if (usuario && (r.NomeUsuario || r.nome_usuario) !== usuario) return false;
    
    // Filtro por data
    if (dataInicio || dataFim) {
      const dataRegistro = new Date(r.DataHora || r.data_hora);
      if (dataInicio) {
        const dataI = new Date(dataInicio);
        if (dataRegistro < dataI) return false;
      }
      if (dataFim) {
        const dataF = new Date(dataFim);
        dataF.setHours(23, 59, 59, 999); // Fim do dia
        if (dataRegistro > dataF) return false;
      }
    }
    
    // Filtro por nome do objeto
    if (nomeObjeto) {
      const nomeObj = (r.NomeObjetoAfetado || r.nome_objeto_afetado || '').toLowerCase();
      if (!nomeObj.includes(nomeObjeto)) return false;
    }
    
    return true;
  });

  registrosFiltrados.sort((a, b) => {
    const dataA = new Date(a.DataHora || a.data_hora);
    const dataB = new Date(b.DataHora || b.data_hora);
    return dataB - dataA;
  });

  renderizarTabelaAuditoria();
}

function limparFiltrosAuditoria() {
  document.getElementById('filtroUsuarioAuditoria').value = '';
  document.getElementById('filtroDataInicioAuditoria').value = '';
  document.getElementById('filtroDataFimAuditoria').value = '';
  document.getElementById('filtroNomeObjetoAuditoria').value = '';
  
  registrosFiltrados = [...todosRegistrosAuditoria];
  registrosFiltrados.sort((a, b) => {
    const dataA = new Date(a.DataHora || a.data_hora);
    const dataB = new Date(b.DataHora || b.data_hora);
    return dataB - dataA;
  });

  renderizarTabelaAuditoria();
}

function renderizarTabelaAuditoria() {
  const tbody = document.getElementById('tabelaAuditoria');
  tbody.innerHTML = '';

  if (registrosFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="vazio">📭 Nenhum registro encontrado</td></tr>';
    return;
  }

  registrosFiltrados.slice(0, 20).forEach((registro) => {
    const dataHora = new Date(registro.DataHora || registro.data_hora);
    const dataFormatada = dataHora.toLocaleDateString('pt-BR');
    const horaFormatada = dataHora.toLocaleTimeString('pt-BR');

    const acao = registro.Acao || registro.acao;
    const usuario = registro.NomeUsuario || registro.nome_usuario;
    const nomeObjeto = registro.NomeObjetoAfetado || registro.nome_objeto_afetado;
    const descricao = registro.Descricao || registro.descricao;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dataFormatada} ${horaFormatada}</td>
      <td>${usuario}</td>
      <td><span style="background: rgba(31,163,122,.2); padding: 3px 8px; border-radius: 4px; font-size: 11px;">${acao}</span></td>
      <td><strong>${nomeObjeto}</strong></td>
      <td>${descricao}</td>
      <td><button class="btn-acao" onclick="verDetalhesAuditoriaObjeto(this)" title="Ver detalhes">🔍</button></td>
    `;
    tr.dataset.registro = JSON.stringify(registro);
    tbody.appendChild(tr);
  });
}

function verDetalhesAuditoriaObjeto(botao) {
  // Pega o registro diretamente do dataset da linha
  const tr = botao.closest('tr');
  const registro = JSON.parse(tr.dataset.registro);
  
  if (!registro) {
    console.error('❌ Registro não encontrado!');
    return;
  }

  console.log('🔍 Abrindo detalhes do registro:', registro);

  const modal = document.getElementById('modalAuditoriaDetalhes');

  const dataHora = new Date(registro.DataHora || registro.data_hora);
  const dataFormatada = dataHora.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const horaFormatada = dataHora.toLocaleTimeString('pt-BR');

  let dadosAntigos = {};
  let dadosNovos = {};

  try {
    dadosAntigos = JSON.parse(registro.DadosAntigos || registro.dados_antigos || '{}');
    dadosNovos = JSON.parse(registro.DadosNovos || registro.dados_novos || '{}');
    console.log('✅ Dados antigos parsed:', dadosAntigos);
    console.log('✅ Dados novos parsed:', dadosNovos);
  } catch (e) {
    console.warn('❌ Erro ao fazer parse dos dados:', e);
    console.warn('🔍 DadosAntigos raw:', registro.DadosAntigos);
    console.warn('🔍 DadosNovos raw:', registro.DadosNovos);
  }

  // Preencher os campos individuais
  document.getElementById('detalhesDataHora').textContent = `${dataFormatada} às ${horaFormatada}`;
  document.getElementById('detalhesUsuario').textContent = registro.NomeUsuario || registro.nome_usuario;
  document.getElementById('detalhesAcao').textContent = registro.Acao || registro.acao;
  document.getElementById('detalhesObjeto').textContent = registro.NomeObjetoAfetado || registro.nome_objeto_afetado;
  document.getElementById('detalhesDescricao').textContent = registro.Descricao || registro.descricao;
  
  const textoDadosAntigos = JSON.stringify(dadosAntigos, null, 2);
  const textoDadosNovos = JSON.stringify(dadosNovos, null, 2);
  
  console.log('📝 Texto dos dados antigos:', textoDadosAntigos);
  console.log('📝 Texto dos dados novos:', textoDadosNovos);
  
  document.getElementById('detalhesDadosAntigos').textContent = textoDadosAntigos;
  document.getElementById('detalhesDadosNovos').textContent = textoDadosNovos;

  modal.classList.add('active');
}

function verDetalhesAuditoria(indice) {
  const registro = registrosFiltrados[indice];
  if (!registro) return;

  console.log('🔍 Abrindo detalhes do registro:', registro);

  const modal = document.getElementById('modalAuditoriaDetalhes');

  const dataHora = new Date(registro.DataHora || registro.data_hora);
  const dataFormatada = dataHora.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const horaFormatada = dataHora.toLocaleTimeString('pt-BR');

  let dadosAntigos = {};
  let dadosNovos = {};

  try {
    dadosAntigos = JSON.parse(registro.DadosAntigos || registro.dados_antigos || '{}');
    dadosNovos = JSON.parse(registro.DadosNovos || registro.dados_novos || '{}');
    console.log('✅ Dados antigos parsed:', dadosAntigos);
    console.log('✅ Dados novos parsed:', dadosNovos);
  } catch (e) {
    console.warn('❌ Erro ao fazer parse dos dados:', e);
    console.warn('🔍 DadosAntigos raw:', registro.DadosAntigos);
    console.warn('🔍 DadosNovos raw:', registro.DadosNovos);
  }

  // Preencher os campos individuais
  document.getElementById('detalhesDataHora').textContent = `${dataFormatada} às ${horaFormatada}`;
  document.getElementById('detalhesUsuario').textContent = registro.NomeUsuario || registro.nome_usuario;
  document.getElementById('detalhesAcao').textContent = registro.Acao || registro.acao;
  document.getElementById('detalhesObjeto').textContent = registro.NomeObjetoAfetado || registro.nome_objeto_afetado;
  document.getElementById('detalhesDescricao').textContent = registro.Descricao || registro.descricao;
  
  const textoDadosAntigos = JSON.stringify(dadosAntigos, null, 2);
  const textoDadosNovos = JSON.stringify(dadosNovos, null, 2);
  
  console.log('📝 Texto dos dados antigos:', textoDadosAntigos);
  console.log('📝 Texto dos dados novos:', textoDadosNovos);
  
  document.getElementById('detalhesDadosAntigos').textContent = textoDadosAntigos;
  document.getElementById('detalhesDadosNovos').textContent = textoDadosNovos;

  modal.classList.add('active');
}

function fecharModalAuditoria() {
  document.getElementById('modalAuditoriaDetalhes').classList.remove('active');
}

function exportarAuditoriaCSV() {
  try {
    let csv = 'Data,Hora,Usuário,Ação,Tipo,Objeto,Descrição\n';

    registrosFiltrados.forEach(r => {
      const dataHora = new Date(r.DataHora || r.data_hora);
      const data = dataHora.toLocaleDateString('pt-BR');
      const hora = dataHora.toLocaleTimeString('pt-BR');
      const usuario = (r.NomeUsuario || r.nome_usuario).replace(/"/g, '""');
      const acao = (r.Acao || r.acao).replace(/"/g, '""');
      const tipo = (r.Tipo || r.tipo).replace(/"/g, '""');
      const objeto = (r.NomeObjetoAfetado || r.nome_objeto_afetado).replace(/"/g, '""');
      const descricao = (r.Descricao || r.descricao).replace(/"/g, '""');

      csv += `"${data}","${hora}","${usuario}","${acao}","${tipo}","${objeto}","${descricao}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarMensagem(`✅ ${registrosFiltrados.length} registros exportados!`, 'sucesso');

  } catch (erro) {
    console.error('Erro ao exportar:', erro);
    mostrarMensagem('❌ Erro ao exportar CSV', 'erro');
  }
}

document.getElementById('modalAuditoriaDetalhes').addEventListener('click', (e) => {
  if (e.target.id === 'modalAuditoriaDetalhes') fecharModalAuditoria();
});

// ============================================
// FUNÇÃO: RENDERIZAR SIDEBAR COM MÓDULOS
// ============================================
function renderizarSidebarAdmin() {
  const sidebar = document.getElementById('sidebarAdmin');
  if (!sidebar) return;

  // Módulos disponíveis (mesmo que no app.js)
  const modulosDisponiveis = {
    "Clientes": { icone: "👥", tipo: "clientes" },
    "Insumos": { icone: "📦", tipo: "insumos" },
    "Transporte": { icone: "🚚", tipo: "transporte" },
    "Pagamentos": { icone: "💳", tipo: "pagamentos" },
    "Receitas": { icone: "📈", tipo: "receitas" },
    "Despesas": { icone: "💸", tipo: "despesas" },
    "Análise Vendedor": { icone: "📊", tipo: "analise-vendedor" },
    "AutoWhatsApp": { icone: "📞", tipo: "agendar-ligacao" },
    "Administrador": { icone: "⚙️", tipo: "administrador" },
    "Auditoria": { icone: "📋", tipo: "auditoria" }
  };

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
    sidebarHTML += `
      <div class="sidebar-item" onclick="irParaModulo('${nome}', '${dados.tipo}')" title="${nome}">
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

// Função para ir para um módulo
function irParaModulo(nome, tipo) {
  // Redirecionar para index.html com o módulo carregado
  window.location.href = `index.html?modulo=${encodeURIComponent(tipo)}`;
}

// Função para adicionar novo usuário
function abrirModalNovoUsuario() {
  usuarioEmEdicao = null;
  document.getElementById('modalTitulo').textContent = '➕ Novo Usuário';
  document.getElementById('formularioUsuario').reset();
  document.getElementById('modalUsuario').classList.add('ativo');
}

// ============================================
// FUNÇÕES DE METAS
// ============================================

/**
 * Carregar configuração de metas do Drive (ou localStorage como fallback)
 */
async function carregarConfigMetas() {
  try {
    // Primeiro tenta carregar do Drive
    const response = await fetch(
      `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.CONFIG_METAS || 'configMetas.json'}&deviceId=${adminDeviceId}`
    );

    let config = {};

    if (response.ok) {
      const dados = await response.json();
      config = Array.isArray(dados) ? dados[0] || {} : (typeof dados === 'object' ? dados : {});
      console.log('📥 Config metas carregada do Drive:', config);
    } else {
      // Se falhar, tenta localStorage como fallback
      console.warn('⚠️ Não conseguiu carregar do Drive, tentando localStorage...');
      config = JSON.parse(localStorage.getItem('configMetas') || '{}');
    }
    
    // Preencher inputs (3 campos: Comissão, Valor Pro-Labore Meta Alvo, Pro-Labore Meta Mínima)
    document.getElementById('metaComissao').value = config.comissao || '';
    document.getElementById('metaProLabore').value = config.proLabore || '';
    document.getElementById('metaProLaboreMinima').value = config.proLaboreMinima || '';
    
    // Salvar também no localStorage para acesso rápido
    localStorage.setItem('configMetas', JSON.stringify(config));
    
    // Atualizar resumo
    atualizarResumoMetas();
    
  } catch (erro) {
    console.error('❌ Erro ao carregar config metas:', erro);
    // Fallback: tentar localStorage
    try {
      const config = JSON.parse(localStorage.getItem('configMetas') || '{}');
      document.getElementById('metaComissao').value = config.comissao || '';
      document.getElementById('metaProLabore').value = config.proLabore || '';
      document.getElementById('metaProLaboreMinima').value = config.proLaboreMinima || '';
      atualizarResumoMetas();
    } catch (e) {
      console.error('❌ Fallback também falhou:', e);
    }
  }
}

/**
 * Salvar configuração de metas no Drive (e localStorage como backup)
 */
async function salvarConfigMetas() {
  try {
    const config = {
      comissao: parseFloat(document.getElementById('metaComissao').value) || 0,
      proLabore: parseFloat(document.getElementById('metaProLabore').value) || 0,
      proLaboreMinima: parseFloat(document.getElementById('metaProLaboreMinima').value) || 0,
      dataSalva: new Date().toISOString(),
      mesAtual: new Date().getMonth() + 1,
      anoAtual: new Date().getFullYear()
    };
    
    // Salvar no localStorage IMEDIATAMENTE (para garantir persistência)
    localStorage.setItem('configMetas', JSON.stringify(config));
    console.log('✅ Config salva em localStorage:', config);
    
    // Salvar no Drive
    const dadosJson = JSON.stringify(config);
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'acao': 'salvar',
        'arquivo': CONFIG.ARQUIVOS.CONFIG_METAS || 'configMetas.json',
        'dados': dadosJson,
        'deviceId': adminDeviceId
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    let resultado;
    try {
      resultado = await response.json();
    } catch (e) {
      const texto = await response.text();
      console.log('⚠️ Resposta não JSON:', texto);
      resultado = { success: true, mensagem: texto };
    }

    console.log('📤 Resultado salvar config metas:', resultado);

    const foiSucesso = resultado.success === true || 
                       resultado.success === 'true' || 
                       resultado.sucesso === true ||
                       resultado.mensaje === 'Arquivo salvo com sucesso' ||
                       resultado.mensagem === 'Arquivo salvo com sucesso' ||
                       !resultado.erro;

    if (foiSucesso) {
      mostrarMensagem('✅ Configuração de metas salva no Drive!', 'sucesso');
      atualizarResumoMetas();
    } else {
      throw new Error('Servidor retornou erro: ' + (resultado.mensagem || resultado.error || 'Desconhecido'));
    }

  } catch (erro) {
    console.error('❌ Erro ao salvar config metas:', erro);
    mostrarMensagem('❌ Erro ao salvar: ' + erro.message, 'erro');
  }
}

/**
 * Atualizar o resumo visual das metas (3 campos: Comissão, Pro-Labore Alvo, Pro-Labore Mínimo)
 */
function atualizarResumoMetas() {
  const comissao = parseFloat(document.getElementById('metaComissao').value) || 0;
  const proLabore = parseFloat(document.getElementById('metaProLabore').value) || 0;
  const proLaboreMinima = parseFloat(document.getElementById('metaProLaboreMinima').value) || 0;
  
  // Atualizar cards de resumo
  document.getElementById('resumoComissao').textContent = comissao.toFixed(2) + '%';
  document.getElementById('resumoProLabore').textContent = 'R$ ' + proLabore.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById('resumoProLaboreMinima').textContent = 'R$ ' + proLaboreMinima.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

