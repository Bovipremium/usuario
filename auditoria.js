// ============================================
// MÓDULO DE AUDITORIA - SISTEMA COMPLETO
// ============================================

const auditoriaDeviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();

/**
 * FUNÇÃO PRINCIPAL - Registra auditoria
 * ⚠️ NÃO USAR AWAIT - DEIXA REGISTRAR EM BACKGROUND
 */
function registrarAuditoria(acao, tipo, id, nomeObjeto, descricao, dadosAntigos = "", dadosNovos = "") {
  const usuario = obterUsuario();
  if (!usuario) return;

  const dadosAntString = typeof dadosAntigos === 'string' ? dadosAntigos : JSON.stringify(dadosAntigos || {});
  const dadosNovString = typeof dadosNovos === 'string' ? dadosNovos : JSON.stringify(dadosNovos || {});
  
  // ✅ CORRIGIDO: Puxar SEMPRE o nome do usuário (não o módulo "Administrador")
  // Prioridade: nome > Nome > login > Login
  let nomeUser = usuario.nome || usuario.Nome || usuario.login || usuario.Login || 'Desconhecido';
  
  // Se por algum motivo ficou como "Administrador", tenta puxar do localStorage direto
  if (nomeUser === 'Administrador') {
    const usuarioStorage = localStorage.getItem('usuario');
    if (usuarioStorage) {
      try {
        const u = JSON.parse(usuarioStorage);
        nomeUser = u.nome || u.Nome || nomeUser;
      } catch (e) {
        // fallback silencioso
      }
    }
  }

  const registroAuditoria = {
    DataHora: new Date().toISOString(),
    NomeUsuario: nomeUser,
    Acao: acao,
    Tipo: tipo,
    Id: id,
    NomeObjetoAfetado: nomeObjeto,
    Descricao: descricao,
    DadosAntigos: dadosAntString,
    DadosNovos: dadosNovString
  };

  // Registrar em background sem bloquear
  (async () => {
    try {
      const response = await fetch(
        `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.AUDITORIA}&deviceId=${auditoriaDeviceId}`
      );
      let registros = [];
      if (response.ok) {
        const dados = await response.json();
        registros = Array.isArray(dados) ? dados : [];
      }
      registros.push(registroAuditoria);
      await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'acao': 'salvar',
          'arquivo': CONFIG.ARQUIVOS.AUDITORIA,
          'dados': JSON.stringify(registros),
          'deviceId': auditoriaDeviceId
        })
      });
    } catch (e) { }
  })();
}

// ============================================
// FUNÇÕES ESPECÍFICAS POR TIPO
// ============================================

// CLIENTES
async function registrarCriacaoCliente(cliente) {
  await registrarAuditoria(
    'Criar',
    'Cliente',
    cliente.Id || cliente.id,
    cliente.Nome || cliente.nome,
    `Cliente '${cliente.Nome || cliente.nome}' criado via Site`,
    "",
    cliente
  );
}

async function registrarAtualizacaoCliente(clienteAntigo, clienteNovo) {
  await registrarAuditoria(
    'Atualizar',
    'Cliente',
    clienteNovo.Id || clienteNovo.id,
    clienteNovo.Nome || clienteNovo.nome,
    `Cliente '${clienteNovo.Nome || clienteNovo.nome}' atualizado`,
    clienteAntigo,
    clienteNovo
  );
}

async function registrarDelecaoCliente(cliente) {
  await registrarAuditoria(
    'Deletar',
    'Cliente',
    cliente.Id || cliente.id,
    cliente.Nome || cliente.nome,
    `Cliente '${cliente.Nome || cliente.nome}' deletado`,
    cliente,
    ""
  );
}

// INSUMOS
async function registrarCriacaoInsumo(insumo) {
  await registrarAuditoria(
    'Criar',
    'Insumo',
    insumo.Id || insumo.id,
    insumo.Nome || insumo.nome,
    `Insumo '${insumo.Nome || insumo.nome}' criado via Site`,
    "",
    insumo
  );
}

async function registrarAtualizacaoInsumo(insumoAntigo, insumoNovo) {
  await registrarAuditoria(
    'Atualizar',
    'Insumo',
    insumoNovo.Id || insumoNovo.id,
    insumoNovo.Nome || insumoNovo.nome,
    `Insumo '${insumoNovo.Nome || insumoNovo.nome}' atualizado`,
    insumoAntigo,
    insumoNovo
  );
}

