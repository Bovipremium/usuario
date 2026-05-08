// ============================================
// REVISÃO DE CONTATOS - V7
// COM MARCAÇÃO DE TIPO (LIGAÇÃO/WHATSAPP)
// COM LISTA NEGRA (BLACKLIST)
// ============================================

const ARQUIVO_CONTATOS = 'revisao_contatos.json';
const ARQUIVO_BLACKLIST = 'revisao_contatos_blacklist.json';
let contatosGlobais = [];
let numerosTemporarios = [];
let blacklist = []; // Lista negra de números deletados

// Wrapper para mostrarMensagem (função auxiliar)
function exibirMensagem(aba, texto, tipo) {
  try {
    if (typeof mostrarMensagem === 'function') {
      mostrarMensagem(aba, texto, tipo);
    } else {
      console.warn('mostrarMensagem nao disponivel, usando alert:', texto);
      alert(texto);
    }
  } catch (e) {
    console.error('Erro ao exibir mensagem:', e);
    alert(texto);
  }
}

// ============================================
// INICIALIZAÇÃO
// ============================================
window.addEventListener('load', async () => {
  console.log('🚀 Módulo Revisão de Contatos iniciado');
  
  // Verificar auth
  const usuarioLogado = verificarLogin();
  if (!usuarioLogado) {
    window.location.href = 'keygate.html';
    return;
  }

  // Mostrar loading na inicialização
  mostrarLoadingTela();
  
  // Carregar dados do Drive
  await carregarDoGoogleDrive();
  
  // Carregar blacklist
  await carregarBlacklist();
  
  // Esconder loading
  esconderLoadingTela();
});

// ============================================
// LOADING SCREEN FULLSCREEN
// ============================================
function mostrarLoadingTela() {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(5, 11, 9, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    `;
    overlay.innerHTML = `
      <div style="text-align: center;">
        <div style="
          width: 60px;
          height: 60px;
          border: 4px solid rgba(31, 163, 122, 0.3);
          border-top: 4px solid #1fa37a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        "></div>
        <p style="color: #1fa37a; font-size: 18px; font-weight: 600;">Carregando...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
}

function esconderLoadingTela() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}


// ============================================
// HELPERS DE LISTA / BLACKLIST / ABAS
// ============================================
function chaveNumero(numero) {
  return String(numero || '').replace(/\D/g, '');
}

function mesmoNumero(a, b) {
  return chaveNumero(a) === chaveNumero(b);
}

function estaNaBlacklist(numero) {
  return blacklist.some(item => {
    if (typeof item === 'string' || typeof item === 'number') {
      return item === numero || mesmoNumero(item, numero);
    }
    if (item && item.numero) {
      return item.numero === numero || mesmoNumero(item.numero, numero);
    }
    return false;
  });
}

function adicionarNumeroNaBlacklist(numero) {
  if (!estaNaBlacklist(numero)) {
    blacklist.push(numero);
    return true;
  }
  return false;
}

function contatosCombinadosUnicos() {
  const mapa = new Map();

  // Globais primeiro, temporários depois: se o mesmo número foi editado na tela,
  // o temporário/última edição prevalece.
  [...contatosGlobais, ...numerosTemporarios].forEach(contato => {
    if (!contato || !contato.numero) return;
    mapa.set(chaveNumero(contato.numero), contato);
  });

  return Array.from(mapa.values()).filter(c => !estaNaBlacklist(c.numero));
}

function contatosParaAba(tipoAba) {
  const base = numerosTemporarios.length > 0 ? numerosTemporarios : contatosGlobais;
  const limpos = base.filter(c => c && c.numero && !estaNaBlacklist(c.numero));

  if (tipoAba === 'whatsapp') {
    return limpos.filter(c => c.tipo === 'whatsapp');
  }

  if (tipoAba === 'ligacao') {
    return limpos.filter(c => c.tipo !== 'whatsapp');
  }

  return limpos;
}

function abaAtivaAtual() {
  const ativa = document.querySelector('.tab-content.active');
  if (!ativa || !ativa.id) return 'json';
  return ativa.id.replace('aba-', '');
}

function atualizarTodasAsAbas() {
  renderizarTabelaLigacoes(contatosParaAba('ligacao'));
  renderizarTabelaWhatsapp(contatosParaAba('whatsapp'));
  renderizarJSON();
  renderizarTabelaNumerosProcessados();
  atualizarCampoCopia();
}

function atualizarCheckboxTudoWhatsapp() {
  const check = document.getElementById('checkTodosWhatsapp');
  if (!check) return;

  const ligacoes = contatosParaAba('ligacao');
  check.checked = false;
  check.disabled = ligacoes.length === 0;
  check.title = ligacoes.length === 0
    ? 'Nenhum contato restante na aba Ligações'
    : `Marcar ${ligacoes.length} contato(s) para WhatsApp`;
}

