// ============================================
// MÓDULO DE PERFIL DO USUÁRIO
// ============================================

let usuarioAtual = null;
let usuariosListaTodos = [];
let dadosOriginais = null;

const perfilDeviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();

// Módulos disponíveis no sistema
const MODULOS_SISTEMA = [
  "Clientes",
  "Insumos",
  "Transporte",
  "Pagamentos",
  "Receitas",
  "Despesas",
  "AutoWhatsApp",
  "Administrador"
];

// ============================================
// INICIALIZAÇÃO
// ============================================
window.addEventListener('load', async () => {
  console.log('🚀 Iniciando módulo de perfil do usuário...');
  
  // Obter usuário atual
  usuarioAtual = obterUsuario();
  
  if (!usuarioAtual) {
    alert('❌ Erro: Usuário não identificado');
    window.location.href = 'login.html';
    return;
  }

  console.log('👤 Usuário atual:', usuarioAtual.Nome);
  
  // Carregar dados
  await carregarDados();
  
  // Renderizar formulário
  renderizarFormulario();
});

// ============================================
// CARREGAR DADOS
// ============================================
async function carregarDados() {
  try {
    // Carregar todos os usuários para encontrar o atual
    const response = await fetch(
      `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.USUARIOS}&deviceId=${perfilDeviceId}`
    );

    if (!response.ok) throw new Error('Erro ao buscar usuários');

    let dados = await response.json();
    if (typeof dados === 'string') {
      dados = JSON.parse(dados);
    }

    usuariosListaTodos = Array.isArray(dados) ? dados : [];
    
    // Encontrar usuário atual
    usuarioAtual = usuariosListaTodos.find(u => u.Nome === usuarioAtual.Nome);
    
    if (!usuarioAtual) {
      throw new Error('Usuário não encontrado no banco de dados');
    }

    console.log('✅ Dados carregados:', usuarioAtual);
    
    // Guardar cópia original para comparação
    dadosOriginais = JSON.parse(JSON.stringify(usuarioAtual));

  } catch (erro) {
    console.error('❌ Erro ao carregar dados:', erro);
    mostrarMensagem('Erro ao carregar dados: ' + erro.message, 'erro');
  }
}

// ============================================
// RENDERIZAR FORMULÁRIO
// ============================================
function renderizarFormulario() {
  // Preencher dados básicos
  document.getElementById('inputNome').value = usuarioAtual.Nome || '';
  document.getElementById('inputEmail').value = usuarioAtual.Email || '';
  document.getElementById('inputLogin').value = usuarioAtual.Login || '';

  // Renderizar módulos como read-only (apenas leitura)
  renderizarModulosReadOnly();

  // Renderizar vendedores/clientes visíveis
  renderizarVendedoresVisíveis();
}

// ============================================
// RENDERIZAR MÓDULOS (SOMENTE LEITURA)
// ============================================
function renderizarModulosReadOnly() {
  const grid = document.getElementById('modulosGrid');
  
  const modulosPermitidos = usuarioAtual.ModulosPermitidos || [];
  
  grid.innerHTML = MODULOS_SISTEMA.map(modulo => {
    const temAcesso = modulosPermitidos.includes(modulo);
    return `
      <div class="checkbox-item" style="${temAcesso ? 'opacity: 1;' : 'opacity: 0.5; cursor: not-allowed;'}">
        <label>
          <input type="checkbox" ${temAcesso ? 'checked' : ''} disabled>
          ${modulo}
        </label>
      </div>
    `;
  }).join('');
}

