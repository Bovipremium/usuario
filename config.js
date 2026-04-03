
const CONFIG = {
  // ======================================
  
  // ======================================
  API_URL: "https://script.google.com/macros/s/AKfycbzpqQWG9TfeLto691dqfaASCGaS8a0KpXpZZxi7C4yPF4-jZUWRD1bgpdnkB5pGrjFb/exec",
  
 
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
    CONFIG_METAS: "configMetas.json"
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
