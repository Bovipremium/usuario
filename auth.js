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
  return usuario ? (usuario.ModulosPermitidos || usuario.modulos || []) : [];
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
    
    const url = `${API_URL}?acao=buscar&arquivo=${encodeURIComponent(nomeArquivo)}`;
    const response = await AuthManager.requisicaoSegura(url);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const dados = await response.json();
    console.log(`✅ ${nomeArquivo} carregado:`, dados);
    
    return dados;
    
  } catch (erro) {
    console.error(`❌ Erro ao buscar ${nomeArquivo}:`, erro);
    throw erro;
  }
}