// ============================================
// RENDERIZAR VENDEDORES VISÍVEIS
// ============================================
function renderizarVendedoresVisíveis() {
  const container = document.getElementById('vendedoresContainer');
  const vendedoresPermitidos = usuarioAtual.VendedoresPermitidos || [];

  if (vendedoresPermitidos.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #999;">
        👤 Nenhum vendedor/cliente configurado
        <br>
        <small>Solicite ao administrador para incluir vendedores permitidos</small>
      </div>
    `;
    return;
  }

  container.innerHTML = vendedoresPermitidos.map((vendedor, index) => `
    <div class="vendedor-item">
      <span class="vendedor-nome">👤 ${vendedor}</span>
      <button class="btn-small delete" onclick="removerVendedor('${vendedor}')">✕ Remover</button>
    </div>
  `).join('');
}

// ============================================
// REMOVER VENDEDOR/CLIENTE VISÍVEL
// ============================================
async function removerVendedor(vendedor) {
  if (confirm(`⚠️ Remover acesso ao vendedor "${vendedor}"?`)) {
    usuarioAtual.VendedoresPermitidos = usuarioAtual.VendedoresPermitidos.filter(v => v !== vendedor);
    
    // Atualizar na lista
    const indice = usuariosListaTodos.findIndex(u => u.Id === usuarioAtual.Id);
    if (indice !== -1) {
      usuariosListaTodos[indice] = usuarioAtual;
    }

    // Salvar no Drive
    try {
      const resultado = await salvarUsuariosNoDrive();
      if (resultado) {
        // Registrar auditoria
        await registrarAuditoria(
          'Atualizar',
          'Usuario',
          usuarioAtual.Id,
          usuarioAtual.Nome,
          dadosOriginais,
          usuarioAtual,
          `Usuário removeu acesso ao vendedor: ${vendedor}`
        );
        
        renderizarVendedoresVisíveis();
        mostrarMensagem(`✅ Vendedor "${vendedor}" removido com sucesso`, 'sucesso');
      }
    } catch (erro) {
      console.error('Erro ao remover vendedor:', erro);
      mostrarMensagem(`❌ Erro ao remover vendedor: ${erro.message}`, 'erro');
    }
  }
}

// ============================================
// SALVAR ALTERAÇÕES
// ============================================
async function salvarAlteracoes() {
  try {
    // Validações
    const nome = document.getElementById('inputNome').value.trim();
    const email = document.getElementById('inputEmail').value.trim();
    const senhaAtual = document.getElementById('inputSenhaAtual').value;
    const novaSenha = document.getElementById('inputNovaSenha').value;
    const confirmarSenha = document.getElementById('inputConfirmarSenha').value;

    if (!nome || !email) {
      mostrarMensagem('❌ Preencha nome e email!', 'erro');
      return;
    }

    if (!email.includes('@')) {
      mostrarMensagem('❌ Email inválido!', 'erro');
      return;
    }

    // Validar senha atual para confirmar
    if (!senhaAtual || senhaAtual !== usuarioAtual.Senha) {
      mostrarMensagem('❌ Senha atual incorreta!', 'erro');
      return;
    }

    // Validar nova senha
    if (novaSenha || confirmarSenha) {
      if (novaSenha !== confirmarSenha) {
        mostrarMensagem('❌ As senhas não conferem!', 'erro');
        return;
      }

      if (novaSenha.length < 4) {
        mostrarMensagem('❌ A senha deve ter no mínimo 4 caracteres!', 'erro');
        return;
      }
    }

    // Detectar alterações
    const alteracoes = {};
    
    if (nome !== usuarioAtual.Nome) {
      alteracoes.Nome = { anterior: usuarioAtual.Nome, novo: nome };
      usuarioAtual.Nome = nome;
      localStorage.setItem('usuarioLogado', JSON.stringify(usuarioAtual));
    }

    if (email !== usuarioAtual.Email) {
      alteracoes.Email = { anterior: usuarioAtual.Email, novo: email };
      usuarioAtual.Email = email;
    }

    if (novaSenha) {
      alteracoes.Senha = { anterior: '***', novo: '***' };
      usuarioAtual.Senha = novaSenha;
    }

    if (Object.keys(alteracoes).length === 0) {
      mostrarMensagem('⚠️ Nenhuma alteração foi feita', 'erro');
      return;
    }

    // Atualizar na lista
    const indice = usuariosListaTodos.findIndex(u => u.Id === usuarioAtual.Id);
    if (indice !== -1) {
      usuariosListaTodos[indice] = usuarioAtual;
    }

    // Salvar no Drive
    const resultado = await salvarUsuariosNoDrive();

    if (resultado) {
      // Registrar auditoria
      await registrarAuditoria(
        'Atualizar',
        'Usuario',
        usuarioAtual.Id,
        usuarioAtual.Nome,
        dadosOriginais,
        usuarioAtual,
        `Usuário alterou seus dados: ${Object.keys(alteracoes).join(', ')}`
      );

      mostrarMensagem('✅ Alterações salvas com sucesso!', 'sucesso');
      
      // Atualizar dados originais
      dadosOriginais = JSON.parse(JSON.stringify(usuarioAtual));
      
      // Limpar campos de senha
      document.getElementById('inputSenhaAtual').value = '';
      document.getElementById('inputNovaSenha').value = '';
      document.getElementById('inputConfirmarSenha').value = '';

      // Recarregar após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }

  } catch (erro) {
    console.error('❌ Erro ao salvar alterações:', erro);
    mostrarMensagem('❌ Erro ao salvar: ' + erro.message, 'erro');
  }
}

// ============================================
// SALVAR USUÁRIOS NO DRIVE
// ============================================
async function salvarUsuariosNoDrive() {
  try {
    const dadosJson = JSON.stringify(usuariosListaTodos);

    console.log('📤 Enviando dados para salvar:', {
      acao: 'salvar',
      arquivo: CONFIG.ARQUIVOS.USUARIOS,
      tamanhoDados: dadosJson.length,
      usuariosCount: usuariosListaTodos.length
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
        'deviceId': perfilDeviceId
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
// RECARREGAR FORMULÁRIO
// ============================================
function recarregarFormulario() {
  usuarioAtual = JSON.parse(JSON.stringify(dadosOriginais));
  renderizarFormulario();
  
  document.getElementById('inputSenhaAtual').value = '';
  document.getElementById('inputNovaSenha').value = '';
  document.getElementById('inputConfirmarSenha').value = '';
  
  mostrarMensagem('↻ Formulário recarregado', 'sucesso');
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
