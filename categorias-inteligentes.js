/* ============================================================
   MOTOR DE CATEGORIAS INTELIGENTES
   - Consolida variações como XXWALLYSON / WALLYSON XX -> WALLYSON
   - Aprende aliases a partir de correções humanas
   - Usa histórico para categorias analíticas sem regravar despesas antigas
   ============================================================ */
(function () {
  const STOPWORDS = new Set([
    'A','O','OS','AS','DE','DA','DO','DAS','DOS','E','EM','PARA','POR','COM','SEM','NA','NO','NAS','NOS',
    'PIX','PAGAMENTO','PAGO','COMPRA','DEBITO','DÉBITO','CREDITO','CRÉDITO','TRANSFERENCIA','TRANSFERÊNCIA',
    'TED','DOC','LTDA','ME','EIRELI','COMERCIO','COMÉRCIO','COMERCIAL','SERVICOS','SERVIÇOS','SERVICO','SERVIÇO',
    'AV','RUA','BR','SA','FILIAL','MATRIZ','RECEBIMENTO','LANCTO','LANÇTO','TITULO','TÍTULO','TITULOS','TÍTULOS',
    'CARTAO','CARTÃO'
  ]);

  const CATEGORIAS_GENERICAS = new Set([
    '', 'OUTRO', 'OUTROS', 'SEM CATEGORIA', 'SEM_CATEGORIA', 'PESSOA'
  ]);

  const REGRAS_BASE = {
    'GRAFICA': ['GRAFICA', 'GRÁFICA', 'IMPRESSAO', 'IMPRESSÃO', 'ROBERSON WILLIAN'],
    'BANCO': ['TARIFA', 'BANCO', 'TRANSFERENCIA', 'TRANSFERÊNCIA', 'TED', 'DOC', 'CESTA DE RELACIONAMENTO', 'BOLETO', 'MANUTENCAO DE TITULOS', 'LIQUIDACAO BOLETO', 'LIQUIDACAO PIXCOB'],
    'POSTO': ['POSTO', 'AUTO POSTO', 'COMBUSTIVEL', 'COMBUSTÍVEL', 'GASOLINA', 'DIESEL', 'ETANOL', 'ABASTEC', 'ABASTECIMENTO', 'SHELL', 'IPIRANGA', 'PETROBRAS'],
    'TRANSPORTADORA': ['TRANSPORTADORA', 'FRETE', 'TRANSPORTE', 'TNORTE', 'TRÂNSITO', 'TRANSITO', 'CAIRU', 'LOGISTICA', 'LOGÍSTICA', 'EXPRESSO RIO'],
    'ENERGIA': ['ENERGIA', 'LUZ', 'ELETRICIDADE', 'ANEEL'],
    'INTERNET': ['INTERNET', 'TELECOM', 'SETTE TELECOM'],
    'AGUA': ['AGUA', 'ÁGUA', 'SANEAMENTO', 'HIDRO', 'SABESP'],
    'IMPOSTO': ['IMPOSTO', 'DARF', 'SPC', 'CDL'],
    'MERCADO': ['MERCADO', 'MERCEARIA', 'DISTRIBUIDORA', 'SUPERMERCADO'],
    'FACEBOOK': ['FACEBOOK', 'META', 'ADS', 'PUBLICIDADE'],
    'SISTEMAS': ['SISTEMA DE NFE', 'NUVEM FISCAL', 'SISTEMA', 'SOFTWARE', 'ZAMBOTTO'],
    'EMBALAGEM': ['EASYPACK', 'EMBALAGEM', 'CAIXA'],
    'CELULAR': ['MULTIDISPLAY', 'CELULAR', 'TELEFONE', 'MOVEL', 'MÓVEL'],
    'MANUTENCAO': ['MANUTENCAO', 'MANUTENÇÃO', 'REPARO', 'CONSERTO']
  };

  function normalizarTexto(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizarCategoria(categoria) {
    const c = normalizarTexto(categoria);
    if (!c) return '';
    if (/^R?\s?\$?\s?[\d.,]+$/.test(c)) return '';
    return c;
  }

  function ehCategoriaGenerica(categoria) {
    return CATEGORIAS_GENERICAS.has(normalizarCategoria(categoria));
  }

  function tokensRelevantes(texto) {
    return normalizarTexto(texto)
      .split(' ')
      .filter(t => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
  }

  function obterAliases(memoria) {
    if (!memoria || typeof memoria !== 'object') return {};
    if (!memoria.__aliases || typeof memoria.__aliases !== 'object') memoria.__aliases = {};
    return memoria.__aliases;
  }

  function obterAprendizado(memoria) {
    if (!memoria || typeof memoria !== 'object') return [];
    if (!Array.isArray(memoria.__aprendizado)) memoria.__aprendizado = [];
    return memoria.__aprendizado;
  }

  function extrairMapeamentosExatos(memoria) {
    const mapa = {};
    Object.entries(memoria || {}).forEach(([chave, valor]) => {
      if (chave.startsWith('__')) return;
      const categoria = normalizarCategoria(valor);
      if (!categoria) return;
      mapa[normalizarTexto(chave)] = categoria;
    });
    return mapa;
  }

  function categoriasCanonicasDoHistorico(despesas = [], memoria = {}) {
    const contagem = new Map();

    despesas.forEach(d => {
      const cat = normalizarCategoria(d.Categoria);
      if (!cat || ehCategoriaGenerica(cat)) return;
      contagem.set(cat, (contagem.get(cat) || 0) + 1);
    });

    Object.values(extrairMapeamentosExatos(memoria)).forEach(cat => {
      if (!cat || ehCategoriaGenerica(cat)) return;
      contagem.set(cat, (contagem.get(cat) || 0) + 1);
    });

    Object.values(obterAliases(memoria)).forEach(cat => {
      const c = normalizarCategoria(cat);
      if (!c || ehCategoriaGenerica(c)) return;
      contagem.set(c, (contagem.get(c) || 0) + 1);
    });

    Object.keys(REGRAS_BASE).forEach(cat => {
      contagem.set(cat, Math.max(contagem.get(cat) || 0, 1));
    });

    return Array.from(contagem.keys()).sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      return a.localeCompare(b);
    });
  }

  function canonizarCategoria(categoria, canonicas = []) {
    const raw = normalizarCategoria(categoria);
    if (!raw) return '';
    const candidatas = canonicas
      .filter(c => raw === c || raw.includes(c) || c.includes(raw))
      .sort((a, b) => a.length - b.length);
    return candidatas[0] || raw;
  }

  function aprenderCategoria(descricao, categoria, memoria = {}) {
    const descNorm = normalizarTexto(descricao);
    const catNorm = normalizarCategoria(categoria);
    if (!descNorm || !catNorm || ehCategoriaGenerica(catNorm)) return memoria;

    memoria[descricao] = catNorm;
    memoria[descNorm] = catNorm;

    const aliases = obterAliases(memoria);
    const aprendizado = obterAprendizado(memoria);
    const tokens = tokensRelevantes(descricao);

    if (descNorm.includes(catNorm)) aliases[catNorm] = catNorm;

    tokens.forEach(token => {
      if (token.length < 4) return;
      aliases[token] = catNorm;
    });

    aprendizado.push({
      descricao: String(descricao || ''),
      categoria: catNorm,
      tokens,
      data: new Date().toISOString()
    });

    if (aprendizado.length > 500) memoria.__aprendizado = aprendizado.slice(-500);
    return memoria;
  }

  function criarMotor(despesas = [], memoria = {}) {
    const exact = extrairMapeamentosExatos(memoria);
    const aliases = { ...obterAliases(memoria) };
    const canonicas = categoriasCanonicasDoHistorico(despesas, memoria);
    const stats = {};

    despesas.forEach(d => {
      const categoriaOriginal = normalizarCategoria(d.Categoria);
      if (!categoriaOriginal || ehCategoriaGenerica(categoriaOriginal)) return;
      const categoria = canonizarCategoria(categoriaOriginal, canonicas);
      tokensRelevantes(d.Descricao).forEach(token => {
        if (!stats[token]) stats[token] = {};
        stats[token][categoria] = (stats[token][categoria] || 0) + 1;
      });
    });

    Object.entries(stats).forEach(([token, contagens]) => {
      const pares = Object.entries(contagens).sort((a, b) => b[1] - a[1]);
      const total = pares.reduce((s, [, n]) => s + n, 0);
      const [melhorCat, melhorQtd] = pares[0] || [];
      if (melhorCat && melhorQtd >= 2 && melhorQtd / total >= 0.75) aliases[token] = melhorCat;
    });

    return { exact, aliases, canonicas, stats };
  }

  function scoreRegrasBase(descNorm) {
    const scores = {};
    Object.entries(REGRAS_BASE).forEach(([categoria, palavras]) => {
      palavras.forEach(palavra => {
        if (descNorm.includes(normalizarTexto(palavra))) {
          scores[categoria] = Math.max(scores[categoria] || 0, 70);
        }
      });
    });
    return scores;
  }

  function categorizar(descricao, categoriaInformada = '', motor = null) {
    const descNorm = normalizarTexto(descricao);
    const m = motor || criarMotor();
    const rawCat = normalizarCategoria(categoriaInformada);
    const scores = {};

    if (rawCat && !ehCategoriaGenerica(rawCat)) {
      const catCanonica = canonizarCategoria(rawCat, m.canonicas);
      scores[catCanonica] = Math.max(scores[catCanonica] || 0, 55);
    }

    if (m.exact[descNorm]) return canonizarCategoria(m.exact[descNorm], m.canonicas);

    m.canonicas.forEach(categoria => {
      if (categoria.length >= 4 && descNorm.includes(categoria)) {
        scores[categoria] = Math.max(scores[categoria] || 0, 100);
      }
    });

    Object.entries(m.aliases || {}).forEach(([alias, categoria]) => {
      const aliasNorm = normalizarTexto(alias);
      if (aliasNorm && descNorm.includes(aliasNorm)) {
        const catCanonica = canonizarCategoria(categoria, m.canonicas);
        scores[catCanonica] = Math.max(scores[catCanonica] || 0, 90);
      }
    });

    Object.entries(scoreRegrasBase(descNorm)).forEach(([cat, score]) => {
      const canonica = canonizarCategoria(cat, m.canonicas);
      scores[canonica] = Math.max(scores[canonica] || 0, score);
    });

    tokensRelevantes(descricao).forEach(token => {
      const contagens = m.stats[token];
      if (!contagens) return;
      const pares = Object.entries(contagens).sort((a, b) => b[1] - a[1]);
      const total = pares.reduce((s, [, n]) => s + n, 0);
      const [melhorCat, melhorQtd] = pares[0] || [];
      if (melhorCat && melhorQtd / total >= 0.60) {
        scores[melhorCat] = Math.max(scores[melhorCat] || 0, 60 + Math.min(20, melhorQtd * 3));
      }
    });

    const melhor = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    if (melhor) return melhor[0];

    return rawCat && !ehCategoriaGenerica(rawCat)
      ? canonizarCategoria(rawCat, m.canonicas)
      : 'SEM CATEGORIA';
  }

  function categoriaEhSuspeita(categoria) {
    const c = normalizarCategoria(categoria);
    return !c || ehCategoriaGenerica(c) || /^R?\s?\$?\s?[\d.,]+$/.test(c);
  }

  window.CategoriasInteligentes = {
    normalizarTexto,
    normalizarCategoria,
    tokensRelevantes,
    criarMotor,
    categorizar,
    aprenderCategoria,
    categoriaEhSuspeita,
    canonizarCategoria
  };
})();
