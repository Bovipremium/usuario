// ============================================
// SISTEMA DE AUDITORIA - SITE
// ============================================
// Registra todas as ações do usuário (criar, editar, deletar)
// Sincroniza com o JSON de auditoria.json do sistema C#

// 🔧 URL DO WEB APP - VINDA DE config.js
const AUDITORIA_API_URL = CONFIG.API_URL;

// ============================================
// HELPER: FORMATAR DATETIME COMO C#
// ============================================
function formatarDataHoraComoCS() {
  const now = new Date();
  
  // Formatar: 2026-02-13T18:06:46.8354504-03:00
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');
  const horas = String(now.getHours()).padStart(2, '0');
  const minutos = String(now.getMinutes()).padStart(2, '0');
  const segundos = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  
  // Calcular timezone offset
  const offset = -now.getTimezoneOffset();
  const hOffset = Math.floor(Math.abs(offset) / 60);
  const mOffset = Math.abs(offset) % 60;
  const sinal = offset >= 0 ? '+' : '-';
  const tzString = `${sinal}${String(hOffset).padStart(2, '0')}:${String(mOffset).padStart(2, '0')}`;
  
  return `${ano}-${mes}-${dia}T${horas}:${minutos}:${segundos}.${ms}${tzString}`;
}

// ============================================
// CLASSE REGISTRO DE AUDITORIA
// ============================================
class RegistroAuditoria {
  constructor(nomeUsuario, acao, tipo, idObjeto, nomeObjeto, descricao, dadosAntigos = "", dadosNovos = "") {
    this.Id = null; // Será preenchido pelo backend com ID sequencial
    this.NomeUsuario = nomeUsuario;
    this.DataHora = formatarDataHoraComoCS(); // Formato igual ao C#
    this.Acao = acao;
    this.Tipo = tipo;
    this.IdObjetoAfetado = idObjeto;
    this.NomeObjetoAfetado = nomeObjeto;
    this.Descricao = descricao;
    this.DadosAntigos = dadosAntigos;
    this.DadosNovos = dadosNovos;
  }
}

// ============================================
// REGISTRAR AÇÃO - FUNÇÃO PRINCIPAL
// ============================================
async function registrarAuditoria(acao, tipo, idObjeto, nomeObjeto, descricao, dadosAntigos = "", dadosNovos = "") {
  try {
    // Obter usuário logado
    const usuario = obterUsuario();
    if (!usuario) {
      console.warn("⚠️ Nenhum usuário logado, auditoria não registrada");
      return;
    }

    // Criar registro
    const registro = new RegistroAuditoria(
      usuario.nome || usuario.login,
      acao,
      tipo,
      idObjeto.toString(),
      nomeObjeto,
      descricao,
      dadosAntigos,
      dadosNovos
    );

    console.log("📝 Registrando auditoria:", registro);

    // Enviar para o backend (Apps Script + salvar em auditoria.json)
    await salvarRegistroAuditoria(registro);

    console.log("✅ Auditoria registrada com sucesso");

  } catch (erro) {
    console.error("❌ Erro ao registrar auditoria:", erro);
  }
}