// ============================================
// MUDANÇA DE ABAS
// ============================================
function mudarAba(abaName) {
  document.querySelectorAll('.tab-content').forEach(aba => aba.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(`aba-${abaName}`).classList.add('active');
  if (event && event.target) {
    event.target.classList.add('active');
  }
  
  // Se for para Ligações, mostrar APENAS contatos que NÃO são WhatsApp
  if (abaName === 'ligacao') {
    renderizarTabelaLigacoes(contatosParaAba('ligacao'));
  }
  
  // Se for para WhatsApp, mostrar APENAS contatos que SÃO WhatsApp
  if (abaName === 'whatsapp') {
    renderizarTabelaWhatsapp(contatosParaAba('whatsapp'));
  }
}

// ============================================
// NORMALIZAR NÚMERO
// ============================================
function normalizarNumero(numero) {
  let limpo = numero.replace(/\D/g, '').trim();
  
  if (!limpo) {
    return null;
  }
  
  // Se tem 12 dígitos sem começar com 0, provavelmente tem +55 implícito ou extra
  if (limpo.length === 12 && !limpo.startsWith('0')) {
    // Pega: ddd (2) + 8 dígitos (vai ficar 0 + ddd + 9 + 8 = 11)
    limpo = limpo.substring(0, 2) + limpo.substring(3);
  }
  
  // Se tem 11 dígitos sem começar com 0, remove um dígito
  if (limpo.length === 11 && !limpo.startsWith('0')) {
    limpo = limpo.substring(0, 2) + limpo.substring(3);
  }
  
  // Se tem 10 dígitos, precisa adicionar 0 + 9
  if (limpo.length === 10) {
    // Exemplo: 6298766453 → 0 + 62 + 9 + 98766453 = 062998766453
    limpo = '0' + limpo.substring(0, 2) + '9' + limpo.substring(2);
  }
  // Se tem 9 dígitos, também adiciona 0 + 9
  else if (limpo.length === 9) {
    // DDD está em posição 0-1
    limpo = '0' + limpo.substring(0, 2) + '9' + limpo.substring(2);
  }
  // Se não começa com 0, adiciona
  else if (!limpo.startsWith('0')) {
    limpo = '0' + limpo;
  }
  
  // Validar: deve ter 11 ou 12 dígitos
  if (limpo.length !== 11 && limpo.length !== 12) {
    return null;
  }
  
  return limpo;
}

// ============================================
// PROCESSAR NÚMEROS (COM NOME E OBS)
// ============================================
async function processarNumerosRaw(botao) {
  try {
    const textarea = document.getElementById('textareaNumerosRaw');
    const texto = textarea.value.trim();
    
    if (!texto) {
      exibirMensagem('cola', '❌ Cole pelo menos um número', 'error');
      return;
    }
    
    mostrarLoadingTela();
    
    // ✅ LIMPAR números temporários antigos ao reprocessar
    numerosTemporarios = [];
    console.log('🗑️ Temporários limpos para novo processamento');
    
    const linhas = texto.split(/\n/).map(l => l.trim()).filter(l => l);
    const numerosProcessados = [];
    
    // Carregar do Drive para verificar duplicatas
    await carregarDoGoogleDrive();
    const numerosNoJSON = contatosGlobais.map(c => c.numero);
    
    // Carregar blacklist para verificar números deletados
    await carregarBlacklist();
    
    console.log('🔄 PROCESSANDO NÚMEROS COM NOME E OBS');
    console.log(`📝 Total de linhas para processar: ${linhas.length}`);
    console.log(`� Números no JSON: ${numerosNoJSON.length} -`, numerosNoJSON.slice(0, 3));
    console.log(`�🚫 Números na blacklist: ${blacklist.length} -`, blacklist.slice(0, 3));
    
    for (const linha of linhas) {
      console.log(`\n🔎 Processando linha: "${linha}"`);
      
      // Estratégia: extrair TODOS os dígitos (com espaços/hífen) em qualquer parte da linha
      // Depois separar: NOME (começo) - NÚMERO (sequência de dígitos) - OBS (resto)
      
      let nome = '';
      let numeroRaw = '';
      let obs = '';
      
      // Buscar sequência de dígitos (com espaços, hífens, parênteses)
      // Padrão: captura números que podem ter formatação
      const numeroMatch = linha.match(/([\d\s\-()]+)/);
      
      if (numeroMatch) {
        const indexNumero = linha.indexOf(numeroMatch[1]);
        
        // NOME: tudo antes da sequência de números
        nome = linha.substring(0, indexNumero).trim();
        
        // NÚMERO: a sequência de números encontrada
        numeroRaw = numeroMatch[1].trim();
        
        // OBS: tudo depois da sequência de números
        const afterNumero = indexNumero + numeroMatch[1].length;
        obs = linha.substring(afterNumero).trim();
        
        // Remover hífens iniciais/finais da OBS
        obs = obs.replace(/^[-\s]+/, '').trim();
        
        console.log(`  📌 Nome: "${nome}"`);
        console.log(`  📞 Número RAW: "${numeroRaw}"`);
        console.log(`  📝 Obs: "${obs}"`);
      } else {
        console.log(`  ⚠️ Nenhuma sequência de dígitos encontrada`);
        continue;
      }
      
      // Normalizar número
      const numero = normalizarNumero(numeroRaw);
      
      if (!numero) {
        console.log(`  ❌ Número inválido após normalizar: "${numeroRaw}"`);
        continue;
      }
      
      if (numerosNoJSON.includes(numero)) {
        console.log(`  Duplicata (ja no JSON): ${numero}`);
        continue;
      }
      
      // VERIFICACAO DETALHADA DA BLACKLIST
      const emBlacklist = estaNaBlacklist(numero);
      console.log(`  Verificando blacklist para ${numero}: ${emBlacklist} (blacklist tem ${blacklist.length} numeros)`);
      if (emBlacklist) {
        console.log(`  BLOQUEADO (na blacklist): ${numero}`);
        continue;
      }
      
      // VERIFICACAO adicional: garantir que nao esta em processamentos anteriores (mesma rodada)
      if (numerosProcessados.find(n => n.numero === numero)) {
        console.log(`  Duplicata (ja processado nesta rodada): ${numero}`);
        continue;
      }
      
      // ADICIONAR o número
      numerosProcessados.push({
        numero: numero,
        nome: nome,
        obs: obs,
        tipo: 'ligacao',
        data: new Date().toISOString()
      });
      console.log(`  ADICIONADO: ${numero} | Nome: "${nome}" | Obs: "${obs}"`);
    }
    
    esconderLoadingTela();
    
    if (numerosProcessados.length === 0) {
      exibirMensagem('cola', '❌ Nenhum número válido ou novo', 'error');
      return;
    }
    
    // ✅ LIMPAR temporários antigos e trazer NOVOS
    numerosTemporarios = numerosProcessados;
    
    console.log(`\n✅ ${numerosProcessados.length} números processados!`);
    exibirMensagem('cola', `✅ ${numerosProcessados.length} números processados!`, 'success');
    renderizarTabelaNumerosProcessados();
    atualizarCampoCopia();
    
    // Auto-mostrar números em AMBAS as abas (sem redirecionar)
    console.log('🎯 Auto-display: Renderizando abas com números processados');
    
    // Renderizar Ligações (APENAS os números temporários processados - novos)
    if (numerosProcessados.length > 0) {
      renderizarTabelaLigacoes(numerosProcessados);
      console.log(`✅ Ligações: ${numerosProcessados.length} números (novos apenas)`);
    }
    
    // Renderizar WhatsApp somente com os que realmente foram marcados como WhatsApp
    const novosWhatsapp = numerosProcessados.filter(n => n.tipo === 'whatsapp');
    renderizarTabelaWhatsapp(novosWhatsapp);
    console.log(`✅ WhatsApp: ${novosWhatsapp.length} números marcados`);
    
    // Renderizar JSON
    renderizarJSON();
    
    // NÃO redirecionar automaticamente - manter na Cola
    console.log('✅ Números prontos para edição (sem redirecionamento automático)');
    
  } catch (erro) {
    console.error('❌ Erro:', erro);
    exibirMensagem('cola', '❌ Erro: ' + erro.message, 'error');
    esconderLoadingTela();
  }
}

// ============================================
// RENDERIZAR TABELA TEMPORÁRIA
// ============================================
function renderizarTabelaNumerosProcessados() {
  const tbody = document.getElementById('tabelaNumerosProcessados');
  
  if (numerosTemporarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8fb9ac;">Nenhum número</td></tr>`;
    return;
  }
  
  tbody.innerHTML = numerosTemporarios.map((item, idx) => `
    <tr>
      <td class="numeracao">${idx + 1}</td>
      <td class="numero-celula"><strong>${item.numero}</strong></td>
      <td><input type="text" value="${item.nome}" placeholder="Nome" onchange="numerosTemporarios[${idx}].nome = this.value;" style="width: 100%; padding: 6px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.2); border-radius: 6px; color: #e5f3ee; font-size: 12px;"></td>
      <td><input type="text" value="${item.obs}" placeholder="Obs" onchange="numerosTemporarios[${idx}].obs = this.value;" style="width: 100%; padding: 6px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.2); border-radius: 6px; color: #e5f3ee; font-size: 12px;"></td>
      <td class="acoes-celula">
        <button class="btn-delete" onclick="removerTemporario(${idx})">🗑️ Apagar</button>
      </td>
    </tr>
  `).join('');
}

function removerTemporario(idx) {
  numerosTemporarios.splice(idx, 1);
  renderizarTabelaNumerosProcessados();
  atualizarCampoCopia();
}

function limparCola(botao) {
  document.getElementById('textareaNumerosRaw').value = '';
  numerosTemporarios = [];
  renderizarTabelaNumerosProcessados();
  atualizarCampoCopia();
  exibirMensagem('cola', '', '');
}

// ============================================
// ATUALIZAR CAMPO DE CÓPIA
// ============================================
function atualizarCampoCopia() {
  const campo = document.getElementById('campoCopiaNumerosLimpos');
  if (!campo) return;
  
  if (numerosTemporarios.length === 0) {
    campo.value = '';
    return;
  }
  
  campo.value = numerosTemporarios.map(n => n.numero).join('\n');
}

// ============================================
// COPIAR NÚMEROS
// ============================================
function copiarCampo(botao) {
  try {
    const campo = document.getElementById('campoCopiaNumerosLimpos');
    
    if (!campo.value.trim()) {
      exibirMensagem('cola', '❌ Nenhum número para copiar', 'error');
      return;
    }
    
    campo.select();
    document.execCommand('copy');
    exibirMensagem('cola', `✅ ${campo.value.split('\n').length} números copiados!`, 'success');
    
  } catch (err) {
    exibirMensagem('cola', '❌ Erro ao copiar', 'error');
  }
}

// ============================================
// SALVAR NO JSON (GOOGLE DRIVE)
// ============================================
async function salvarJSON(botao) {
  try {
    mostrarLoadingTela();
    
    console.log('💾 ===== SALVAR JSON =====');
    console.log(`📝 Temporários: ${numerosTemporarios.length}`);
    numerosTemporarios.forEach((t, i) => {
      console.log(`   [${i}] ${t.numero} | nome: "${t.nome}" | obs: "${t.obs}"`);
    });
    
    console.log(`📁 Globais (editáveis): ${contatosGlobais.length}`);
    contatosGlobais.forEach((g, i) => {
      console.log(`   [${i}] ${g.numero} | nome: "${g.nome}" | obs: "${g.obs}" | tipo: ${g.tipo}`);
    });
    
    // ✅ NOVO: Salvar APENAS temporários novos (não salvar números que já estão no JSON)
    // Se há temporários, salvar SÓ eles + manter globais como estão
    let paraGravar;
    
    if (numerosTemporarios.length > 0) {
      console.log('✅ Há números temporários - salvando APENAS temporários + globais existentes');
      paraGravar = [...numerosTemporarios, ...contatosGlobais];
    } else {
      console.log('⚠️ Sem temporários - salvando apenas globais (edições)');
      paraGravar = contatosGlobais;
    }
    
    console.log(`📊 Total para gravar: ${paraGravar.length} contatos`);
    
    if (paraGravar.length === 0) {
      esconderLoadingTela();
      exibirMensagem('cola', '❌ Nenhum número para salvar', 'error');
      return;
    }
    
    // Remover duplicatas - MANTER O ÚLTIMO (edited version)
    const mapa = new Map();
    paraGravar.forEach(c => {
      mapa.set(c.numero, c); // Último sempre sobrescreve
    });
    const unicos = Array.from(mapa.values());
    
    console.log(`🔗 Total após remover duplicatas: ${unicos.length}`);
    unicos.forEach((u, i) => {
      console.log(`   [${i}] ${u.numero} | nome: "${u.nome}" | obs: "${u.obs}"`);
    });
    
    // ✅ NOVO: Filtrar números da blacklist
    console.log(`🚫 Carregando blacklist (tem ${blacklist.length} números bloqueados)...`);
    await carregarBlacklist();
    
    const semBlacklist = unicos.filter(c => {
      const estaBlacklist = estaNaBlacklist(c.numero);
      if (estaBlacklist) {
        console.log(`   ⛔ ${c.numero} está na blacklist - REJEITADO`);
      }
      return !estaBlacklist;
    });
    
    console.log(`🚫 Total após filtrar blacklist: ${semBlacklist.length} (removidos ${unicos.length - semBlacklist.length})`);
    
    if (semBlacklist.length === 0) {
      esconderLoadingTela();
      exibirMensagem('cola', '❌ Todos os números estão na blacklist', 'error');
      return;
    }
    
    // Atualizar com data
    semBlacklist.forEach(c => {
      if (!c.data) {
        c.data = new Date().toISOString();
      }
    });
    
    // Salvar no Drive
    const sucesso = await salvarNoGoogleDrive(semBlacklist);
    
    esconderLoadingTela();
    
    if (!sucesso) {
      exibirMensagem('cola', '❌ Erro ao salvar', 'error');
      console.error('❌ Falha ao salvar no Google Drive');
      return;
    }
    
    // ✅ IMPORTANTE: Atualizar GLOBAIS com os dados salvos
    contatosGlobais = semBlacklist;
    numerosTemporarios = [];
    
    console.log(`✅ ${semBlacklist.length} contatos salvos!`);
    console.log('📋 Globais atualizados:', contatosGlobais);
    exibirMensagem('cola', `✅ ${semBlacklist.length} contatos salvos!`, 'success');
    
    // 📋 Registrar auditoria
    registrarAuditoria(
      'Atualizar',
      'Contatos',
      semBlacklist.length.toString(),
      `Revisão de ${semBlacklist.length} contatos`,
      `Salvos ${semBlacklist.length} números de contatos`,
      JSON.stringify(contatosGlobais.slice(0, 5)),
      JSON.stringify(semBlacklist.slice(0, 5))
    );
    
    // Limpar campos da aba Cola
    document.getElementById('textareaNumerosRaw').value = '';
    renderizarTabelaNumerosProcessados();
    atualizarCampoCopia();
    
    // Re-renderizar todas as abas com dados SALVOS
    const ligacoes = semBlacklist.filter(c => c.tipo !== 'whatsapp');
    console.log(`📞 Renderizando ${ligacoes.length} ligações`);
    renderizarTabelaLigacoes(ligacoes);
    
    const whatsapps = semBlacklist.filter(c => c.tipo === 'whatsapp');
    console.log(`💬 Renderizando ${whatsapps.length} whatsapps`);
    renderizarTabelaWhatsapp(whatsapps);
    
    console.log(`📄 Renderizando JSON`);
    renderizarJSON();
    
  } catch (erro) {
    console.error('❌ Erro:', erro);
    exibirMensagem('cola', '❌ Erro: ' + erro.message, 'error');
    esconderLoadingTela();
  }
}

// ============================================
// CARREGAR DO GOOGLE DRIVE
// ============================================
async function carregarDoGoogleDrive() {
  try {
    const deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      console.warn('❌ Sem deviceId');
      contatosGlobais = [];
      return;
    }
    
    const url = `${CONFIG.API_URL}?acao=buscar&arquivo=${ARQUIVO_CONTATOS}&deviceId=${deviceId}&t=${Date.now()}`;
    console.log('📥 Carregando:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      contatosGlobais = [];
      return;
    }
    
    let dados = await response.json();
    console.log('📦 Recebido:', dados);
    
    if (typeof dados === 'string') {
      dados = JSON.parse(dados);
    }
    
    contatosGlobais = Array.isArray(dados) ? dados : [];
    console.log(`✅ Carregou ${contatosGlobais.length} contatos`);
    
  } catch (erro) {
    console.error('❌ Erro ao carregar:', erro);
    contatosGlobais = [];
  }
}

