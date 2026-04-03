// ============================================
// UTILITÁRIO DE PESQUISA COM AUTO-SCROLL
// ============================================
// Este arquivo implementa funcionalidade de pesquisa
// com auto-scroll em TODOS os módulos

/**
 * Cria e insere uma barra de pesquisa no topo da página
 * @param {Object} config - Configuração da pesquisa
 *   - containerId: ID do elemento onde inserir a barra
 *   - tableSelector: Seletor CSS da tabela (ex: 'table', '#minhatabela')
 *   - searchableColumns: Array de índices de colunas onde buscar (ex: [1, 2])
 *   - onSearch: Função callback após buscar (opcional)
 */
function criarBarraPesquisa(config) {
  const {
    containerId = 'pesquisaContainer',
    tableSelector = 'table',
    searchableColumns = [],
    onSearch = null
  } = config;

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('⚠️ Container de pesquisa não encontrado:', containerId);
    return;
  }

  // Criar HTML da barra de pesquisa
  const html = `
    <div class="pesquisa-bar" style="
      background: linear-gradient(135deg, rgba(31,163,122,.15), rgba(212,175,55,.08));
      border: 1px solid rgba(31,163,122,.25);
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 20px;
      backdrop-filter: blur(8px);
    ">
      <div style="display: flex; gap: 10px; align-items: center;">
        <input 
          type="text" 
          id="campoPesquisa" 
          placeholder="🔍 Buscar..." 
          style="
            flex: 1;
            padding: 10px 15px;
            background: rgba(15,42,34,.6);
            border: 1px solid rgba(31,163,122,.3);
            border-radius: 8px;
            color: #7cf0c2;
            font-size: 14px;
          "
        />
        <button 
          id="btnLimparPesquisa" 
          style="
            padding: 10px 20px;
            background: linear-gradient(145deg, rgba(31,163,122,.3), rgba(31,163,122,.15));
            color: #7cf0c2;
            border: 1px solid rgba(31,163,122,.3);
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
          "
        >
          ✨ Limpar
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;

  const campoPesquisa = document.getElementById('campoPesquisa');
  const btnLimpar = document.getElementById('btnLimparPesquisa');

  // Evento de busca ao digitar
  campoPesquisa.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase().trim();
    realizarPesquisa(termo, tableSelector, searchableColumns);
    if (onSearch) onSearch(termo);
  });

  // Evento de busca ao pressionar ENTER
  campoPesquisa.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const termo = e.target.value.toLowerCase().trim();
      realizarPesquisa(termo, tableSelector, searchableColumns);
      // Auto-scroll para o primeiro resultado encontrado
      scrollParaPrimeiroResultado(tableSelector);
      if (onSearch) onSearch(termo);
    }
  });

  // Evento para limpar pesquisa
  btnLimpar.addEventListener('click', () => {
    campoPesquisa.value = '';
    realizarPesquisa('', tableSelector, searchableColumns);
    if (onSearch) onSearch('');
  });
}

/**
 * Realiza a pesquisa na tabela
 */
function realizarPesquisa(termo, tableSelector, searchableColumns) {
  const tabela = document.querySelector(tableSelector);
  if (!tabela) {
    console.warn('⚠️ Tabela não encontrada:', tableSelector);
    return;
  }

  const linhas = tabela.querySelectorAll('tbody tr');
  let encontrados = 0;

  linhas.forEach(linha => {
    const textoCelulas = Array.from(linha.querySelectorAll('td'))
      .map(td => td.textContent.toLowerCase())
      .join(' ');

    const colunaEspecifica = searchableColumns.length > 0 
      ? Array.from(linha.querySelectorAll('td'))
        .filter((_, idx) => searchableColumns.includes(idx))
        .map(td => td.textContent.toLowerCase())
        .join(' ')
      : textoCelulas;

    const correspondencia = termo === '' || colunaEspecifica.includes(termo);

    if (correspondencia) {
      linha.style.display = '';
      encontrados++;
      // Destaque visual
      if (termo !== '') {
        linha.style.backgroundColor = 'rgba(31,163,122,.1)';
      } else {
        linha.style.backgroundColor = '';
      }
    } else {
      linha.style.display = 'none';
    }
  });

  console.log(`🔍 Pesquisa: "${termo}" - ${encontrados} resultado(s) encontrado(s)`);
}

/**
 * Auto-scroll para o primeiro resultado visível
 */
function scrollParaPrimeiroResultado(tableSelector) {
  const tabela = document.querySelector(tableSelector);
  if (!tabela) return;

  const primeiroVisivel = tabela.querySelector('tbody tr:not([style*="display: none"])');
  if (primeiroVisivel) {
    primeiroVisivel.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
}

/**
 * Versão simplificada: Apenas busca em TODO o texto da tabela
 */
function ativarPesquisaSimples(inputSelector, tableSelector) {
  const input = document.querySelector(inputSelector);
  if (!input) return;

  input.addEventListener('keyup', (e) => {
    const termo = e.target.value.toLowerCase();
    const tabela = document.querySelector(tableSelector);
    const linhas = tabela.querySelectorAll('tbody tr');

    linhas.forEach(linha => {
      const texto = linha.textContent.toLowerCase();
      if (texto.includes(termo)) {
        linha.style.display = '';
      } else {
        linha.style.display = 'none';
      }
    });

    // Auto-scroll ao pressionar ENTER
    if (e.key === 'Enter') {
      scrollParaPrimeiroResultado(tableSelector);
    }
  });
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================
// Para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    criarBarraPesquisa,
    realizarPesquisa,
    scrollParaPrimeiroResultado,
    ativarPesquisaSimples
  };
}
