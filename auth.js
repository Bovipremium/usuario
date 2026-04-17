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
      const cacheValido = idade < 5 * 60 * 1000; // 5 minutos
      
      if (cacheValido) {
        console.log(`📦 ${nomeArquivo} carregado do CACHE LOCAL (${(idade/1000).toFixed(1)}s atrás)`);
        return JSON.parse(cached);
      }
    }
    
    // ✅ PASSO 2: Se cache expirou, buscar do Drive
    console.log(`📥 Buscando ${nomeArquivo} do Drive...`);
    const url = `${API_URL}?acao=buscar&arquivo=${encodeURIComponent(nomeArquivo)}`;
    // ⚠️ REMOVIDO timestamp que forçava recarregamento
    const response = await AuthManager.requisicaoSegura(url);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const dados = await response.json();
    
    // ✅ PASSO 3: Salvar no cache LOCAL para próximas requisições
    localStorage.setItem(chaveCache, JSON.stringify(dados));
    localStorage.setItem(chaveTimestamp, new Date().getTime());
    console.log(`✅ ${nomeArquivo} carregado e CACHEADO (válido por 5 min)`);
    
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
          console.log(`✅ ${nomeArquivo} carregado de ${caminho}`);
          return dados;
        }
      } catch (fallbackErro) {
        console.warn(`⚠️ Tentativa falhou para ${caminho}`);
      }
    }
    
    throw erro;
  }
}
