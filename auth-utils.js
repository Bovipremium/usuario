// ============================================
// 🔐 UTILITÁRIOS DE AUTENTICAÇÃO
// ============================================
// Validar token em TODAS as requisições
// para garantir segurança máxima

class AuthManager {
  // Verificar se tem autenticação válida
  static verificarAutenticacao() {
    const deviceId = localStorage.getItem('deviceId');
    const autenticado = localStorage.getItem('autenticado');

    if (!deviceId || autenticado !== 'true') {
      console.warn('🔐 Usuário não autenticado - redirecionando para autenticação');
      window.location.replace('keygate.html');
      return false;
    }

    return { deviceId, valido: true };
  }

  // Limpar dados de autenticação
  static limparAutenticacao() {
    localStorage.removeItem('deviceId');
    localStorage.removeItem('autenticado');
  }

  // Fazer requisição segura (com deviceId)
  static async requisicaoSegura(url, opcoes = {}) {
    const auth = this.verificarAutenticacao();
    if (!auth.valido) {
      throw new Error('Autenticação inválida ou expirada');
    }

    // Adicionar deviceId na URL (sem headers customizados para evitar CORS preflight)
    const urlObj = new URL(url);
    urlObj.searchParams.append('deviceId', auth.deviceId);

    console.log(`🔒 Requisição para: ${urlObj.toString().substring(0, 80)}...`);

    // ⚠️ NÃO adicionar headers customizados - isso causa CORS preflight!
    // Usar APENAS query parameters
    const response = await fetch(urlObj.toString(), {
      ...opcoes,
      cache: 'no-store'
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('❌ PC não autorizado (401)');
        this.limparAutenticacao();
        window.location.replace('keygate.html');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return response;
  }

  // Fazer logout
  static logout() {
    console.log('👋 Fazendo logout...');
    this.limparAutenticacao();
    window.location.href = 'keygate.html';
  }
}

// 🔐 Verificar autenticação ao carregar página
window.addEventListener('load', () => {
  // Só verificar em páginas que não sejam keygate
  if (!window.location.pathname.includes('keygate.html')) {
    AuthManager.verificarAutenticacao();
  }
});

// 🚨 Verificar autenticação periodicamente (a cada 5 minutos)
setInterval(() => {
  if (!window.location.pathname.includes('keygate.html')) {
    const auth = AuthManager.verificarAutenticacao();
  }
}, 5 * 60 * 1000);

console.log('🔐 Autenticação carregada e ativa');