// ============================================
// CARREGAR BLACKLIST DO GOOGLE DRIVE
// ============================================
async function carregarBlacklist() {
  try {
    const deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      console.warn('❌ Sem deviceId para blacklist');
      blacklist = [];
      return;
    }
    
    const url = `${CONFIG.API_URL}?acao=buscar&arquivo=${ARQUIVO_BLACKLIST}&deviceId=${deviceId}&t=${Date.now()}`;
    console.log('📥 Carregando blacklist:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log('⚠️ Arquivo blacklist não existe ainda');
      blacklist = [];
      return;
    }
    
    let dados = await response.json();
    console.log('📦 Blacklist recebida:', dados);
    
    if (typeof dados === 'string') {
      dados = JSON.parse(dados);
    }
    
    blacklist = Array.isArray(dados) ? dados : [];
    console.log(`✅ Carregou ${blacklist.length} números na blacklist`);
    
  } catch (erro) {
    console.error('❌ Erro ao carregar blacklist:', erro);
    blacklist = [];
  }
}

// ============================================
// SALVAR NO GOOGLE DRIVE
// ============================================
async function salvarNoGoogleDrive(contatos) {
  try {
    const deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      console.error('❌ Sem deviceId');
      return false;
    }
    
    const dadosJson = JSON.stringify(contatos);
    
    console.log('📤 Salvando no Drive:', {
      acao: 'salvar',
      arquivo: ARQUIVO_CONTATOS,
      contatosCount: contatos.length,
      primeiros3: contatos.slice(0, 3)
    });
    
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'acao': 'salvar',
        'arquivo': ARQUIVO_CONTATOS,
        'dados': dadosJson,
        'deviceId': deviceId
      })
    });
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}`);
      return false;
    }
    
    const resultado = await response.json();
    console.log('📤 Resposta do Drive:', resultado);
    
    const foiSucesso = resultado.success === true || 
                       resultado.success === 'true' ||
                       (resultado.mensagem && resultado.mensagem.includes('sucesso'));
    
    if (!foiSucesso) {
      console.error('❌ Salvar falhou:', resultado);
      return false;
    }
    
    console.log(`✅ ${contatos.length} contatos salvos no Drive!`);
    return true;
    
  } catch (erro) {
    console.error('❌ Erro ao salvar:', erro);
    return false;
  }
}

// ============================================
// SALVAR BLACKLIST NO GOOGLE DRIVE
// ============================================
async function salvarBlacklist() {
  try {
    const deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      console.error('❌ Sem deviceId');
      return false;
    }
    
    const dadosJson = JSON.stringify(blacklist);
    
    console.log('📤 Salvando blacklist no Drive:', {
      acao: 'salvar',
      arquivo: ARQUIVO_BLACKLIST,
      numerosCount: blacklist.length
    });
    
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'acao': 'salvar',
        'arquivo': ARQUIVO_BLACKLIST,
        'dados': dadosJson,
        'deviceId': deviceId
      })
    });
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}`);
      return false;
    }
    
    const resultado = await response.json();
    console.log('📤 Resposta blacklist:', resultado);
    
    const foiSucesso = resultado.success === true || 
                       resultado.success === 'true' ||
                       (resultado.mensagem && resultado.mensagem.includes('sucesso'));
    
    if (!foiSucesso) {
      console.error('❌ Salvar blacklist falhou:', resultado);
      return false;
    }
    
    console.log(`✅ ${blacklist.length} números na blacklist salvos no Drive!`);
    
    // 📋 Registrar auditoria
    registrarAuditoria(
      'Atualizar',
      'Blacklist',
      blacklist.length.toString(),
      `Blacklist de números bloqueados`,
      `Salvos ${blacklist.length} números na blacklist`,
      JSON.stringify(blacklist.slice(0, 5)),
      JSON.stringify(blacklist.slice(0, 5))
    );
    
    return true;
    
  } catch (erro) {
    console.error('❌ Erro ao salvar blacklist:', erro);
    return false;
  }
}

