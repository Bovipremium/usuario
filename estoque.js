// ============================================
// GERENCIAMENTO DE ESTOQUE
// ============================================
// Deduz insumos quando marca "Produto Pronto: Sim"

// ============================================
// HELPER: DEFINIR CLASSE DE PESO
// ============================================
function definirClassePeso(peso) {
  if (peso <= 0.5) return "Pequeno";
  if (peso <= 2) return "Médio";
  if (peso <= 5) return "Grande";
  if (peso <= 10) return "ExtraGrande";
  return "SuperGrande";
}

// ============================================
// BUSCAR INSUMO PARA DEDUZIR
// ============================================
// Tenta encontrar o insumo na seguinte ordem:
// 1. Nome + Peso exato
// 2. Nome + Classe de Peso
// 3. Sem Nome + Classe de Peso
async function buscarInsumoParaDeduzir(nomeProduto, pesoProduto, quantidadeNecessaria) {
  try {
    // Carregar insumos
    const response = await AuthManager.requisicaoSegura(`${CONFIG.API_URL}?acao=buscar&arquivo=insumos.json`);
    const insumos = await response.json();

    if (!Array.isArray(insumos)) {
      console.warn("❌ insumos.json não está no formato esperado");
      return null;
    }

    // 1️⃣ Tentar encontrar insumo com NOME + PESO exato
    let insumo = insumos.find(i =>
      i.Nome && 
      i.Nome.toLowerCase() === nomeProduto.toLowerCase() &&
      Math.abs(i.Peso - pesoProduto) < 0.01 &&
      i.Quantidade >= quantidadeNecessaria
    );

    if (insumo) {
      console.log(`✅ Insumo encontrado (exato): ${insumo.Nome} - ${insumo.Peso}kg`);
      return insumo;
    }

    // 2️⃣ Tentar encontrar insumo com NOME + CLASSE DE PESO
    const classePeso = definirClassePeso(pesoProduto);
    const insumosComNome = insumos.filter(i =>
      i.Nome &&
      i.Nome.toLowerCase() === nomeProduto.toLowerCase() &&
      definirClassePeso(i.Peso) === classePeso &&
      i.Quantidade >= quantidadeNecessaria
    ).sort((a, b) => 
      Math.abs(a.Peso - pesoProduto) - Math.abs(b.Peso - pesoProduto)
    );

    if (insumosComNome.length > 0) {
      insumo = insumosComNome[0];
      console.log(`✅ Insumo encontrado (mesma classe): ${insumo.Nome} - ${insumo.Peso}kg`);
      return insumo;
    }

    // 3️⃣ Tentar encontrar insumo SEM NOME + CLASSE DE PESO
    const insumosGenéricos = insumos.filter(i =>
      (!i.Nome || i.Nome.trim() === "") &&
      definirClassePeso(i.Peso) === classePeso &&
      i.Quantidade >= quantidadeNecessaria
    ).sort((a, b) =>
      Math.abs(a.Peso - pesoProduto) - Math.abs(b.Peso - pesoProduto)
    );

    if (insumosGenéricos.length > 0) {
      insumo = insumosGenéricos[0];
      console.log(`✅ Insumo encontrado (genérico): ${insumo.Peso}kg`);
      return insumo;
    }

    console.warn(`❌ Nenhum insumo encontrado para: ${nomeProduto} (${pesoProduto}kg)`);
    return null;

  } catch (erro) {
    console.error("❌ Erro ao buscar insumo:", erro);
    return null;
  }
}

