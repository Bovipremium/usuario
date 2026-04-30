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
// COM CACHE LOCAL PARA PERFORMANCE
// ============================================
async function buscarArquivo(nomeArquivo) {
  try {
    // ✅ PASSO 1: Verificar cache local (localStorage)
    const chaveCache = `cache_${nomeArquivo}`;
    const chaveTimestamp = `cache_ts_${nomeArquivo}`;
    const cached = localStorage.getItem(chaveCache);
    const timestampCached = localStorage.getItem(chaveTimestamp);
    
    if (cached && timestampCached) {
      const agora = new Date().getTime();
      const idade = agora - parseInt(timestampCached);
      const cacheValido = idade < 1000; // 1 segundo
      
      if (cacheValido) {
        console.log(`📦 ${nomeArquivo} carregado do CACHE LOCAL (${(idade/1000).toFixed(1)}s atrás)`);
        const dados = JSON.parse(cached);
        console.log(`   → Cache contém ${Array.isArray(dados) ? dados.length : 'objeto'} itens`);
        return dados;
      }
    }
    
    // ✅ PASSO 2: Se cache expirou, buscar do Drive
    console.log(`📥 Buscando ${nomeArquivo} do Drive...`);
    const url = `${API_URL}?acao=buscar&arquivo=${encodeURIComponent(nomeArquivo)}`;
    console.log(`   → URL: ${url.substring(0, 80)}...`);
    
    const response = await AuthManager.requisicaoSegura(url);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const dados = await response.json();
    console.log(`   → Resposta recebida, tipo: ${typeof dados}, é array? ${Array.isArray(dados)}`);
    
    if (Array.isArray(dados)) {
      console.log(`   → Array com ${dados.length} itens`);
    } else {
      console.log(`   → Objeto com propriedades: ${Object.keys(dados).join(', ')}`);
    }
    
    // ✅ PASSO 3: Salvar no cache LOCAL para próximas requisições
    localStorage.setItem(chaveCache, JSON.stringify(dados));
    localStorage.setItem(chaveTimestamp, new Date().getTime());
    console.log(`✅ ${nomeArquivo} carregado e CACHEADO (válido por 5 min)`);
    
    return dados;
    
  } catch (erro) {
    console.error(`❌ Erro ao buscar ${nomeArquivo} do Drive:`, erro);
    console.error(`   → Mensagem: ${erro.message}`);
    // ❗️ REMOVED FALLBACK: Forçar busca apenas via Drive/API. If it fails, propagate error so callers know.
    throw erro;
  }
}