// ============================================
// GERAR LIGAÇÕES
// ============================================
async function gerarLigacoes(botao) {
  try {
    mostrarLoadingTela();
    
    console.log(`\n🔴 GERAR LIGAÇÕES 🔴`);
    console.log(`📝 Temporários antes: `, numerosTemporarios);
    console.log(`📊 Temporários count: ${numerosTemporarios.length}`);
    
    // Garantir que tem dados do Drive
    await carregarDoGoogleDrive();
    
    console.log(`� JSON count: ${contatosGlobais.length}`);
    
    // Combinar temporários + JSON (filtrando duplicatas)
    const todos = [...numerosTemporarios, ...contatosGlobais];
    console.log(`🔀 Todos combinados: ${todos.length}`);
    
    // Remover duplicatas
    const mapa = new Map();
    todos.forEach(c => {
      mapa.set(c.numero, c);
    });
    const unicos = Array.from(mapa.values());
    
    console.log(`🔗 Únicos após remover duplicatas: ${unicos.length}`);
    console.log(`✅ Contatos finais: `, unicos);
    
    esconderLoadingTela();
    
    if (unicos.length === 0) {
      console.warn('⚠️ Nenhum contato encontrado');
      exibirMensagem('ligacao', 'Nenhum contato', 'info');
      document.getElementById('tabelaLigacoes').innerHTML = `<tr><td colspan="6" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
      return;
    }
    
    exibirMensagem('ligacao', `✅ ${unicos.length} contatos carregados`, 'success');
    renderizarTabelaLigacoes(unicos);
    
    // Mostrar a aba automaticamente
    document.getElementById('aba-ligacao').classList.add('active');
    console.log(`✅ Aba ligação ativada`);
    
  } catch (erro) {
    console.error('❌ Erro:', erro);
    exibirMensagem('ligacao', 'Erro ao carregar', 'error');
    esconderLoadingTela();
  }
}

// ============================================
// GERAR DO JSON (SÓ LIGAÇÕES)
// ============================================
async function gerarLigacoesJSON(botao) {
  try {
    mostrarLoadingTela();
    
    await carregarDoGoogleDrive();
    
    // Filtrar só os que NÃO são WhatsApp
    const soLigacoes = contatosGlobais.filter(c => c.tipo !== 'whatsapp');
    
    esconderLoadingTela();
    
    if (soLigacoes.length === 0) {
      exibirMensagem('ligacao', 'Nenhum contato do tipo Ligação no JSON', 'info');
      document.getElementById('tabelaLigacoes').innerHTML = `<tr><td colspan="6" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
      return;
    }
    
    exibirMensagem('ligacao', `✅ ${soLigacoes.length} ligações do JSON`, 'success');
    renderizarTabelaLigacoes(soLigacoes);
    
    // Mostrar a aba automaticamente
    document.getElementById('aba-ligacao').classList.add('active');
    console.log(`✅ Aba ligação ativada`);
    
  } catch (erro) {
    console.error('Erro:', erro);
    exibirMensagem('ligacao', 'Erro ao carregar', 'error');
    esconderLoadingTela();
  }
}

// ============================================
// RENDERIZAR TABELA LIGAÇÕES
// ============================================
// RENDERIZAR TABELA LIGAÇÕES
// ============================================
function renderizarTabelaLigacoes(contatos) {
  console.log(`\n🎨 RENDERIZAR LIGAÇÕES`);
  contatos = Array.isArray(contatos) ? contatos.filter(c => c && c.numero && !estaNaBlacklist(c.numero)) : [];
  console.log(`📋 Contatos recebidos: ${contatos.length}`);
  console.log(`📋 Contatos: `, contatos);
  
  const tbody = document.getElementById('tabelaLigacoes');
  
  if (!tbody) {
    console.error('❌ Element tabelaLigacoes não encontrado!');
    return;
  }
  
  if (contatos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
    atualizarCheckboxTudoWhatsapp();
    return;
  }
  
  const html = contatos.map((item, idx) => {
    console.log(`  ${idx + 1}. ${item.numero} - ${item.nome || 'sem nome'}`);
    return `
    <tr>
      <td class="numeracao">${idx + 1}</td>
      <td class="numero-celula"><strong>${item.numero}</strong></td>
      <td><input type="text" value="${item.nome || ''}" placeholder="Nome" onchange="atualizarContato('${item.numero}', 'nome', this.value)" style="width: 100%; padding: 6px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.2); border-radius: 6px; color: #e5f3ee; font-size: 12px;"></td>
      <td><input type="text" value="${item.obs || ''}" placeholder="Obs" onchange="atualizarContato('${item.numero}', 'obs', this.value)" style="width: 100%; padding: 6px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.2); border-radius: 6px; color: #e5f3ee; font-size: 12px;"></td>
      <td style="text-align: center;">
        <input type="checkbox" ${item.tipo === 'whatsapp' ? 'checked' : ''} onchange="marcarWhatsapp('${item.numero}', this.checked)" style="width: 18px; height: 18px; cursor: pointer;">
      </td>
      <td class="acoes-celula">
        <button class="btn-whatsapp" onclick="fazerChamada('${item.numero}')">📞 Ligar</button>
        <button class="btn-agendar" onclick="abrirAgendamento('${item.numero}', '${item.nome || ''}', '${item.obs || ''}')">📅 Agendar</button>
        <button class="btn-delete" onclick="apagarDoJSON('${item.numero}')">🗑️ Deletar</button>
      </td>
    </tr>
  `;
  }).join('');
  
  tbody.innerHTML = html;
  atualizarCheckboxTudoWhatsapp();
  console.log(`✅ Tabela renderizada com ${contatos.length} linhas`);
}

function atualizarContato(numero, campo, valor) {
  console.log(`✏️ Atualizando ${numero} - ${campo}: "${valor}"`);
  
  // Atualizar em temporários
  const tempIdx = numerosTemporarios.findIndex(n => n.numero === numero);
  if (tempIdx !== -1) {
    numerosTemporarios[tempIdx][campo] = valor;
    console.log(`✅ Temporário [${tempIdx}]: ${campo} = "${valor}"`);
    console.log('   Estado temp:', numerosTemporarios[tempIdx]);
  } else {
    console.log(`⚠️ Número ${numero} NÃO encontrado em temporários`);
  }
  
  // Atualizar em globais
  const globIdx = contatosGlobais.findIndex(n => n.numero === numero);
  if (globIdx !== -1) {
    contatosGlobais[globIdx][campo] = valor;
    console.log(`✅ Global [${globIdx}]: ${campo} = "${valor}"`);
    console.log('   Estado global:', contatosGlobais[globIdx]);
  } else {
    console.log(`⚠️ Número ${numero} NÃO encontrado em globais`);
  }
}

