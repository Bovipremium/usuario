// ============================================
// MÓDULO DE AUTENTICAÇÃO - COMPARTILHADO
// ============================================
// ✅ JSONs vêm do Apps Script (que lê do Drive)
// ✅ URL centralizada em config.js

// 🔧 URL DO WEB APP - VINDA DE config.js
const API_URL = CONFIG.API_URL;

// ============================================
// VERIFICAR SE USUÁRIO ESTÁ LOGADO
// ============================================
function verificarLogin() {
  const usuario = localStorage.getItem("usuario");
  
  if (!usuario) {
    window.location.href = "login.html";
    return null;
  }
  
  return JSON.parse(usuario);
}

// ============================================
// FAZER LOGOUT
// ============================================
function fazerLogout() {
  localStorage.removeItem("usuario");
  window.location.href = "login.html";
}

// ============================================
// OBTER USUÁRIO ATUAL
// ============================================
function obterUsuario() {
  const usuario = localStorage.getItem("usuario");
  return usuario ? JSON.parse(usuario) : null;
}

// ============================================
// OBTER MÓDULOS PERMITIDOS
// ============================================
function obterModulos() {
  const usuario = obterUsuario();
  if (!usuario) return [];
  // Retornar o array de modulos se existir
  if (Array.isArray(usuario.modulos)) return usuario.modulos;
  if (Array.isArray(usuario.ModulosPermitidos)) return usuario.ModulosPermitidos;
  return [];
}

// ============================================
// VERIFICAR PERMISSÃO DE MÓDULO
// ============================================
function temPermissaoModulo(modulo) {
  const modulos = obterModulos();
  return modulos.includes(modulo);
}

// ============================================
// 📁 BUSCAR ARQUIVO DO DRIVE (via Apps Script)
// ============================================
async function buscarArquivo(nomeArquivo) {
  try {
    console.log(`📥 Buscando ${nomeArquivo} do Drive...`);
    
    // Adicionar timestamp para evitar cache
    const timestamp = new Date().getTime();
    const url = `${API_URL}?acao=buscar&arquivo=${encodeURIComponent(nomeArquivo)}&t=${timestamp}`;
    const response = await AuthManager.requisicaoSegura(url);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const dados = await response.json();
    console.log(`✅ ${nomeArquivo} carregado`);
    
    return dados;
    
  } catch (erro) {
    console.error(`❌ Erro ao buscar ${nomeArquivo} do Drive:`, erro);
    
    // 🔄 FALLBACK: Tentar carregar arquivo local
    const caminhosTentativa = [
      `${nomeArquivo}`,
      `/site/${nomeArquivo}`,
      `./${nomeArquivo}`,
      `/ProjetoEmpresarial1/site/${nomeArquivo}`
    ];
    
    for (const caminho of caminhosTentativa) {
      try {
        console.log(`🔄 Tentando fallback: ${caminho}...`);
        const fallbackResponse = await fetch(caminho);
        if (fallbackResponse.ok) {
          const dados = await fallbackResponse.json();
          console.log(`✅ ${nomeArquivo} carregado de ${caminho}:`, dados);
          return dados;
        }
      } catch (fallbackErro) {
        console.warn(`⚠️ Tentativa falhou para ${caminho}`);
      }
    }
    
    throw erro;
  }
}