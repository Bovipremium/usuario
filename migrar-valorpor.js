// 🔧 SCRIPT DE MIGRAÇÃO: Adiciona ValorPago a todas as parcelas
// Execute isso UMA VEZ no console para atualizar clientes.json

async function migrarValorPagoEmParcellas() {
  console.log('🔧 Iniciando migração de ValorPago...');
  
  try {
    // 1. Buscar clientes.json
    const clientes = await buscarArquivo('clientes.json');
    console.log('✅ Carregou', clientes.length, 'clientes');
    
    let totalParcelasAtualizadas = 0;
    
    // 2. Iterar sobre todos os clientes
    clientes.forEach((cliente, idxCliente) => {
      if (!cliente.Vendas || !Array.isArray(cliente.Vendas)) return;
      
      // 3. Iterar sobre todas as vendas
      cliente.Vendas.forEach((venda, idxVenda) => {
        if (!venda.Parcelas || !Array.isArray(venda.Parcelas)) return;
        
        // 4. Iterar sobre todas as parcelas
        venda.Parcelas.forEach((parcela, idxParcela) => {
          // Se não tem ValorPago, adicionar 0
          if (parcela.ValorPago === undefined || parcela.ValorPago === null) {
            parcela.ValorPago = 0;
            totalParcelasAtualizadas++;
            console.log(`  ✅ Cliente ${cliente.Nome} - Parcela ${parcela.Numero} - ValorPago = 0`);
          }
        });
      });
    });
    
    console.log(`\n📊 Total de parcelas atualizadas: ${totalParcelasAtualizadas}`);
    
    if (totalParcelasAtualizadas === 0) {
      console.log('ℹ️ Nenhuma parcela precisava atualização (todas já têm ValorPago)');
      return;
    }
    
    // 5. Salvar clientes.json atualizado
    console.log('\n💾 Salvando clientes.json no Google Drive...');
    const resultadoSalvar = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'acao': 'salvar',
        'arquivo': 'clientes.json',
        'dados': JSON.stringify(clientes),
        'deviceId': localStorage.getItem('deviceId') || 'device-' + Date.now()
      })
    });
    
    const resposta = await resultadoSalvar.text();
    console.log('📡 Resposta do servidor:', resposta);
    
    if (resultadoSalvar.ok) {
      console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log(`✅ ${totalParcelasAtualizadas} parcelas foram atualizadas`);
      return true;
    } else {
      console.error('❌ Erro ao salvar:', resposta);
      return false;
    }
    
  } catch (erro) {
    console.error('❌ Erro na migração:', erro);
    return false;
  }
}

// Para executar, digite no console:
// migrarValorPagoEmParcellas()