async function marcarWhatsapp(numero, marcado) {
  console.log(`📱 Marcando ${numero} como ${marcado ? 'WhatsApp' : 'Ligação'}`);
  
  const novoTipo = marcado ? 'whatsapp' : 'ligacao';
  let encontrou = false;

  // Atualizar em temporários (números novos processados)
  numerosTemporarios.forEach(contato => {
    if (mesmoNumero(contato.numero, numero)) {
      contato.tipo = novoTipo;
      encontrou = true;
    }
  });
  
  // Atualizar em globais (contatos do Drive)
  contatosGlobais.forEach(contato => {
    if (mesmoNumero(contato.numero, numero)) {
      contato.tipo = novoTipo;
      encontrou = true;
    }
  });

  if (!encontrou) {
    console.warn(`⚠️ Número ${numero} não encontrado para marcar`);
    exibirMensagem('ligacao', '❌ Número não encontrado para marcar', 'error');
    return;
  }
  
  atualizarTodasAsAbas();
  
  // Salvar automaticamente no Drive com globais + temporários.
  // Antes salvava só contatosGlobais, por isso contato novo podia não ir para o JSON.
  console.log('💾 Salvando marcação no Drive...');
  const contatosParaSalvar = contatosCombinadosUnicos();
  const sucesso = await salvarNoGoogleDrive(contatosParaSalvar);

  if (sucesso) {
    contatosGlobais = contatosParaSalvar;
    numerosTemporarios = [];
    atualizarTodasAsAbas();

    console.log('✅ Marcação salva com sucesso!');
    registrarAuditoria(
      'Atualizar',
      'Contato',
      numero,
      numero,
      `Marcado como ${marcado ? 'WhatsApp' : 'Ligação'}`
    );

    exibirMensagem(marcado ? 'ligacao' : 'whatsapp', marcado ? '✅ Número enviado para a aba WhatsApp!' : '✅ Número voltou para Ligações!', 'success');
  } else {
    console.error('❌ Erro ao salvar marcação');
    exibirMensagem('ligacao', '❌ Erro ao salvar marcação', 'error');
  }
}

async function marcarTodosWhatsapp(marcado) {
  if (!marcado) {
    atualizarCheckboxTudoWhatsapp();
    return;
  }

  const contatosDaLigacao = contatosParaAba('ligacao');
  if (contatosDaLigacao.length === 0) {
    exibirMensagem('ligacao', '⚠️ Nenhum contato para marcar', 'info');
    atualizarCheckboxTudoWhatsapp();
    return;
  }

  if (!confirm(`Marcar ${contatosDaLigacao.length} contato(s) como WhatsApp e mover todos para a aba WhatsApp?`)) {
    atualizarCheckboxTudoWhatsapp();
    return;
  }

  try {
    mostrarLoadingTela();

    const chavesParaMover = new Set(contatosDaLigacao.map(c => chaveNumero(c.numero)));

    numerosTemporarios.forEach(c => {
      if (chavesParaMover.has(chaveNumero(c.numero))) {
        c.tipo = 'whatsapp';
      }
    });

    contatosGlobais.forEach(c => {
      if (chavesParaMover.has(chaveNumero(c.numero))) {
        c.tipo = 'whatsapp';
      }
    });

    const contatosParaSalvar = contatosCombinadosUnicos();
    const sucesso = await salvarNoGoogleDrive(contatosParaSalvar);

    esconderLoadingTela();

    if (!sucesso) {
      exibirMensagem('ligacao', '❌ Erro ao salvar todos como WhatsApp', 'error');
      atualizarCheckboxTudoWhatsapp();
      return;
    }

    contatosGlobais = contatosParaSalvar;
    numerosTemporarios = [];
    atualizarTodasAsAbas();

    registrarAuditoria(
      'Atualizar',
      'Contatos',
      contatosDaLigacao.length.toString(),
      'Marcar todos para WhatsApp',
      `${contatosDaLigacao.length} contatos movidos para WhatsApp`
    );

    exibirMensagem('ligacao', `✅ ${contatosDaLigacao.length} contato(s) movido(s) para a aba WhatsApp!`, 'success');
    exibirMensagem('whatsapp', `✅ ${contatosDaLigacao.length} contato(s) recebido(s) da aba Ligações!`, 'success');
  } catch (erro) {
    console.error('❌ Erro ao marcar todos:', erro);
    esconderLoadingTela();
    exibirMensagem('ligacao', '❌ Erro: ' + erro.message, 'error');
    atualizarCheckboxTudoWhatsapp();
  }
}

// ============================================
// GERAR WHATSAPP
// ============================================
async function buscarJSONWhatsapp(botao) {
  try {
    mostrarLoadingTela();
    
    console.log('📥 BUSCAR JSON (WHATSAPP)');
    
    await carregarDoGoogleDrive();
    
    // Filtrar só os marcados como WhatsApp
    const soWhatsapp = contatosGlobais.filter(c => c.tipo === 'whatsapp' && !estaNaBlacklist(c.numero));
    
    console.log(`📊 Encontrados ${soWhatsapp.length} contatos marcados como WhatsApp`);
    
    esconderLoadingTela();
    
    if (soWhatsapp.length === 0) {
      exibirMensagem('whatsapp', '⚠️ Nenhum contato marcado para WhatsApp no JSON', 'info');
      document.getElementById('tabelaWhatsapp').innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
      return;
    }
    
    exibirMensagem('whatsapp', `✅ ${soWhatsapp.length} contatos para WhatsApp`, 'success');
    renderizarTabelaWhatsapp(soWhatsapp);
    
  } catch (erro) {
    console.error('❌ Erro:', erro);
    exibirMensagem('whatsapp', '❌ Erro ao carregar', 'error');
    esconderLoadingTela();
  }
}

// ============================================
// GERAR JSON TODOS (SEM FILTRO)
// ============================================
async function gerarJSONTodos(botao) {
  try {
    mostrarLoadingTela();
    
    console.log('📄 GERAR JSON (TODOS)');
    
    await carregarDoGoogleDrive();
    
    // TODOS os contatos do JSON (sem filtro)
    const todosDoJSON = contatosGlobais.filter(c => !estaNaBlacklist(c.numero));
    
    console.log(`📊 Total no JSON: ${todosDoJSON.length} contatos`);
    
    esconderLoadingTela();
    
    if (todosDoJSON.length === 0) {
      exibirMensagem('whatsapp', '⚠️ Nenhum contato no JSON', 'info');
      document.getElementById('tabelaWhatsapp').innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
      return;
    }
    
    exibirMensagem('whatsapp', `✅ ${todosDoJSON.length} contatos carregados`, 'success');
    renderizarTabelaWhatsapp(todosDoJSON);
    
  } catch (erro) {
    console.error('❌ Erro:', erro);
    exibirMensagem('whatsapp', '❌ Erro ao carregar', 'error');
    esconderLoadingTela();
  }
}

// ============================================
// GERAR WHATSAPP (antigo - mantém para compatibilidade)
// ============================================
async function gerarWhatsapp(botao) {
  // Compatibilidade com chamadas antigas
  buscarJSONWhatsapp(botao);
}

