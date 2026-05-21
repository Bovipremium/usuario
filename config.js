// ============================================
// CONFIGURAÇÕES GLOBAIS DO SISTEMA
// Arquivo restaurado para corrigir CONFIG/API_URL quebrados.
// NÃO coloque chave AIza aqui.
// ============================================

var CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwbHwNBCK0fOLymmypKB_K8i1_vvZlysepTu6O7om_j_abSJ9dl0EqFefhboztszTHNkQ/exec",

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
    CONTRATO_ATUAL: "contrato_atual.json",
    CONTAS: "contas.json",
    CONFIG_METAS: "configMetas.json",
    REVISAO_CONTATOS: "revisao_contatos.json",
    TRANSPORTADORAS: "transportadoras.json",
    REMETENTE_COTACAO: "remetente_cotacao.json"
  },

  TIMEOUT_FETCH: 10000,
  INTERVALO_VERIFICACAO_ALERTAS: 30000,

  CORES: {
    PRIMARIA: "#1fa37a",
    SECUNDARIA: "#d4af37",
    SUCESSO: "#28a745",
    ERRO: "#dc3545",
    AVISO: "#ffc107",
    INFO: "#17a2b8"
  }
};

// Compatibilidade com arquivos antigos do site.
// Vários módulos usam API_URL direto; outros usam CONFIG.
window.CONFIG = CONFIG;
window.API_URL = CONFIG.API_URL;

// Cotação online usa a mesma API principal do site.
// A chave Google Places fica somente no Apps Script > Script Properties.
function obterConfigAPI() {
  return CONFIG.API_URL;
}

function obterNomeArquivo(tipo) {
  return CONFIG.ARQUIVOS[tipo] || tipo;
}

console.log("✅ Configurações carregadas de config.js");

// Cotação online usa a mesma API principal do site.
// NÃO coloque chave AIza no config.js.
window.APPS_SCRIPT_URL = CONFIG.API_URL;

