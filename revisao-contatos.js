// ============================================
// REVISÃO DE CONTATOS - V7
// COM MARCAÇÃO DE TIPO (LIGAÇÃO/WHATSAPP)
// ============================================

const ARQUIVO_CONTATOS = 'revisao_contatos.json';
let contatosGlobais = [];
let numerosTemporarios = [];

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
// MUDANÇA DE ABAS
// ============================================
function mudarAba(abaName) {
  document.querySelectorAll('.tab-content').forEach(aba => aba.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(`aba-${abaName}`).classList.add('active');
  if (event && event.target) {
    event.target.classList.add('active');
  }
  
  // Se for para Ligações, mostrar contatos que NÃO são WhatsApp
  if (abaName === 'ligacao') {
    const ligacoes = numerosTemporarios.concat(contatosGlobais).filter((n, idx, arr) => 
      arr.findIndex(x => x.numero === n.numero) === idx && n.tipo !== 'whatsapp'
    );
    renderizarTabelaLigacoes(ligacoes);
  }
  
  // Se for para WhatsApp, mostrar contatos que SÃO WhatsApp
  if (abaName === 'whatsapp') {
    const whatsapps = numerosTemporarios.concat(contatosGlobais).filter((n, idx, arr) => 
      arr.findIndex(x => x.numero === n.numero) === idx && n.tipo === 'whatsapp'
    );
    renderizarTabelaWhatsapp(whatsapps);
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
  
  // Se tem 12 dígitos e NÃO começa com 0, remove 9º dígito
  if (limpo.length === 12 && !limpo.startsWith('0')) {
    limpo = limpo.substring(0, 2) + limpo.substring(3);
  }
  
  // Se não começa com 0, adiciona
  if (!limpo.startsWith('0')) {
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
      mostrarMensagem('cola', '❌ Cole pelo menos um número', 'error');
      return;
    }
    
    mostrarLoadingTela();
    
    const linhas = texto.split(/\n/).map(l => l.trim()).filter(l => l);
    const numerosProcessados = [];
    
    // Carregar do Drive para verificar duplicatas
    await carregarDoGoogleDrive();
    const numerosNoJSON = contatosGlobais.map(c => c.numero);
    
    console.log('🔄 PROCESSANDO NÚMEROS COM NOME E OBS');
    console.log(`📝 Total de linhas para processar: ${linhas.length}`);
    
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
        console.log(`  ⏭️ Duplicata (já no JSON): ${numero}`);
        continue;
      }
      
      if (!numerosProcessados.find(n => n.numero === numero)) {
        numerosProcessados.push({
          numero: numero,
          nome: nome,
          obs: obs,
          tipo: 'ligacao',
          data: new Date().toISOString()
        });
        console.log(`  ✅ ADICIONADO: ${numero} | Nome: "${nome}" | Obs: "${obs}"`);
      }
    }
    
    esconderLoadingTela();
    
    if (numerosProcessados.length === 0) {
      mostrarMensagem('cola', '❌ Nenhum número válido ou novo', 'error');
      return;
    }
    
    numerosTemporarios = numerosProcessados;
    
    console.log(`\n✅ ${numerosProcessados.length} números processados!`);
    mostrarMensagem('cola', `✅ ${numerosProcessados.length} números processados!`, 'success');
    renderizarTabelaNumerosProcessados();
    atualizarCampoCopia();
    
    // Auto-mostrar números em AMBAS as abas (sem redirecionar)
    console.log('🎯 Auto-display: Renderizando abas com números processados');
    
    // Renderizar Ligações (TODOS os números processados)
    if (numerosProcessados.length > 0) {
      renderizarTabelaLigacoes(numerosProcessados);
      console.log(`✅ Ligações: ${numerosProcessados.length} números`);
    }
    
    // Renderizar WhatsApp (TAMBÉM com os números processados - igual a Ligações)
    if (numerosProcessados.length > 0) {
      renderizarTabelaWhatsapp(numerosProcessados);
      console.log(`✅ WhatsApp: ${numerosProcessados.length} números`);
    }
    
    // Renderizar JSON
    renderizarJSON();
    
    // NÃO redirecionar automaticamente - manter na Cola
    console.log('✅ Números prontos para edição (sem redirecionamento automático)');
    
  } catch (erro) {
    console.error('❌ Erro:', erro);
    mostrarMensagem('cola', '❌ Erro: ' + erro.message, 'error');
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
  mostrarMensagem('cola', '', '');
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
      mostrarMensagem('cola', '❌ Nenhum número para copiar', 'error');
      return;
    }
    
    campo.select();
    document.execCommand('copy');
    mostrarMensagem('cola', `✅ ${campo.value.split('\n').length} números copiados!`, 'success');
    
  } catch (err) {
    mostrarMensagem('cola', '❌ Erro ao copiar', 'error');
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
    
    // Combinar temporários + globais (globais já estão com as edições feitas via inputs)
    const todos = [...numerosTemporarios, ...contatosGlobais];
    
    console.log(`📊 Total combinado: ${todos.length} contatos`);
    
    if (todos.length === 0) {
      esconderLoadingTela();
      mostrarMensagem('cola', '❌ Nenhum número para salvar', 'error');
      return;
    }
    
    // Remover duplicatas - MANTER O ÚLTIMO (edited version)
    const mapa = new Map();
    todos.forEach(c => {
      mapa.set(c.numero, c); // Último sempre sobrescreve
    });
    const unicos = Array.from(mapa.values());
    
    console.log(`🔗 Total após remover duplicatas: ${unicos.length}`);
    unicos.forEach((u, i) => {
      console.log(`   [${i}] ${u.numero} | nome: "${u.nome}" | obs: "${u.obs}"`);
    });
    
    // Atualizar com data
    unicos.forEach(c => {
      if (!c.data) {
        c.data = new Date().toISOString();
      }
    });
    
    // Salvar no Drive
    const sucesso = await salvarNoGoogleDrive(unicos);
    
    esconderLoadingTela();
    
    if (!sucesso) {
      mostrarMensagem('cola', '❌ Erro ao salvar', 'error');
      console.error('❌ Falha ao salvar no Google Drive');
      return;
    }
    
    // ✅ IMPORTANTE: Atualizar GLOBAIS com os dados salvos
    contatosGlobais = unicos;
    numerosTemporarios = [];
    
    console.log(`✅ ${unicos.length} contatos salvos!`);
    console.log('📋 Globais atualizados:', contatosGlobais);
    mostrarMensagem('cola', `✅ ${unicos.length} contatos salvos!`, 'success');
    
    // Limpar campos da aba Cola
    document.getElementById('textareaNumerosRaw').value = '';
    renderizarTabelaNumerosProcessados();
    atualizarCampoCopia();
    
    // Re-renderizar todas as abas com dados SALVOS
    const ligacoes = unicos.filter(c => c.tipo !== 'whatsapp');
    console.log(`📞 Renderizando ${ligacoes.length} ligações`);
    renderizarTabelaLigacoes(ligacoes);
    
    const whatsapps = unicos.filter(c => c.tipo === 'whatsapp');
    console.log(`💬 Renderizando ${whatsapps.length} whatsapps`);
    renderizarTabelaWhatsapp(whatsapps);
    
    console.log(`📄 Renderizando JSON`);
    renderizarJSON();
    
  } catch (erro) {
    console.error('❌ Erro:', erro);
    mostrarMensagem('cola', '❌ Erro: ' + erro.message, 'error');
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
      mostrarMensagem('ligacao', 'Nenhum contato', 'info');
      document.getElementById('tabelaLigacoes').innerHTML = `<tr><td colspan="6" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
      return;
    }
    
    mostrarMensagem('ligacao', `✅ ${unicos.length} contatos carregados`, 'success');
    renderizarTabelaLigacoes(unicos);
    
    // Mostrar a aba automaticamente
    document.getElementById('aba-ligacao').classList.add('active');
    console.log(`✅ Aba ligação ativada`);
    
  } catch (erro) {
    console.error('❌ Erro:', erro);
    mostrarMensagem('ligacao', 'Erro ao carregar', 'error');
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
      mostrarMensagem('ligacao', 'Nenhum contato do tipo Ligação no JSON', 'info');
      document.getElementById('tabelaLigacoes').innerHTML = `<tr><td colspan="6" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
      return;
    }
    
    mostrarMensagem('ligacao', `✅ ${soLigacoes.length} ligações do JSON`, 'success');
    renderizarTabelaLigacoes(soLigacoes);
    
    // Mostrar a aba automaticamente
    document.getElementById('aba-ligacao').classList.add('active');
    console.log(`✅ Aba ligação ativada`);
    
  } catch (erro) {
    console.error('Erro:', erro);
    mostrarMensagem('ligacao', 'Erro ao carregar', 'error');
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
  console.log(`📋 Contatos recebidos: ${contatos.length}`);
  console.log(`📋 Contatos: `, contatos);
  
  const tbody = document.getElementById('tabelaLigacoes');
  
  if (!tbody) {
    console.error('❌ Element tabelaLigacoes não encontrado!');
    return;
  }
  
  console.log(`✅ Element tabelaLigacoes encontrado`);
  
  if (contatos.length === 0) {
    console.warn('⚠️ Contatos vazio');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
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
  
  console.log(`📝 HTML gerado, tamanho: ${html.length} caracteres`);
  
  tbody.innerHTML = html;
  console.log(`✅ Tabela renderizada com ${contatos.length} linhas`);
  
  // Verificar se foi realmente renderizado
  const linhas = tbody.querySelectorAll('tr').length;
  console.log(`🔍 Linhas na tabela após renderizar: ${linhas}`);
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
  
  // Atualizar em temporários
  const tempIdx = numerosTemporarios.findIndex(n => n.numero === numero);
  if (tempIdx !== -1) {
    numerosTemporarios[tempIdx].tipo = marcado ? 'whatsapp' : 'ligacao';
    console.log(`✅ Temporário [${tempIdx}] atualizado`);
  }
  
  // Atualizar em globais
  const globIdx = contatosGlobais.findIndex(n => n.numero === numero);
  if (globIdx !== -1) {
    contatosGlobais[globIdx].tipo = marcado ? 'whatsapp' : 'ligacao';
    console.log(`✅ Global [${globIdx}] atualizado`);
  }
  
  console.log(`📱 Marcado como WhatsApp: ${numero} = ${marcado}`);
  
  // Atualizar Ligações (mostrar TODOS exceto os marcados como WhatsApp)
  const ligacoes = numerosTemporarios.concat(contatosGlobais).filter((n, idx, arr) => 
    arr.findIndex(x => x.numero === n.numero) === idx && n.tipo !== 'whatsapp'
  );
  console.log(`📞 Ligações após marcar: ${ligacoes.length}`);
  renderizarTabelaLigacoes(ligacoes);
  
  // Atualizar WhatsApp (mostrar TODOS marcados como WhatsApp)
  const whatsapps = numerosTemporarios.concat(contatosGlobais).filter((n, idx, arr) => 
    arr.findIndex(x => x.numero === n.numero) === idx && n.tipo === 'whatsapp'
  );
  console.log(`💬 WhatsApp após marcar: ${whatsapps.length}`);
  renderizarTabelaWhatsapp(whatsapps);
  
  // Atualizar JSON
  renderizarJSON();
  
  // ✅ NOVO: Salvar automaticamente no Drive
  console.log('💾 Salvando marcação no Drive...');
  const sucesso = await salvarNoGoogleDrive(contatosGlobais);
  if (sucesso) {
    console.log('✅ Marcação salva com sucesso!');
    mostrarMensagem('ligacao', '✅ Marcação salva!', 'success');
  } else {
    console.error('❌ Erro ao salvar marcação');
    mostrarMensagem('ligacao', '❌ Erro ao salvar marcação', 'error');
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
    const soWhatsapp = contatosGlobais.filter(c => c.tipo === 'whatsapp');
    
    console.log(`📊 Encontrados ${soWhatsapp.length} contatos marcados como WhatsApp`);
    
    esconderLoadingTela();
    
    if (soWhatsapp.length === 0) {
      mostrarMensagem('whatsapp', '⚠️ Nenhum contato marcado para WhatsApp no JSON', 'info');
      document.getElementById('tabelaWhatsapp').innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
      return;
    }
    
    mostrarMensagem('whatsapp', `✅ ${soWhatsapp.length} contatos para WhatsApp`, 'success');
    renderizarTabelaWhatsapp(soWhatsapp);
    
  } catch (erro) {
    console.error('❌ Erro:', erro);
    mostrarMensagem('whatsapp', '❌ Erro ao carregar', 'error');
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
    const todosDoJSON = contatosGlobais;
    
    console.log(`📊 Total no JSON: ${todosDoJSON.length} contatos`);
    
    esconderLoadingTela();
    
    if (todosDoJSON.length === 0) {
      mostrarMensagem('whatsapp', '⚠️ Nenhum contato no JSON', 'info');
      document.getElementById('tabelaWhatsapp').innerHTML = `<tr><td colspan="5" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
      return;
    }
    
    mostrarMensagem('whatsapp', `✅ ${todosDoJSON.length} contatos carregados`, 'success');
    renderizarTabelaWhatsapp(todosDoJSON);
    
  } catch (erro) {
    console.error('❌ Erro:', erro);
    mostrarMensagem('whatsapp', '❌ Erro ao carregar', 'error');
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
  
  if (contatos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
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
      mostrarMensagem('json', 'Nenhum contato no JSON ainda', 'info');
      document.getElementById('tabelaJSON').innerHTML = `<tr><td colspan="7" style="text-align: center; color: #8fb9ac;">Vazio</td></tr>`;
      return;
    }
    
    mostrarMensagem('json', `✅ ${contatosGlobais.length} contatos carregados`, 'success');
    renderizarTabelaJSON(contatosGlobais);
    
  } catch (erro) {
    console.error('Erro:', erro);
    mostrarMensagem('json', 'Erro ao carregar', 'error');
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
      mostrarMensagem('json', 'Nenhum contato no JSON ainda', 'info');
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
    mostrarMensagem('json', `✅ ${numerosFormatados.length} números copiados para clipboard!`, 'success');
    
  } catch (erro) {
    console.error('Erro:', erro);
    mostrarMensagem('json', 'Erro ao gerar números para Ligar App', 'error');
    esconderLoadingTela();
  }
}

// ============================================
// COPIAR NÚMEROS LIGAR APP
// ============================================
async function copiarNumerosLigarApp(botao) {
  try {
    const textarea = document.getElementById('textareaNumerosLigarApp');
    const texto = textarea.value;
    
    if (!texto.trim()) {
      mostrarMensagem('json', 'Nenhum número para copiar', 'info');
      return;
    }
    
    await navigator.clipboard.writeText(texto);
    mostrarMensagem('json', '✅ Números copiados para clipboard!', 'success');
  } catch (erro) {
    console.error('Erro ao copiar:', erro);
    mostrarMensagem('json', 'Erro ao copiar para clipboard', 'error');
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
  mostrarMensagem('json', '🗑️ Números limpos', 'info');
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
  
  // Combinar temporários + globais
  const todos = [...numerosTemporarios, ...contatosGlobais];
  
  // Remover duplicatas
  const mapa = new Map();
  todos.forEach(c => {
    mapa.set(c.numero, c);
  });
  const unicos = Array.from(mapa.values());
  
  console.log(`📊 Total combinado: ${unicos.length} contatos`);
  console.log('📋 Dados do JSON:', unicos);
  
  renderizarTabelaJSON(unicos);
}

// ============================================
// APAGAR DO JSON
// ============================================
// APAGAR DO JSON
// ============================================
async function apagarDoJSON(numero) {
  console.log(`🗑️ Tentando apagar: ${numero}`);
  
  if (!confirm('Apagar este contato?')) {
    console.log('❌ Cancelado');
    return;
  }
  
  try {
    mostrarLoadingTela();
    
    console.log(`📁 Globais antes: ${contatosGlobais.length}`, contatosGlobais);
    
    await carregarDoGoogleDrive();
    
    contatosGlobais = contatosGlobais.filter(c => c.numero !== numero);
    
    console.log(`📁 Globais depois: ${contatosGlobais.length}`, contatosGlobais);
    
    const sucesso = await salvarNoGoogleDrive(contatosGlobais);
    
    esconderLoadingTela();
    
    if (sucesso) {
      console.log(`✅ ${numero} apagado com sucesso`);
      mostrarMensagem('json', `✅ ${numero} apagado`, 'success');
      renderizarTabelaJSON(contatosGlobais);
    } else {
      console.log('❌ Falha ao salvar após apagar');
      mostrarMensagem('json', '❌ Erro ao apagar', 'error');
    }
  } catch (erro) {
    console.error('❌ Erro:', erro);
    mostrarMensagem('json', '❌ Erro: ' + erro.message, 'error');
    esconderLoadingTela();
  }
}

// ============================================
// AÇÕES: LIGAR E WHATSAPP
// ============================================
function ligarPara(numero) {
  // Redireciona para WhatsApp ao invés de fazer chamada tel:
  const numLimpo = numero.replace(/\D/g, '');
  const url = `https://wa.me/55${numLimpo}`;
  window.open(url, '_blank');
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
function mostrarMensagem(aba, texto, tipo) {
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
  const numero = document.getElementById('agendNumero').value;
  const nome = document.getElementById('agendNome').value;
  const data = document.getElementById('agendData').value;
  const hora = document.getElementById('agendHora').value;
  const intervalo = document.getElementById('agendIntervalo').value;
  const descricao = document.getElementById('agendDescricao').value;
  
  if (!numero || !data || !hora || !intervalo) {
    alert('❌ Preencha os campos obrigatórios: Número, Data, Hora e Intervalo');
    return;
  }
  
  console.log(`✅ AGENDAMENTO CONFIRMADO:`);
  console.log(`  📞 Número: ${numero}`);
  console.log(`  👤 Nome: ${nome}`);
  console.log(`  📅 Data: ${data}`);
  console.log(`  🕐 Hora: ${hora}`);
  console.log(`  ⏱️ Intervalo: ${intervalo} minutos`);
  console.log(`  📝 Descrição: ${descricao}`);
  
  // Aqui você pode salvar o agendamento em banco de dados ou enviar para API
  mostrarMensagem('cola', `✅ Agendamento registrado para ${data} às ${hora}`, 'success');
  
  fecharModalAgendamento();
}

console.log('✅ revisao-contatos.js CARREGADO');