// ============================================
// RENDERIZAR TABELA WHATSAPP
// ============================================
function renderizarTabelaWhatsapp(contatos) {
  const tbody = document.getElementById('tabelaWhatsapp');
  contatos = Array.isArray(contatos) ? contatos.filter(c => c && c.numero && !estaNaBlacklist(c.numero)) : [];
  
  if (contatos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
    return;
  }
  
  tbody.innerHTML = contatos.map((item, idx) => `
    <tr>
      <td class="numeracao">${idx + 1}</td>
      <td class="numero-celula"><strong>${item.numero}</strong></td>
      <td><input type="text" value="${item.nome || ''}" placeholder="Nome" onchange="atualizarContato('${item.numero}', 'nome', this.value)" style="width: 100%; padding: 6px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.2); border-radius: 6px; color: #e5f3ee; font-size: 12px;"></td>
      <td><input type="text" value="${item.obs || ''}" placeholder="Obs" onchange="atualizarContato('${item.numero}', 'obs', this.value)" style="width: 100%; padding: 6px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.2); border-radius: 6px; color: #e5f3ee; font-size: 12px;"></td>
      <td class="acoes-celula" style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button class="btn-whatsapp" onclick="abrirWhatsapp('${item.numero}')">💬 Enviar</button>
        <a href="https://wa.me/55${item.numero.replace(/\D/g, '')}" target="_blank" style="padding: 6px 12px; border-radius: 8px; text-decoration: none; background: linear-gradient(145deg, rgba(34,177,76,.3), rgba(34,177,76,.15)); color: #22b14c; border: 1px solid rgba(34,177,76,.3); font-size: 12px; display: inline-block;">🔗 Link</a>
        <button class="btn-agendar" onclick="abrirAgendamento('${item.numero}', '${item.nome || ''}', '${item.obs || ''}')">📅 Agendar</button>
        <button class="btn-delete" onclick="apagarDoJSON('${item.numero}')">🗑️ Deletar</button>
      </td>
    </tr>
  `).join('');
}