async function registrarDelecaoInsumo(insumo) {
  await registrarAuditoria(
    'Deletar',
    'Insumo',
    insumo.Id || insumo.id,
    insumo.Nome || insumo.nome,
    `Insumo '${insumo.Nome || insumo.nome}' deletado`,
    insumo,
    ""
  );
}

// TRANSPORTE
async function registrarCriacaoTransporte(transporte) {
  await registrarAuditoria(
    'Criar',
    'Transporte',
    transporte.Id || transporte.id,
    transporte.Referencia || transporte.referencia || `Transporte ${transporte.Id}`,
    `Transporte criado via Site`,
    "",
    transporte
  );
}

async function registrarAtualizacaoTransporte(transporteAntigo, transporteNovo) {
  await registrarAuditoria(
    'Atualizar',
    'Transporte',
    transporteNovo.Id || transporteNovo.id,
    transporteNovo.Referencia || transporteNovo.referencia || `Transporte ${transporteNovo.Id}`,
    `Transporte atualizado`,
    transporteAntigo,
    transporteNovo
  );
}

async function registrarDelecaoTransporte(transporte) {
  await registrarAuditoria(
    'Deletar',
    'Transporte',
    transporte.Id || transporte.id,
    transporte.Referencia || transporte.referencia || `Transporte ${transporte.Id}`,
    `Transporte deletado`,
    transporte,
    ""
  );
}

// RECEITAS
async function registrarCriacaoReceita(receita) {
  await registrarAuditoria(
    'Criar',
    'Receita',
    receita.Id || receita.id,
    receita.Descricao || receita.descricao || `Receita ${receita.Id}`,
    `Receita criada via Site`,
    "",
    receita
  );
}

async function registrarAtualizacaoReceita(receitaAntiga, receitaNova) {
  await registrarAuditoria(
    'Atualizar',
    'Receita',
    receitaNova.Id || receitaNova.id,
    receitaNova.Descricao || receitaNova.descricao || `Receita ${receitaNova.Id}`,
    `Receita atualizada`,
    receitaAntiga,
    receitaNova
  );
}

async function registrarDelecaoReceita(receita) {
  await registrarAuditoria(
    'Deletar',
    'Receita',
    receita.Id || receita.id,
    receita.Descricao || receita.descricao || `Receita ${receita.Id}`,
    `Receita deletada`,
    receita,
    ""
  );
}

// DESPESAS
async function registrarCriacaoDespesa(despesa) {
  await registrarAuditoria(
    'Criar',
    'Despesa',
    despesa.Id || despesa.id,
    despesa.Descricao || despesa.descricao || `Despesa ${despesa.Id}`,
    `Despesa criada via Site`,
    "",
    despesa
  );
}

async function registrarAtualizacaoDespesa(despesaAntiga, despesaNova) {
  await registrarAuditoria(
    'Atualizar',
    'Despesa',
    despesaNova.Id || despesaNova.id,
    despesaNova.Descricao || despesaNova.descricao || `Despesa ${despesaNova.Id}`,
    `Despesa atualizada`,
    despesaAntiga,
    despesaNova
  );
}

async function registrarDelecaoDespesa(despesa) {
  await registrarAuditoria(
    'Deletar',
    'Despesa',
    despesa.Id || despesa.id,
    despesa.Descricao || despesa.descricao || `Despesa ${despesa.Id}`,
    `Despesa deletada`,
    despesa,
    ""
  );
}

// PAGAMENTOS
async function registrarMarcacaoPagamento(parcela, pago) {
  const acao = pago ? 'Marcar como Pago' : 'Desmarcar Pagamento';
  const descricao = pago ? 'Parcela marcada como paga' : 'Marcação de pagamento removida';
  
  await registrarAuditoria(
    acao,
    'Pagamento',
    parcela.Id || parcela.id,
    `Parcela #${parcela.Id || parcela.id} - Cliente ${parcela.NomeCliente || parcela.nome_cliente}`,
    descricao,
    { Pago: !pago },
    { Pago: pago }
  );
}

// USUÁRIOS
async function registrarCriacaoUsuario(usuario) {
  await registrarAuditoria(
    'Criar',
    'Usuario',
    usuario.Id || usuario.id,
    usuario.Nome || usuario.nome,
    `Usuário '${usuario.Nome || usuario.nome}' criado`,
    "",
    usuario
  );
}

