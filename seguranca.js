// ============================================
// MÓDULO DE SEGURANÇA E CONTROLE DE ACESSO
// ============================================

/**
 * Bloqueia qualquer função de edição/deleção
 * Mostra mensagem "em desenvolvimento"
 */
const mensagemEmDesenvolvimento = () => {
  alert('⚙️ Esta função está em desenvolvimento');
};

/**
 * Cria um wrapper para bloquear funções
 * @param {String} nomeFuncao - Nome da função
 * @returns {Function} Função bloqueada
 */
function bloquearFuncao(nomeFuncao) {
  window[nomeFuncao] = () => {
    alert(`⚙️ ${nomeFuncao} está em desenvolvimento`);
  };
}

/**
 * Lista de funções que devem ser bloqueadas
 */
const funcoesBloqueadas = [
  'editarCliente',
  'novaVenda',
  'atualizarSatisfacao',
  'deletarCliente',
  'editarInsumo',
  'deletarInsumo',
  'editarTransporte',
  'deletarTransporte',
  'editarPagamento',
  'deletarPagamento',
  'editarReceita',
  'deletarReceita',
  'editarDespesa',
  'deletarDespesa'
];

/**
 * Bloquear todas as funções de edição ao carregar
 */
window.addEventListener('DOMContentLoaded', () => {
  funcoesBloqueadas.forEach(funcao => {
    if (typeof window[funcao] === 'function') {
      const funcaoOriginal = window[funcao];
      window[funcao] = () => {
        alert('⚙️ Esta função está em desenvolvimento');
      };
    }
  });
});

// ============================================
// CONTROLE DE ACESSO A MÓDULOS
// ============================================

/**
 * Verifica se o usuário tem permissão para um módulo
 * @param {String} modulo - Nome do módulo
 * @returns {Boolean} true se tem permissão
 */
function temPermissaoModuloLocal(modulo) {
  const usuario = obterUsuario();
  if (!usuario) return false;
  
  // Admin tem acesso a tudo
  if (usuario.tipo === 'sistema') return true;
  
  // Verificar módulos permitidos
  return usuario.modulos && usuario.modulos.includes(modulo);
}

/**
 * Bloqueia acesso a módulos não autorizados
 * @param {String} modulo - Nome do módulo
 */
function verificarAcessoModulo(modulo) {
  if (!temPermissaoModuloLocal(modulo)) {
    alert(`❌ Você não tem permissão para acessar o módulo: ${modulo}`);
    window.location.href = 'index.html';
  }
}

/**
 * Mostra apenas os módulos permitidos no menu
 */
function filtrarMenuPermitido() {
  const usuario = obterUsuario();
  if (!usuario || !usuario.modulos) return;
  
  const itensMenu = document.querySelectorAll('.menu-item');
  itensMenu.forEach(item => {
    const titulo = item.querySelector('h3');
    if (titulo) {
      // Remover ícone para comparação
      const nomeModulo = titulo.textContent.replace(/[^a-zA-Z]/g, '');
      const temAcesso = usuario.modulos.some(m => 
        m.toLowerCase() === nomeModulo.toLowerCase() || 
        titulo.textContent.includes(m)
      );
      
      if (!temAcesso) {
        item.style.display = 'none';
      }
    }
  });
}

/**
 * Mostrar notificação de módulo bloqueado
 */
function bloquearModulo(nomeBotao) {
  const btn = document.querySelector(`[onclick*="${nomeBotao}"]`);
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.title = 'Você não tem acesso a este módulo';
  }
}

/**
 * Validar acesso ao carregar dados
 * @param {String} modulo - Tipo de módulo
 */
function validarAcesso(modulo) {
  const usuario = obterUsuario();
  if (!usuario) {
    window.location.href = 'login.html';
    return false;
  }
  
  // Mapear nomes de tipos para nomes de módulos (com suporte a múltiplas variações)
  const mapeamento = {
    'clientes': ['Clientes'],
    'insumos': ['Insumos'],
    'transporte': ['Transporte'],
    'pagamentos': ['Pagamentos'],
    'receitas': ['Receitas'],
    'despesas': ['Despesas'],
    'analise-vendedor': ['Análise Vendedor'],
    'agendar-ligacao': ['AutoWhatsApp', 'Agendar Ligação', 'AgendamentodeLigacoes'],  // ✅ Suporta 3 variações
    'administrador': ['Administrador'],  // ✅ Módulo de administração
    'auditoria': ['Auditoria', 'Administrador']  // ✅ Auditoria (acessível por admins)
  };
  
  const modulosPermitidos = mapeamento[modulo] || [modulo];
  const nomeModulo = modulosPermitidos[0];
  
  // Verificar permissão (suportando ambas as estruturas)
  const modulos = usuario.ModulosPermitidos || usuario.modulos || [];
  
  // Verificar se tem QUALQUER uma das variações permitidas
  const temPermissao = modulosPermitidos.some(m => modulos.includes(m));
  
  if (!temPermissao) {
    console.warn(`⚠️ Acesso negado para módulo: ${nomeModulo}`);
    return false;
  }
  
  return true;
}

/**
 * Aviso visual de recurso em desenvolvimento
 */
function mostrarEmDesenvolvimento() {
  const div = document.createElement('div');
  div.style.cssText = `
    background: #fff3cd;
    border: 1px solid #ffc107;
    color: #856404;
    padding: 15px;
    border-radius: 5px;
    margin-bottom: 20px;
    text-align: center;
    font-weight: 600;
  `;
  div.innerHTML = '⚙️ <strong>Funcionalidades de edição estão em desenvolvimento</strong>';
  
  const conteudo = document.getElementById('conteudo');
  if (conteudo) {
    conteudo.insertAdjacentElement('afterbegin', div);
  }
}

// ============================================
// INICIALIZAR SEGURANÇA
// ============================================
window.addEventListener('load', () => {
  // Filtrar menu
  setTimeout(() => {
    filtrarMenuPermitido();
  }, 500);
  
  // Mostrar aviso em desenvolvimento
  mostrarEmDesenvolvimento();
});