// ============================================
// DEDUZIR INSUMO DO ESTOQUE
// ============================================
async function deduzirInsumoDoProduto(cliente) {
  try {
    console.log("🔄 Deduzindo insumos para cliente:", cliente.Nome);

    // Carregar insumos atuais
    const responseInsumos = await AuthManager.requisicaoSegura(`${CONFIG.API_URL}?acao=buscar&arquivo=insumos.json`);
    const insumos = await responseInsumos.json();

    // Para cada venda, deduzir cada produto
    for (const venda of cliente.Vendas) {
      if (!venda.Produtos) continue;

      for (const produto of venda.Produtos) {
        if (produto.Quantidade <= 0) continue;

        // Buscar insumo correspondente
        const insumo = await buscarInsumoParaDeduzir(
          produto.Nome,
          produto.PesoUnidade,
          produto.Quantidade
        );

        if (insumo) {
          // Deduzir quantidade
          insumo.Quantidade -= produto.Quantidade;
          console.log(`✅ Deduzido: ${produto.Quantidade}un de ${insumo.Nome || "genérico"} (${insumo.Peso}kg)`);
        } else {
          console.warn(`⚠️ Insumo insuficiente ou não encontrado: ${produto.Nome}`);
        }
      }
    }

    // Salvar insumos atualizados
    await salvarArquivoDrive("insumos.json", JSON.stringify(insumos, null, 2));
    console.log("✅ Estoque atualizado!");

    return true;

  } catch (erro) {
    console.error("❌ Erro ao deduzir insumo:", erro);
    return false;
  }
}

// ============================================
// MARCAR PRODUTO PRONTO NO SITE
// ============================================
async function marcarProdutoPronto(cliente, pronto = true) {
  try {
    console.log(`🔄 Marcando "${cliente.Nome}" como Produto Pronto: ${pronto ? "SIM" : "NÃO"}`);

    if (pronto) {
      // ⚠️ PERGUNTAR ao usuário se deseja descontar do insumo
      const desejaDescontar = confirm(
        `Deseja descontar os insumos do estoque para o produto "${cliente.Nome}"?\n\n` +
        `Ao clicar em OK, os insumos serão deduzidos do arquivo JSON.\n` +
        `Ao clicar em Cancelar, apenas marcará como pronto SEM descontar.`
      );

      if (!desejaDescontar) {
        console.log("⚠️ Usuário optou por NÃO descontar do insumo");
        // Apenas marcar como pronto sem deduzir
        cliente.ProdutoPronto = pronto;
        await salvarClienteComAuditoria(cliente);
        alert('✅ Produto marcado como pronto (SEM desconto de insumo)');
        return true;
      }

      // Limpar observações de preparo (igual ao C#)
      for (const venda of cliente.Vendas) {
        venda.ObservacaoPreparo = "";
      }

      // Deduzir insumos do estoque
      await deduzirInsumoDoProduto(cliente);
      alert('✅ Produto marcado como pronto! Insumos foram deduzidos do estoque.');
    }

    // Atualizar flag
    cliente.ProdutoPronto = pronto;

    // Salvar cliente
    await salvarClienteComAuditoria(cliente);

    console.log(`✅ Cliente marcado como Produto Pronto: ${pronto ? "SIM" : "NÃO"}`);
    return true;

  } catch (erro) {
    console.error("❌ Erro ao marcar produto pronto:", erro);
    alert(`❌ Erro ao marcar produto pronto: ${erro.message}`);
    return false;
  }
}

// ============================================
// SALVAR CLIENTE COM AUDITORIA
// ============================================
async function salvarClienteComAuditoria(clienteNovo) {
  try {
    // Carregar cliente anterior para auditoria
    const clientes = await AuthManager.requisicaoSegura(`${CONFIG.API_URL}?acao=buscar&arquivo=clientes.json`)
      .then(r => r.json());
    
    const clienteAntigo = clientes.find(c => c.Id === clienteNovo.Id);

    // Registrar auditoria
    await registrarAtualizacaoCliente(clienteAntigo, clienteNovo);

    // Atualizar cliente na lista
    const index = clientes.findIndex(c => c.Id === clienteNovo.Id);
    if (index !== -1) {
      clientes[index] = clienteNovo;
    }

    // Salvar arquivo
    await salvarArquivoDrive("clientes.json", JSON.stringify(clientes, null, 2));

    return true;

  } catch (erro) {
    console.error("❌ Erro ao salvar cliente:", erro);
    return false;
  }
}