// ============================================
// SALVAR REGISTRO NO SERVIDOR
// ============================================
async function salvarRegistroAuditoria(registro) {
  try {
    // Preparar dados para envio
    const payload = {
      acao: "salvarAuditoria",
      registro: JSON.stringify(registro)
    };

    // Enviar POST para o Apps Script
    const response = await AuthManager.requisicaoSegura(AUDITORIA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const resultado = await response.json();
    
    if (resultado.sucesso) {
      console.log("✅ Auditoria salva no servidor com ID:", resultado.id);
    } else {
      console.warn("⚠️ Resposta do servidor:", resultado.mensagem);
      // Se falhar, salva localmente
      salvarAuditoriaLocalmente(registro);
    }

  } catch (erro) {
    console.error("❌ Erro ao enviar auditoria:", erro);
    // Mesmo que falhe, salva localmente para sincronizar depois
    salvarAuditoriaLocalmente(registro);
  }
}

// ============================================
// SALVAR AUDITORIA LOCALMENTE (backup)
// ============================================
function salvarAuditoriaLocalmente(registro) {
  try {
    let auditoriasLocais = JSON.parse(localStorage.getItem("auditoriasNaoSincronizadas") || "[]");
    auditoriasLocais.push(registro);
    localStorage.setItem("auditoriasNaoSincronizadas", JSON.stringify(auditoriasLocais));
    console.log("💾 Auditoria salva localmente para sincronização posterior");
  } catch (erro) {
    console.error("❌ Erro ao salvar auditoria localmente:", erro);
  }
}

// ============================================
// ATALHOS PARA OPERAÇÕES COMUNS
// ============================================

// Registrar criação de cliente
async function registrarCriacaoCliente(cliente) {
  const dados = JSON.stringify(cliente);
  await registrarAuditoria(
    "Criar",
    "Cliente",
    cliente.Id || cliente.id || Date.now(),
    cliente.Nome || cliente.nome,
    `Cliente '${cliente.Nome || cliente.nome}' criado`,
    "",
    dados
  );
}

// Registrar atualização de cliente
async function registrarAtualizacaoCliente(clienteAntigo, clienteNovo) {
  await registrarAuditoria(
    "Atualizar",
    "Cliente",
    clienteNovo.Id || clienteNovo.id,
    clienteNovo.Nome || clienteNovo.nome,
    `Dados do cliente '${clienteNovo.Nome || clienteNovo.nome}' atualizados`,
    JSON.stringify(clienteAntigo),
    JSON.stringify(clienteNovo)
  );
}

// Registrar exclusão de cliente
async function registrarDelecaoCliente(cliente) {
  await registrarAuditoria(
    "Deletar",
    "Cliente",
    cliente.Id || cliente.id,
    cliente.Nome || cliente.nome,
    `Cliente '${cliente.Nome || cliente.nome}' deletado`,
    JSON.stringify(cliente),
    ""
  );
}

// ============================================
// INSUMOS
// ============================================

async function registrarCriacaoInsumo(insumo) {
  const dados = JSON.stringify(insumo);
  await registrarAuditoria(
    "Criar",
    "Insumo",
    insumo.Id || insumo.id || Date.now(),
    insumo.Nome || insumo.nome,
    `Insumo '${insumo.Nome || insumo.nome}' criado`,
    "",
    dados
  );
}

async function registrarAtualizacaoInsumo(insumoAntigo, insumoNovo) {
  await registrarAuditoria(
    "Atualizar",
    "Insumo",
    insumoNovo.Id || insumoNovo.id,
    insumoNovo.Nome || insumoNovo.nome,
    `Insumo '${insumoNovo.Nome || insumoNovo.nome}' atualizado`,
    JSON.stringify(insumoAntigo),
    JSON.stringify(insumoNovo)
  );
}

async function registrarDelecaoInsumo(insumo) {
  await registrarAuditoria(
    "Deletar",
    "Insumo",
    insumo.Id || insumo.id,
    insumo.Nome || insumo.nome,
    `Insumo '${insumo.Nome || insumo.nome}' deletado`,
    JSON.stringify(insumo),
    ""
  );
}

// ============================================
// TRANSPORTE
// ============================================

async function registrarCriacaoTransporte(transporte) {
  const dados = JSON.stringify(transporte);
  await registrarAuditoria(
    "Criar",
    "Transporte",
    transporte.Id || transporte.id || Date.now(),
    transporte.Nome || transporte.Numero || transporte.numero,
    `Transporte criado`,
    "",
    dados
  );
}

async function registrarAtualizacaoTransporte(transporteAntigo, transporteNovo) {
  await registrarAuditoria(
    "Atualizar",
    "Transporte",
    transporteNovo.Id || transporteNovo.id,
    transporteNovo.Nome || transporteNovo.Numero || transporteNovo.numero,
    `Transporte atualizado`,
    JSON.stringify(transporteAntigo),
    JSON.stringify(transporteNovo)
  );
}

async function registrarDelecaoTransporte(transporte) {
  await registrarAuditoria(
    "Deletar",
    "Transporte",
    transporte.Id || transporte.id,
    transporte.Nome || transporte.Numero || transporte.numero,
    `Transporte deletado`,
    JSON.stringify(transporte),
    ""
  );
}

// ============================================
// RECEITAS
// ============================================

async function registrarCriacaoReceita(receita) {
  const dados = JSON.stringify(receita);
  await registrarAuditoria(
    "Criar",
    "Receita",
    receita.Id || receita.id || Date.now(),
    receita.Nome || receita.nome,
    `Receita '${receita.Nome || receita.nome}' criada`,
    "",
    dados
  );
}

async function registrarAtualizacaoReceita(receitaAntiga, receitaNova) {
  await registrarAuditoria(
    "Atualizar",
    "Receita",
    receitaNova.Id || receitaNova.id,
    receitaNova.Nome || receitaNova.nome,
    `Receita '${receitaNova.Nome || receitaNova.nome}' atualizada`,
    JSON.stringify(receitaAntiga),
    JSON.stringify(receitaNova)
  );
}

async function registrarDelecaoReceita(receita) {
  await registrarAuditoria(
    "Deletar",
    "Receita",
    receita.Id || receita.id,
    receita.Nome || receita.nome,
    `Receita '${receita.Nome || receita.nome}' deletada`,
    JSON.stringify(receita),
    ""
  );
}

// ============================================
// DESPESAS
// ============================================

async function registrarCriacaoDespesa(despesa) {
  const dados = JSON.stringify(despesa);
  await registrarAuditoria(
    "Criar",
    "Despesa",
    despesa.Id || despesa.id || Date.now(),
    despesa.Descricao || despesa.descricao,
    `Despesa '${despesa.Descricao || despesa.descricao}' criada`,
    "",
    dados
  );
}

async function registrarAtualizacaoDespesa(despesaAntiga, despesaNova) {
  await registrarAuditoria(
    "Atualizar",
    "Despesa",
    despesaNova.Id || despesaNova.id,
    despesaNova.Descricao || despesaNova.descricao,
    `Despesa atualizada`,
    JSON.stringify(despesaAntiga),
    JSON.stringify(despesaNova)
  );
}

async function registrarDelecaoDespesa(despesa) {
  await registrarAuditoria(
    "Deletar",
    "Despesa",
    despesa.Id || despesa.id,
    despesa.Descricao || despesa.descricao,
    `Despesa deletada`,
    JSON.stringify(despesa),
    ""
  );
}

// ============================================
// PAGAMENTOS / PARCELAS
// ============================================

async function registrarMarcacaoPagamento(parcela, pago = true) {
  const acao = pago ? "Marcar como Pago" : "Marcar como Não Pago";
  const valor = parcela.Valor || parcela.valor || 0;
  const nomeCliente = parcela.NomeCliente || parcela.nomeCliente || "Cliente";
  
  const parcelaAntiga = JSON.stringify(parcela);
  const parcelaNova = JSON.stringify({ ...parcela, Pago: pago });

  await registrarAuditoria(
    acao,
    "Parcela",
    parcela.Id || parcela.id || Date.now(),
    `Parcela de R$ ${valor.toFixed(2)} - ${nomeCliente}`,
    `Parcela marcada como ${pago ? "PAGO" : "NÃO PAGO"}`,
    parcelaAntiga,
    parcelaNova
  );
}

// ============================================
// SINCRONIZAR AUDITORIA NÃO SINCRONIZADA
// ============================================
async function sincronizarAuditoriaLocal() {
  try {
    const auditoriasLocais = JSON.parse(localStorage.getItem("auditoriasNaoSincronizadas") || "[]");
    
    if (auditoriasLocais.length === 0) return;

    console.log(`🔄 Sincronizando ${auditoriasLocais.length} registros de auditoria...`);

    for (const registro of auditoriasLocais) {
      await salvarRegistroAuditoria(registro);
    }

    // Limpar auditoria local após sincronização bem-sucedida
    localStorage.removeItem("auditoriasNaoSincronizadas");
    console.log("✅ Auditoria sincronizada com sucesso");

  } catch (erro) {
    console.error("❌ Erro ao sincronizar auditoria:", erro);
  }
}

// ============================================
// SINCRONIZAR AO CARREGAR A PÁGINA
// ============================================
window.addEventListener("load", () => {
  sincronizarAuditoriaLocal();
});

// ============================================
// SINCRONIZAR PERIODICAMENTE (A CADA 5 MINUTOS)
// ============================================
setInterval(sincronizarAuditoriaLocal, 5 * 60 * 1000);

// ============================================
// SALVAR DADOS + AUDITORIA (para receita.js, clientes.js, etc)
// ============================================
async function salvarDadosComAuditoria(nomeArquivo, dados, tipoAuditoria, acao, tipo, idObjeto, nomeObjeto, descricao, dadosAntigos = "{}", dadosNovos = "{}") {
  try {
    console.log(`💾 Salvando ${nomeArquivo}...`);

    // 1️⃣ SALVAR DADOS NO ARQUIVO - ASYNC (em background)
    salvarArquivoDrive(nomeArquivo, dados).catch(erro => {
      console.error(`❌ Erro ao salvar ${nomeArquivo}:`, erro);
    });

    // 2️⃣ REGISTRAR AUDITORIA - ASYNC (em background)
    registrarAuditoria(acao, tipo, idObjeto, nomeObjeto, descricao, dadosAntigos, dadosNovos).catch(erro => {
      console.error(`❌ Erro ao registrar auditoria:`, erro);
    });

    console.log(`✅ Salvar iniciado (em background)`);
    return true;

  } catch (erro) {
    console.error("❌ Erro ao iniciar salvamento:", erro);
    return false;
  }
}

// ============================================
// SALVAR ARQUIVO NO GOOGLE DRIVE
// ============================================
async function salvarArquivoDrive(nomeArquivo, dadosJson) {
  try {
    const payload = {
      acao: "salvarArquivo",
      arquivo: nomeArquivo,
      dados: typeof dadosJson === 'string' ? dadosJson : JSON.stringify(dadosJson)
    };

    const response = await AuthManager.requisicaoSegura(AUDITORIA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const resultado = await response.json();
    
    if (resultado.sucesso) {
      console.log(`✅ ${nomeArquivo} salvo no servidor`);
      return true;
    } else {
      console.warn(`⚠️ Erro ao salvar ${nomeArquivo}:`, resultado.mensagem);
      return false;
    }

  } catch (erro) {
    console.error(`❌ Erro ao salvar ${nomeArquivo}:`, erro);
    return false;
  }
}

