// ============================================
// CARTEIRA DE NÚMEROS - Validação e Gestão
// ============================================

// DDDs válidos do Brasil (78 áreas)
const DDDS_VALIDOS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19', // São Paulo
  '21', '22', '24', // Rio de Janeiro
  '27', '28', // Espírito Santo
  '31', '32', '33', '34', '35', '37', '38', // Minas Gerais
  '41', '42', '43', '44', '45', '46', // Paraná
  '47', '48', '49', // Santa Catarina
  '51', '53', '54', '55', // Rio Grande do Sul
  '61', // Distrito Federal
  '62', '64', // Goiás
  '63', // Tocantins
  '65', '66', // Mato Grosso
  '67', // Mato Grosso do Sul
  '68', // Acre
  '69', // Amazonas
  '71', '73', '74', '75', '77', // Bahia
  '79', // Sergipe
  '81', '87', // Pernambuco
  '82', // Alagoas
  '83', // Paraíba
  '84', // Rio Grande do Norte
  '85', '88', // Ceará
  '86', '89', // Piauí
  '91', '93', '94', // Pará
  '95', // Roraima
  '97', '98', '99', // Amazonas
]);

// Carteira em memória (será carregada do localStorage ou servidor)
let carteira = new Map();

// Inicializar ao carregar página
document.addEventListener('DOMContentLoaded', () => {
  carregarCarteira();
});

/**
 * Carrega a carteira do localStorage ou servidor
 */
async function carregarCarteira() {
  try {
    // Tentar carregar do localStorage primeiro
    const dadosLocal = localStorage.getItem('carteira_numeros');
    if (dadosLocal) {
      const lista = JSON.parse(dadosLocal);
      carteira = new Map(lista);
      console.log(`✓ Carteira carregada do localStorage: ${carteira.size} números`);
    } else {
      console.log('ℹ️ Carteira vazia (localStorage)');
      carteira = new Map();
    }

    atualizarVisualizacaoCarteira();
  } catch (erro) {
    console.error('❌ Erro ao carregar carteira:', erro);
    mostrarMensagem('Erro ao carregar carteira', 'erro');
  }
}

/**
 * Corrige um número de telefone
 * @param {string} numero - Número a corrigir
 * @returns {object} - {numero, valido, ddd, erro}
 */
function corrigirNumero(numero) {
  // Remover espaços, hífens, parênteses, + e 55 (prefixo Brasil)
  let limpo = numero.replace(/[\s\-()]/g, '').replace(/^\+55/, '').replace(/^55/, '');

  // Validar comprimento
  if (limpo.length < 10) {
    return { numero: limpo, valido: false, erro: 'Número muito curto' };
  }

  if (limpo.length > 11) {
    return { numero: limpo, valido: false, erro: 'Número muito longo' };
  }

  // Extrair DDD (sempre os 2 primeiros dígitos)
  let ddd = limpo.substring(0, 2);
  let resto = limpo.substring(2);

  // Validar DDD
  if (!DDDS_VALIDOS.has(ddd)) {
    return { numero: limpo, valido: false, ddd: ddd, erro: `DDD ${ddd} inválido` };
  }

  // Para número com 10 dígitos (sem 9), adicionar 0
  let numeroCorrigido = limpo;
  if (limpo.length === 10) {
    numeroCorrigido = ddd + '0' + resto;
  }

  // Validar 9º dígito (deve ser 9 para celular)
  const nono = numeroCorrigido.substring(2, 3);
  if (nono !== '9') {
    return { numero: limpo, valido: false, ddd: ddd, erro: 'Não é celular (9º dígito != 9)' };
  }

  return {
    numero: numeroCorrigido,
    valido: true,
    ddd: ddd,
    original: numero,
    erro: null
  };
}

/**
 * Processa números inseridos pelo usuário
 */
function processarNumeros() {
  const input = document.getElementById('inputNumeros').value.trim();
  
  if (!input) {
    mostrarMensagem('Insira números primeiro', 'erro');
    return;
  }

  // Separar números (linha ou vírgula)
  const numeros = input
    .split(/[\n,]/)
    .map(n => n.trim())
    .filter(n => n.length > 0);

  console.log(`📱 Processando ${numeros.length} números...`);

  const resultados = [];
  const novos = [];
  let duplicados = 0;
  let erros = 0;

  // Processar cada número
  numeros.forEach((numero, index) => {
    const corrigido = corrigirNumero(numero);

    if (!corrigido.valido) {
      resultados.push({
        tipo: 'erro',
        numero: numero,
        erro: corrigido.erro
      });
      erros++;
      return;
    }

    // Verificar se já existe na carteira
    if (carteira.has(corrigido.numero)) {
      resultados.push({
        tipo: 'duplicado',
        numero: corrigido.numero,
        original: numero
      });
      duplicados++;
      return;
    }

    // Novo número
    novos.push(corrigido.numero);
    resultados.push({
      tipo: 'novo',
      numero: corrigido.numero,
      original: numero,
      ddd: corrigido.ddd
    });
  });

  // Exibir resultados
  exibirResultados(resultados, novos);

  // Salvar novos números
  if (novos.length > 0) {
    salvarParaCarteira(novos);
  }

  // Mensagem final
  const msg = `✓ Processados: ${numeros.length} | Novos: ${novos.length} | Duplicados: ${duplicados} | Erros: ${erros}`;
  mostrarMensagem(msg, 'sucesso');
}