async function registrarAtualizacaoUsuario(usuarioAntigo, usuarioNovo) {
  await registrarAuditoria(
    'Atualizar',
    'Usuario',
    usuarioNovo.Id || usuarioNovo.id,
    usuarioNovo.Nome || usuarioNovo.nome,
    `Usuário '${usuarioNovo.Nome || usuarioNovo.nome}' atualizado`,
    usuarioAntigo,
    usuarioNovo
  );
}

async function registrarDelecaoUsuario(usuario) {
  await registrarAuditoria(
    'Deletar',
    'Usuario',
    usuario.Id || usuario.id,
    usuario.Nome || usuario.nome,
    `Usuário '${usuario.Nome || usuario.nome}' deletado`,
    usuario,
    ""
  );
}

// VENDAS
async function registrarCriacaoVenda(venda) {
  await registrarAuditoria(
    'Criar',
    'Venda',
    venda.Id || venda.id,
    `Venda #${venda.NumeroVenda || venda.numero_venda}`,
    `Venda criada para cliente ${venda.NomeCliente || venda.nome_cliente}`,
    "",
    venda
  );
}

async function registrarAtualizacaoVenda(vendaAntiga, vendaNova) {
  await registrarAuditoria(
    'Atualizar',
    'Venda',
    vendaNova.Id || vendaNova.id,
    `Venda #${vendaNova.NumeroVenda || vendaNova.numero_venda}`,
    `Venda atualizada`,
    vendaAntiga,
    vendaNova
  );
}

async function registrarDelecaoVenda(venda) {
  await registrarAuditoria(
    'Deletar',
    'Venda',
    venda.Id || venda.id,
    `Venda #${venda.NumeroVenda || venda.numero_venda}`,
    `Venda deletada`,
    venda,
    ""
  );
}

// BOLETOS
async function registrarCriacaoBoleto(boleto) {
  await registrarAuditoria(
    'Criar',
    'Boleto',
    boleto.Id || boleto.id,
    `Boleto #${boleto.NumeroBoleto || boleto.numero_boleto}`,
    `Boleto criado`,
    "",
    boleto
  );
}

async function registrarAtualizacaoBoleto(boletoAntigo, boletoNovo) {
  await registrarAuditoria(
    'Atualizar',
    'Boleto',
    boletoNovo.Id || boletoNovo.id,
    `Boleto #${boletoNovo.NumeroBoleto || boletoNovo.numero_boleto}`,
    `Boleto atualizado`,
    boletoAntigo,
    boletoNovo
  );
}

async function registrarDelecaoBoleto(boleto) {
  await registrarAuditoria(
    'Deletar',
    'Boleto',
    boleto.Id || boleto.id,
    `Boleto #${boleto.NumeroBoleto || boleto.numero_boleto}`,
    `Boleto deletado`,
    boleto,
    ""
  );
}

// ============================================
// FUNÇÃO AUXILIAR - Salvar dados + registrar auditoria
// ============================================
async function salvarDadosComAuditoria(...args) {
  if (args.length < 9) {
    console.error('❌ salvarDadosComAuditoria: argumentos insuficientes');
    return false;
  }

  const [nomeArquivo, dados, tipoAuditoria, acao, tipo, id, nomeObjeto, descricao, dadosAntigos, dadosNovos] = args;
  
  try {
    const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
    const dadosJson = typeof dados === 'string' ? dados : JSON.stringify(dados);

    // 1️⃣ SALVAR NO GOOGLE DRIVE
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'acao': 'salvar',
        'arquivo': nomeArquivo,
        'dados': dadosJson,
        'deviceId': deviceId
      })
    });

    if (!response.ok) {
      console.error(`❌ Erro ao salvar ${nomeArquivo}: HTTP ${response.status}`);
      return false;
    }

    // ✅ Se chegou aqui, dados FORAM SALVOS!
    console.log(`✅ ${nomeArquivo} salvo com sucesso!`);

    // 2️⃣ AUDITORIA EM BACKGROUND (sem bloquear)
    registrarAuditoria(acao, tipo, id, nomeObjeto, descricao, dadosAntigos, dadosNovos);

    return true;

  } catch (erro) {
    console.error(`❌ Erro ao salvar ${nomeArquivo}:`, erro);
    return false;
  }
}

console.log('✅ Módulo de Auditoria carregado com sucesso');