// ============================================
// GERAR JSON (TODOS)
// ============================================
async function gerarJSON(botao) {
  try {
    mostrarLoadingTela();
    
    await carregarDoGoogleDrive();
    
    esconderLoadingTela();
    
    if (contatosGlobais.length === 0) {
      exibirMensagem('json', 'Nenhum contato no JSON ainda', 'info');
      document.getElementById('tabelaJSON').innerHTML = `<tr><td colspan="7" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
      return;
    }
    
    exibirMensagem('json', `✅ ${contatosGlobais.length} contatos carregados`, 'success');
    renderizarTabelaJSON(contatosGlobais);
    
  } catch (erro) {
    console.error('Erro:', erro);
    exibirMensagem('json', 'Erro ao carregar', 'error');
    esconderLoadingTela();
  }
}

// ============================================
// GERAR JSON PARA LIGAR APP (COM 0 NO DDD)
// ============================================
async function gerarJSONLigarApp(botao) {
  try {
    mostrarLoadingTela();
    
    await carregarDoGoogleDrive();
    
    esconderLoadingTela();
    
    if (contatosGlobais.length === 0) {
      exibirMensagem('json', 'Nenhum contato no JSON ainda', 'info');
      return;
    }
    
    // ✅ Formatar números para Ligar App (com 0 no DDD)
    const numerosFormatados = contatosGlobais.map(contato => {
      // Limpar número (remover tudo exceto dígitos)
      let num = contato.numero.replace(/\D/g, '');
      
      // Se tem 11 dígitos (ddd + 9 dígitos), já está certo
      if (num.length === 11) {
        // Adiciona 0 no início: 11 dígitos → 032988979577
        return '0' + num;
      }
      
      // Se tem 10 dígitos (ddd + 8 dígitos), adicionar 0 no início
      if (num.length === 10) {
        return '0' + num;
      }
      
      // Se tem 13 dígitos (+55 + ddd + 9 dígitos), remover +55 e adicionar 0 no início
      if (num.length === 13) {
        return '0' + num.substring(2);
      }
      
      return num;
    });
    
    // Criar conteúdo em formato texto legível
    const conteudoTexto = numerosFormatados.join('\n');
    
    // Exibir no console
    console.log('📱 Números para Ligar App:');
    numerosFormatados.forEach(num => console.log(num));
    console.log(`✅ Total: ${numerosFormatados.length} números`);
    
    // ✅ NOVO: Exibir os números no textarea da página
    const secaoNumerosLigarApp = document.getElementById('secaoNumerosLigarApp');
    const textareaNumerosLigarApp = document.getElementById('textareaNumerosLigarApp');
    
    textareaNumerosLigarApp.value = conteudoTexto;
    secaoNumerosLigarApp.style.display = 'block';
    
    // ✅ Copiar automaticamente para clipboard
    await navigator.clipboard.writeText(conteudoTexto);
    exibirMensagem('json', `✅ ${numerosFormatados.length} números copiados para clipboard!`, 'success');
    
  } catch (erro) {
    console.error('Erro:', erro);
    exibirMensagem('json', 'Erro ao gerar números para Ligar App', 'error');
    esconderLoadingTela();
  }
}

// ============================================
// GERAR PARA LIGAR (LIGAÇÕES)
// ============================================
async function gerarParaLigar(botao) {
  try {
    mostrarLoadingTela();
    
    console.log('📱 GERAR PARA LIGAR (LIGAÇÕES)');
    console.log(`📝 Temporários: ${numerosTemporarios.length}`);
    console.log(`📁 Globais: ${contatosGlobais.length}`);
    
    // Combinar temporários + globais (filtrando APENAS Ligações)
    const todosCombinados = [...numerosTemporarios, ...contatosGlobais];
    
    // Filtrar apenas ligações (não WhatsApp)
    const ligacoes = todosCombinados.filter(c => c.tipo !== 'whatsapp');
    
    // Remover duplicatas
    const mapa = new Map();
    ligacoes.forEach(c => {
      mapa.set(c.numero, c);
    });
    const unicos = Array.from(mapa.values());
    
    console.log(`📊 Total de ligações após filtrar: ${unicos.length}`);
    
    esconderLoadingTela();
    
    if (unicos.length === 0) {
      exibirMensagem('ligacao', '⚠️ Nenhuma ligação para gerar', 'info');
      return;
    }
    
    // ✅ Formatar números para Ligar (com 0 no DDD)
    const numerosFormatados = unicos.map(contato => {
      // Limpar número (remover tudo exceto dígitos)
      let num = contato.numero.replace(/\D/g, '');
      
      // Se tem 11 dígitos (0 + ddd + 9 dígitos), já está certo
      if (num.length === 11 && num.startsWith('0')) {
        return num;
      }
      
      // Se tem 10 dígitos (0 + ddd + 8 dígitos), adicionar 9
      if (num.length === 10 && num.startsWith('0')) {
        return num.substring(0, 3) + '9' + num.substring(3);
      }
      
      // Se não começa com 0, adiciona
      if (!num.startsWith('0')) {
        num = '0' + num;
      }
      
      return num;
    });
    
    // Criar conteúdo em formato texto legível
    const conteudoTexto = numerosFormatados.join('\n');
    
    console.log('📱 Números para Ligar:');
    numerosFormatados.forEach(num => console.log(num));
    console.log(`✅ Total: ${numerosFormatados.length} números`);
    
    // ✅ Exibir os números no textarea da página
    const secaoNumerosLigarLigacao = document.getElementById('secaoNumerosLigarLigacao');
    const textareaNumerosLigarLigacao = document.getElementById('textareaNumerosLigarLigacao');
    
    textareaNumerosLigarLigacao.value = conteudoTexto;
    secaoNumerosLigarLigacao.style.display = 'block';
    
    // ✅ Copiar automaticamente para clipboard
    await navigator.clipboard.writeText(conteudoTexto);
    exibirMensagem('ligacao', `✅ ${numerosFormatados.length} números copiados para clipboard!`, 'success');
    
  } catch (erro) {
    console.error('Erro:', erro);
    exibirMensagem('ligacao', 'Erro ao gerar números para ligar', 'error');
    esconderLoadingTela();
  }
}

// ============================================
// COPIAR NÚMEROS LIGAR (LIGAÇÕES)
// ============================================
async function copiarNumerosLigarLigacao(botao) {
  try {
    const textarea = document.getElementById('textareaNumerosLigarLigacao');
    const texto = textarea.value;
    
    if (!texto.trim()) {
      exibirMensagem('ligacao', 'Nenhum número para copiar', 'info');
      return;
    }
    
    await navigator.clipboard.writeText(texto);
    exibirMensagem('ligacao', '✅ Números copiados para clipboard!', 'success');
  } catch (erro) {
    console.error('Erro ao copiar:', erro);
    exibirMensagem('ligacao', 'Erro ao copiar para clipboard', 'error');
  }
}

// ============================================
// LIMPAR NÚMEROS LIGAR (LIGAÇÕES)
// ============================================
function limparNumerosLigarLigacao(botao) {
  const secaoNumerosLigarLigacao = document.getElementById('secaoNumerosLigarLigacao');
  const textareaNumerosLigarLigacao = document.getElementById('textareaNumerosLigarLigacao');
  
  textareaNumerosLigarLigacao.value = '';
  secaoNumerosLigarLigacao.style.display = 'none';
  exibirMensagem('ligacao', '🗑️ Números limpos', 'info');
}

// ============================================
// COPIAR NÚMEROS LIGAR APP
// ============================================
async function copiarNumerosLigarApp(botao) {
  try {
    const textarea = document.getElementById('textareaNumerosLigarApp');
    const texto = textarea.value;
    
    if (!texto.trim()) {
      exibirMensagem('json', 'Nenhum número para copiar', 'info');
      return;
    }
    
    await navigator.clipboard.writeText(texto);
    exibirMensagem('json', '✅ Números copiados para clipboard!', 'success');
  } catch (erro) {
    console.error('Erro ao copiar:', erro);
    exibirMensagem('json', 'Erro ao copiar para clipboard', 'error');
  }
}

// ============================================
// LIMPAR NÚMEROS LIGAR APP
// ============================================
function limparNumerosLigarApp(botao) {
  const secaoNumerosLigarApp = document.getElementById('secaoNumerosLigarApp');
  const textareaNumerosLigarApp = document.getElementById('textareaNumerosLigarApp');
  
  textareaNumerosLigarApp.value = '';
  secaoNumerosLigarApp.style.display = 'none';
  exibirMensagem('json', '🗑️ Números limpos', 'info');
}

// ============================================
// RENDERIZAR TABELA JSON
// ============================================
function renderizarTabelaJSON(contatos) {
  const tbody = document.getElementById('tabelaJSON');
  
  console.log('🗑️ Renderizando JSON com opção de deletar:', contatos.length);
  
  if (contatos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
    return;
  }
  
  tbody.innerHTML = contatos.map((item, idx) => `
    <tr>
      <td class="numeracao">${idx + 1}</td>
      <td class="numero-celula"><strong>${item.numero}</strong></td>
      <td>${item.nome || '-'}</td>
      <td>${item.obs || '-'}</td>
      <td><span style="color: ${item.tipo === 'whatsapp' ? '#22b14c' : '#4285f4'}; font-weight: 600;">${item.tipo === 'whatsapp' ? '💬 WA' : '📞 LG'}</span></td>
      <td><span style="color: #1fa37a;">✓</span></td>
      <td class="acoes-celula">
        <button class="btn-agendar" onclick="abrirAgendamento('${item.numero}', '${item.nome || ''}', '${item.obs || ''}')">📅 Agendar</button>
        <button class="btn-delete" onclick="apagarDoJSON('${item.numero}')">🗑️ Apagar</button>
      </td>
    </tr>
  `).join('');
  
  console.log('✅ JSON renderizado com', contatos.length, 'contatos');
}

// ============================================
// RENDERIZAR JSON (COMBINA TEMPORÁRIOS + GLOBAIS)
// ============================================
function renderizarJSON() {
  console.log('📄 Renderizando JSON (combinando temporários + globais)');
  console.log(`📝 Temporários: ${numerosTemporarios.length}`, numerosTemporarios);
  console.log(`📁 Globais: ${contatosGlobais.length}`, contatosGlobais);
  
  const unicos = contatosCombinadosUnicos();
  
  console.log(`📊 Total combinado: ${unicos.length} contatos`);
  console.log('📋 Dados do JSON:', unicos);
  
  renderizarTabelaJSON(unicos);
}

// ============================================
// APAGAR DO JSON
// ============================================
async function apagarDoJSON(numero) {
  console.log('🗑️ APAGAR DO JSON: ' + numero);
  
  if (!confirm('Apagar este contato?\n(Ele será enviado para a blacklist e não voltará em novas importações.)')) {
    console.log('Cancelado');
    return;
  }
  
  try {
    mostrarLoadingTela();
    const abaOrigem = abaAtivaAtual();
    const temporariosAntes = [...numerosTemporarios];
    
    console.log('📊 Globais antes: ' + contatosGlobais.length);
    console.log('📝 Temporários antes: ' + numerosTemporarios.length);
    
    // Carregar dados atuais do Drive para não sobrescrever contatos já salvos.
    await carregarDoGoogleDrive();
    await carregarBlacklist();

    // Mantém os temporários que estavam na tela antes do reload do JSON.
    numerosTemporarios = temporariosAntes;
    
    console.log('📥 Recarregado do Drive: ' + contatosGlobais.length + ' globais, ' + blacklist.length + ' blacklist');
    
    // Encontrar tanto no JSON quanto nos temporários.
    const contatoParaApagar = [...numerosTemporarios, ...contatosGlobais].find(c => c && c.numero && mesmoNumero(c.numero, numero));
    const numeroExato = contatoParaApagar ? contatoParaApagar.numero : numero;
    
    console.log('✅ Número para apagar/bloquear:', numeroExato, contatoParaApagar || '(não estava nas listas, vou bloquear mesmo assim)');
    
    // Remover do JSON e dos temporários.
    contatosGlobais = contatosGlobais.filter(c => !mesmoNumero(c.numero, numeroExato));
    numerosTemporarios = numerosTemporarios.filter(c => !mesmoNumero(c.numero, numeroExato));
    console.log('🗑️ Globais agora: ' + contatosGlobais.length);
    console.log('🗑️ Temporários agora: ' + numerosTemporarios.length);
    
    // Adicionar à blacklist mesmo se o contato ainda era temporário.
    const entrouNaBlacklist = adicionarNumeroNaBlacklist(numeroExato);
    console.log(entrouNaBlacklist
      ? '⛔ Numero ' + numeroExato + ' ADICIONADO a blacklist'
      : '⛔ Numero ' + numeroExato + ' JA estava na blacklist');
    
    // Salvar ambos.
    const sucessoJSON = await salvarNoGoogleDrive(contatosGlobais);
    const sucessoBlacklist = await salvarBlacklist();
    
    console.log('💾 Salvou JSON: ' + sucessoJSON + ', Salvou Blacklist: ' + sucessoBlacklist);
    
    esconderLoadingTela();
    
    if (sucessoJSON && sucessoBlacklist) {
      console.log('✅ Numero ' + numeroExato + ' APAGADO e BLOQUEADO com sucesso!');
      exibirMensagem(abaOrigem, '✅ Número ' + numeroExato + ' apagado e enviado para a blacklist!', 'success');
      
      registrarAuditoria(
        'Deletar',
        'Contato',
        numeroExato,
        numeroExato,
        `Contato deletado e adicionado à blacklist`
      );
      
      atualizarTodasAsAbas();
      console.log('✅ TUDO ATUALIZADO!');
    } else {
      console.log('❌ Falha ao salvar apos apagar');
      exibirMensagem(abaOrigem, '❌ Erro ao apagar', 'error');
    }
  } catch (erro) {
    console.error('❌ Erro:', erro);
    exibirMensagem(abaAtivaAtual(), '❌ Erro: ' + erro.message, 'error');
    esconderLoadingTela();
  }
}

function fazerChamada(numero) {
  // Fazer chamada telefônica
  const numLimpo = numero.replace(/\D/g, '');
  window.location.href = `tel:+55${numLimpo}`;
}

function abrirWhatsapp(numero) {
  const numLimpo = numero.replace(/\D/g, '');
  const url = `https://wa.me/55${numLimpo}`;
  window.open(url, '_blank');
}

// ============================================
// AUXILIARES
// ============================================
function exibirMensagem(aba, texto, tipo) {
  const elemento = document.getElementById(`mensagem${aba.charAt(0).toUpperCase() + aba.slice(1)}`);
  if (!elemento) return;
  
  if (!tipo || tipo === '') {
    elemento.innerHTML = '';
    elemento.className = 'message';
    return;
  }
  
  elemento.innerHTML = texto;
  elemento.className = `message ${tipo}`;
  
  if (tipo === 'success') {
    setTimeout(() => {
      elemento.className = 'message';
      elemento.innerHTML = '';
    }, 3000);
  }
}

// ============================================
// ABRIR AGENDAMENTO (MODAL LOCAL)
// ============================================
function abrirAgendamento(numero, nome, obs) {
  console.log(`📅 Abrindo agendamento para: ${numero} | Nome: ${nome} | Obs: ${obs}`);
  
  // Preencher os campos do modal
  document.getElementById('agendNumero').value = numero;
  document.getElementById('agendNome').value = nome;
  
  // Pré-preencher data e hora com agora
  const agora = new Date();
  const dataStr = agora.toISOString().split('T')[0]; // YYYY-MM-DD
  const horaStr = String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');
  
  document.getElementById('agendData').value = dataStr;
  document.getElementById('agendHora').value = horaStr;
  document.getElementById('agendIntervalo').value = '3';
  document.getElementById('agendDescricao').value = '';
  
  // Abrir modal
  document.getElementById('modalAgendamento').classList.add('show');
}

// ============================================
// FECHAR MODAL DE AGENDAMENTO
// ============================================
function fecharModalAgendamento() {
  document.getElementById('modalAgendamento').classList.remove('show');
}

// ============================================
// CONFIRMAR AGENDAMENTO
// ============================================
function confirmarAgendamento() {
  const numero = document.getElementById('agendNumero')?.value;
  const nome = document.getElementById('agendNome')?.value;
  const data = document.getElementById('agendData')?.value;
  const hora = document.getElementById('agendHora')?.value;
  const intervalo = document.getElementById('agendIntervalo')?.value;
  const descricao = document.getElementById('agendDescricao')?.value;
  
  if (!numero || !data || !hora || !intervalo) {
    exibirMensagem('cola', '❌ Preencha os campos obrigatórios: Número, Data, Hora e Intervalo', 'error');
    return;
  }
  
  console.log(`✅ AGENDAMENTO CONFIRMADO:`);
  console.log(`  📞 Número: ${numero}`);
  console.log(`  👤 Nome: ${nome}`);
  console.log(`  📅 Data: ${data}`);
  console.log(`  🕐 Hora: ${hora}`);
  console.log(`  ⏱️ Intervalo: ${intervalo} minutos`);
  console.log(`  📝 Descrição: ${descricao}`);
  
  (async () => {
    try {
      mostrarLoadingTela();

      // Construir objeto de agendamento (compatível com agendar-ligacoes.html)
      const [ano, mes, dia] = data.split('-');
      const [horas, mins] = hora.split(':');
      const dataHoraInicio = new Date(ano, mes - 1, dia, horas, mins);
      
      console.log('📅 Data construída:', dataHoraInicio.toISOString());

      const agendamento = {
        Numero: numero,
        DataHoraInicio: dataHoraInicio.toISOString(),
        IntervalMinutos: Number(intervalo) || 3,
        Descricao: descricao || `Agendado para ${nome || numero}`,
        DataCriacao: new Date().toISOString(),
        Id: 'lig_' + Date.now()
      };

      console.log('📋 Agendamento construído:', agendamento);

      // Carregar agendamentos existentes, adicionar novo e salvar
      const existentes = await carregarAgendamentos();
      console.log('📥 Agendamentos existentes:', existentes.length);
      
      existentes.push(agendamento);
      console.log('📥 Total após adicionar:', existentes.length);

      const sucesso = await salvarAgendamentos(existentes);

      esconderLoadingTela();

      if (!sucesso) {
        console.error('❌ salvarAgendamentos retornou false');
        exibirMensagem('cola', '❌ Erro ao salvar agendamento', 'error');
        return;
      }

      console.log('✅ Agendamento salvo com sucesso!');
      exibirMensagem('cola', `✅ Agendamento registrado para ${data} às ${hora}`, 'success');
      fecharModalAgendamento();

      // Registrar auditoria mínima
      if (typeof registrarAuditoria === 'function') {
        registrarAuditoria('Criar', 'Agendamento', numero, `${data} ${hora}`, descricao || `Agendamento de ${numero}`);
      }

      // Manter a página (revisaocontatos.html) sem redirecionar
      atualizarTodasAsAbas();

    } catch (erro) {
      console.error('❌ Erro ao confirmar agendamento:', erro);
      console.error('Stack:', erro.stack);
      esconderLoadingTela();
      exibirMensagem('cola', '❌ Erro ao registrar agendamento: ' + erro.message, 'error');
    }
  })();
}

// ============================================
// AGENDAMENTOS - CARREGAR E SALVAR NO DRIVE
// ============================================
async function carregarAgendamentos() {
  try {
    const deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      console.warn('❌ Sem deviceId para agendamentos');
      return [];
    }

    const arquivo = CONFIG.ARQUIVOS.AGENDAMENTOS_LIGACOES || 'agendamentos_ligacoes.json';
    const url = `${CONFIG.API_URL}?acao=buscar&arquivo=${arquivo}&deviceId=${deviceId}&t=${Date.now()}`;
    console.log('📥 Carregando agendamentos:', url);

    const response = await fetch(url);
    if (!response.ok) {
      console.log('⚠️ Arquivo de agendamentos não existe ainda');
      return [];
    }

    let dados = await response.json();
    if (typeof dados === 'string') {
      dados = JSON.parse(dados);
    }

    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    console.error('❌ Erro ao carregar agendamentos:', erro);
    return [];
  }
}

async function salvarAgendamentos(agendamentos) {
  try {
    const deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      console.error('❌ Sem deviceId');
      return false;
    }

    const arquivo = CONFIG.ARQUIVOS.AGENDAMENTOS_LIGACOES || 'agendamentos_ligacoes.json';
    const dadosJson = JSON.stringify(agendamentos);

    console.log('📤 Salvando agendamentos no Drive:', { arquivo, count: agendamentos.length });
    console.log('📤 URL:', CONFIG.API_URL);
    console.log('📤 Dados:', dadosJson);

    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'acao': 'salvar',
        'arquivo': arquivo,
        'dados': dadosJson,
        'deviceId': deviceId
      })
    });

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}`);
      return false;
    }

    let resultado;
    try {
      resultado = await response.json();
    } catch (parseError) {
      console.warn('⚠️ Erro ao fazer parse da resposta JSON:', parseError);
      const texto = await response.text();
      console.log('📤 Resposta texto:', texto);
      // Tentar fazer parse manual
      try {
        resultado = JSON.parse(texto);
      } catch (e2) {
        console.error('❌ Não conseguiu fazer parse da resposta:', texto);
        return false;
      }
    }

    console.log('📤 Resposta salvar agendamentos:', resultado);

    if (!resultado) {
      console.error('❌ Resposta vazia');
      return false;
    }

    const foiSucesso = resultado.success === true || resultado.success === 'true' || resultado.sucesso === true || resultado.sucesso === 'true' || (resultado.mensagem && resultado.mensagem.includes('sucesso'));
    if (!foiSucesso) {
      console.error('❌ Salvar agendamentos falhou:', resultado);
      return false;
    }

    console.log(`✅ ${agendamentos.length} agendamentos salvos no Drive!`);
    return true;
  } catch (erro) {
    console.error('❌ Erro ao salvar agendamentos:', erro);
    console.error('Stack:', erro.stack);
    return false;
  }
}

// Expor função para onclick no HTML
window.apagarDoJSON = apagarDoJSON;
window.marcarTodosWhatsapp = marcarTodosWhatsapp;

console.log('✅ revisao-contatos.js CARREGADO');
