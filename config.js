// ============================================
// CONFIGURAÇÃO GLOBAL DO SISTEMA
// ============================================
// Este arquivo centraliza todas as configurações
// que são compartilhadas entre múltiplos arquivos

// 🔧 URL DO GOOGLE APPS SCRIPT (ÚNICO BACKEND)
// ⚠️ IMPORTANTE: Usar SEMPRE esta constante em vez de hardcoding a URL
// Quando precisar alterar o link, mude apenas AQUI!
const CONFIG = {
  // ======================================
  // URL ÚNICA DO BACKEND - ATUALIZE AQUI!
  // ======================================
  API_URL: "https://script.google.com/macros/s/AKfycbzCE8VZVLrHyG-b5RcouADgK_pl4-fOPY55aiA0DvSHKZZfz0MJCU4UEEk3_xWo43nBLQ/exec",
  
  // Nomes dos arquivos JSON no Google Drive
  ARQUIVOS: {
    CLIENTES: "clientes.json",
    INSUMOS: "insumos.json",
    TRANSPORTE: "transporte.json",
    RECEITAS: "receitas.json",
    DESPESAS: "despesas.json",
    PAGAMENTOS: "pagamentos.json",
    USUARIOS: "usuarios.json",
    AUDITORIA: "auditoria.json",
    AGENDAMENTOS_LIGACOES: "agendamentos_ligacoes.json",
    CONFIGURACAO_EMPRESA: "configuracao_empresa.json",
    VENDAS: "vendas.json",
    CONTRATO_ATUAL: "contrato_atual.json"
  },
  
  // Timeouts
  TIMEOUT_FETCH: 10000, // 10 segundos
  
  // Monitoramento de alertas
  INTERVALO_VERIFICACAO_ALERTAS: 30000, // 30 segundos
  
  // Configuração de temas/cores
  CORES: {
    PRIMARIA: "#1fa37a",
    SECUNDARIA: "#d4af37",
    SUCESSO: "#28a745",
    ERRO: "#dc3545",
    AVISO: "#ffc107",
    INFO: "#17a2b8"
  }
};

// ============================================
// FUNÇÃO AUXILIAR PARA BUSCAR CONFIGURAÇÃO
// ============================================
function obterConfigAPI() {
  return CONFIG.API_URL;
}

function obterNomeArquivo(tipo) {
  return CONFIG.ARQUIVOS[tipo] || tipo;
}

console.log("✅ Configurações carregadas de config.js");