/**
 * Exibe os resultados processados
 */
function exibirResultados(resultados, novos) {
  const container = document.getElementById('resultados');
  
  if (resultados.length === 0) {
    container.innerHTML = '<p style="color: #999;">Nenhum resultado</p>';
    return;
  }

  let html = '';

  resultados.forEach(item => {
    if (item.tipo === 'novo') {
      html += `
        <div class="result-item novo">
          <div class="result-numero">✓ ${item.numero}</div>
          <div style="font-size: 11px; color: #4caf50;">
            DDD ${item.ddd} • Novo
          </div>
        </div>
      `;
    } else if (item.tipo === 'duplicado') {
      html += `
        <div class="result-item duplicado">
          <div class="result-numero">⚠ ${item.numero}</div>
          <div style="font-size: 11px; color: #ff9999;">
            Já existe na carteira (ignorado)
          </div>
        </div>
      `;
    } else if (item.tipo === 'erro') {
      html += `
        <div class="result-item erro">
          <div class="result-numero">❌ ${item.numero}</div>
          <div style="font-size: 11px; color: #ff6666;">
            ${item.erro}
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

/**
 * Salva novos números para a carteira
 */
async function salvarParaCarteira(numeros) {
  try {
    // Adicionar à carteira em memória
    numeros.forEach(numero => {
      carteira.set(numero, {
        numero: numero,
        adicionado: new Date().toISOString(),
        status: 'ativo'
      });
    });

    // Salvar no localStorage
    const dadosParaSalvar = Array.from(carteira.entries());
    localStorage.setItem('carteira_numeros', JSON.stringify(dadosParaSalvar));

    console.log(`✓ Salvos ${numeros.length} novos números na carteira`);

    // Tentar salvar no servidor
    if (typeof CONFIG !== 'undefined' && CONFIG.API_URL) {
      await salvarCarteiraNoServidor();
    }

    atualizarVisualizacaoCarteira();
  } catch (erro) {
    console.error('❌ Erro ao salvar carteira:', erro);
  }
}

/**
 * Salva a carteira no servidor (Google Apps Script)
 */
async function salvarCarteiraNoServidor() {
  try {
    const dadosParaSalvar = Array.from(carteira.entries());
    
    const response = await fetch(`${CONFIG.API_URL}?action=salvarCarteira`, {
      method: 'POST',
      body: JSON.stringify({
        tipo: 'carteira',
        numeros: dadosParaSalvar
      })
    });

    const resultado = await response.json();
    if (resultado.sucesso) {
      console.log('✓ Carteira salva no servidor');
    }
  } catch (erro) {
    console.warn('⚠️ Não foi possível salvar no servidor:', erro);
    // Continuar funcionando com localStorage
  }
}

/**
 * Atualiza a visualização da carteira
 */
function atualizarVisualizacaoCarteira() {
  const container = document.getElementById('carteiraNumeros');
  const countContainer = document.getElementById('carteiraCount');

  if (carteira.size === 0) {
    container.innerHTML = '<p style="color: #666; text-align: center;">Vazio</p>';
    countContainer.textContent = '0 números';
    return;
  }

  // Listar todos os números
  const numeros = Array.from(carteira.keys()).sort();
  const html = numeros.map(n => `<div>${n}</div>`).join('');
  
  container.innerHTML = html;
  countContainer.textContent = `${carteira.size} número${carteira.size > 1 ? 's' : ''}`;
}

/**
 * Copia a carteira para clipboard
 */
async function copiarCarteira() {
  if (carteira.size === 0) {
    mostrarMensagem('Carteira vazia', 'erro');
    return;
  }

  const numeros = Array.from(carteira.keys()).sort().join('\n');
  
  try {
    await navigator.clipboard.writeText(numeros);
    mostrarMensagem(`✓ ${carteira.size} números copiados!`, 'sucesso');
  } catch (erro) {
    console.error('Erro ao copiar:', erro);
    mostrarMensagem('Erro ao copiar', 'erro');
  }
}

/**
 * Exporta carteira como CSV
 */
function exportarCSV() {
  if (carteira.size === 0) {
    mostrarMensagem('Carteira vazia', 'erro');
    return;
  }

  // Criar CSV
  let csv = 'Número,DDD,Data Adicionado,Status\n';
  
  Array.from(carteira.values())
    .sort((a, b) => a.numero.localeCompare(b.numero))
    .forEach(item => {
      const ddd = item.numero.substring(0, 2);
      const data = new Date(item.adicionado).toLocaleDateString('pt-BR');
      csv += `${item.numero},${ddd},${data},${item.status}\n`;
    });

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `carteira_numeros_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  mostrarMensagem(`✓ Exportados ${carteira.size} números em CSV!`, 'sucesso');
}

/**
 * Exibe mensagem de feedback
 */
function mostrarMensagem(texto, tipo = 'sucesso') {
  const msg = document.createElement('div');
  msg.className = `mensagem ${tipo}`;
  msg.textContent = texto;
  document.body.appendChild(msg);

  setTimeout(() => {
    msg.remove();
  }, 4000);
}
