// ============================================================
// VERSÃO SIMPLIFICADA - Para testar sem Google Apps Script
// Copie este código para o console do navegador para testar
// ============================================================

// Simular função que gera rastreio
async function simuladorGerarRastreio() {
  // Dados de teste
  const dados = {
    cidadeSaida: "Anápolis",
    cidadeAtual: "Goiânia",
    cidadeDestino: "Brasília",
    dataChegada: "2026-04-10",
    paradas: 1,
    nfVenda: "12345"
  };

  // Simular processamento
  console.log("📤 Enviando:", dados);

  // Gerar código
  const codigo = "BR" + Math.floor(Math.random() * 9000000000) + 1000000000;
  console.log("✅ Código gerado:", codigo);

  // Gerar rota
  const rota = gerarRotaSimulada(dados);
  console.log("🛣️ Rota:", rota);

  // Gerar histórico
  const historico = gerarHistoricoSimulado(rota, new Date(dados.dataChegada), dados.cidadeSaida);
  console.log("📍 Histórico:", historico);

  // Retornar resultado
  return {
    sucesso: true,
    codigo: codigo,
    historico: historico,
    rota: rota
  };
}

// Gerar rota simulada
function gerarRotaSimulada(dados) {
  const rota = [
    dados.cidadeSaida,
    dados.cidadeAtual,
    dados.cidadeDestino
  ];
  return rota;
}

// Gerar histórico simulado
function gerarHistoricoSimulado(rota, dataChegada, cidadeSaida) {
  let historico = [];
  let dataAtual = new Date(dataChegada);
  
  // Evento final - Entregue
  historico.push({
    text: `Objeto entregue - ${rota[rota.length - 1]}`,
    time: formatarDataSimulada(dataAtual)
  });

  // Voltar pelos eventos
  for (let i = rota.length - 2; i >= 0; i--) {
    dataAtual = new Date(dataAtual.getTime() - (2 * 24 * 60 * 60 * 1000)); // 2 dias antes
    
    historico.push({
      text: `Objeto está em rota para - ${rota[i]}`,
      time: formatarDataSimulada(new Date(dataAtual.getTime() - (8 * 60 * 60 * 1000)))
    });

    historico.push({
      text: `Objeto está em - ${rota[i]}`,
      time: formatarDataSimulada(dataAtual)
    });
  }

  // Evento inicial
  const dataSaida = new Date(dataAtual.getTime() - (2 * 24 * 60 * 60 * 1000));
  historico.push({
    text: `Objeto retirado pela transportadora - ${cidadeSaida}`,
    time: formatarDataSimulada(dataSaida)
  });

  return historico.reverse();
}

// Formatar data simulada
function formatarDataSimulada(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  
  return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
}

// ============================================================
// TESTE NO CONSOLE
// ============================================================

// Chamar a função:
// simuladorGerarRastreio().then(resultado => console.log(resultado));

// Resultado esperado:
/*
{
  sucesso: true,
  codigo: "BR8847362915",
  historico: [
    { text: "Objeto retirado pela transportadora - Anápolis", time: "02/04/2026 10:30" },
    { text: "Objeto está em - Anápolis", time: "04/04/2026 10:30" },
    { text: "Objeto está em rota para - Goiânia", time: "04/04/2026 02:30" },
    { text: "Objeto está em - Goiânia", time: "06/04/2026 10:30" },
    { text: "Objeto está em rota para - Brasília", time: "06/04/2026 02:30" },
    { text: "Objeto entregue - Brasília", time: "10/04/2026 00:00" }
  ],
  rota: ["Anápolis", "Goiânia", "Brasília"]
}
*/
