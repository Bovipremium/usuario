/**
 * ALERTA ÚNICO DE LIGAÇÕES - SITE WALLYSON
 * Corrigido: adiciona verificarAgendamentos(), envia deviceId e mantém alerta único.
 */

class AlertaLigacaoSistema {
  constructor() {
    this.agendamentos = [];
    this.alertasExibidosNoTela = new Set();
    this.intervaloMonitor = null;
    this.ultimaVerificacao = null;
    this.emVerificacao = false;
  }

  iniciar() {
    console.log('🔔 Iniciando sistema único de alertas de ligações...');

    this.verificarAgendamentos();

    this.intervaloMonitor = setInterval(() => {
      this.verificarAgendamentos();
    }, 60000);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.verificarAgendamentos();
    });

    window.addEventListener('focus', () => this.verificarAgendamentos());
  }

  parar() {
    if (this.intervaloMonitor) {
      clearInterval(this.intervaloMonitor);
      this.intervaloMonitor = null;
      console.log('🔔 Monitoramento de ligações parado');
    }
  }

  obterApiUrl() {
    // config.js declara CONFIG no escopo global lexical, mas nem sempre como window.CONFIG.
    // Por isso testamos primeiro o identificador CONFIG diretamente.
    if (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.API_URL) return CONFIG.API_URL;
    if (window.CONFIG && window.CONFIG.API_URL) return window.CONFIG.API_URL;
    if (typeof API_URL !== 'undefined' && API_URL) return API_URL;
    if (window.API_URL) return window.API_URL;
    return '';
  }

  obterDeviceId() {
    return localStorage.getItem('deviceId') || sessionStorage.getItem('deviceId') || '';
  }

  obterId(agendamento) {
    return String(
      agendamento.Id ||
      agendamento.id ||
      agendamento.ID ||
      `${this.obterNumero(agendamento)}-${this.obterDataBase(agendamento)}`
    );
  }

  obterNumero(agendamento) {
    return agendamento.Numero ||
      agendamento.numero ||
      agendamento.Telefone ||
      agendamento.telefone ||
      agendamento.Contato ||
      agendamento.contato ||
      'Sem número';
  }

  obterDescricao(agendamento) {
    return agendamento.Descricao ||
      agendamento.descricao ||
      agendamento.Observacao ||
      agendamento.observacao ||
      agendamento.Nome ||
      agendamento.nome ||
      'Ligação agendada';
  }

  obterDataBase(agendamento) {
    return agendamento.DataHoraInicio ||
      agendamento.dataHoraInicio ||
      agendamento.DataHora ||
      agendamento.dataHora ||
      agendamento.Data ||
      agendamento.data ||
      null;
  }

  obterDataAlerta(agendamento) {
    const adiado = agendamento.DataHoraProximoAlerta ||
      agendamento.dataHoraProximoAlerta ||
      agendamento.ProximoAlerta ||
      agendamento.proximoAlerta ||
      null;

    const base = adiado || this.obterDataBase(agendamento);
    if (!base) return null;

    const data = new Date(base);
    if (Number.isNaN(data.getTime())) return null;
    return data;
  }

  normalizarLista(dados) {
    if (Array.isArray(dados)) return dados;
    if (dados && Array.isArray(dados.dados)) return dados.dados;
    if (dados && Array.isArray(dados.agendamentos)) return dados.agendamentos;
    return [];
  }

  escaparHtml(valor) {
    return String(valor || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  limparCacheAgendamentos() {
    [
      'agendamentos_ligacoes.json',    ].forEach(nome => {
      try {
        localStorage.removeItem(`cache_${nome}`);
        localStorage.removeItem(`cache_ts_${nome}`);
      } catch (e) {}
    });
  }

  async buscarAgendamentos() {
    const nomesArquivos = [
      'agendamentos_ligacoes.json'
    ];

    let ultimoErro = null;

    for (const nomeArquivo of nomesArquivos) {
      try {
        if (typeof window.buscarArquivo === 'function' && typeof AuthManager !== 'undefined') {
          const resultado = await window.buscarArquivo(nomeArquivo);
          const lista = this.normalizarLista(resultado);
          if (Array.isArray(lista)) return lista;
        }
      } catch (erro) {
        ultimoErro = erro;
      }

      try {
        const baseUrl = this.obterApiUrl();
        if (!baseUrl) continue;

        const url = new URL(baseUrl);
        url.searchParams.set('acao', 'buscar');
        url.searchParams.set('arquivo', nomeArquivo);
        url.searchParams.set('_t', Date.now());

        const deviceId = this.obterDeviceId();
        if (deviceId) url.searchParams.set('deviceId', deviceId);

        let resp;
        if (window.AuthManager && typeof window.AuthManager.requisicaoSegura === 'function') {
          resp = await window.AuthManager.requisicaoSegura(url.toString());
        } else {
          resp = await fetch(url.toString(), { cache: 'no-store' });
        }

        if (!resp.ok) throw new Error('HTTP ' + resp.status);

        const dados = await resp.json();
        const lista = this.normalizarLista(dados);
        if (Array.isArray(lista)) return lista;
      } catch (erro) {
        ultimoErro = erro;
      }
    }

    throw ultimoErro || new Error('Não consegui carregar os agendamentos de ligação.');
  }

  async postAcao(paramsObj) {
    const baseUrl = this.obterApiUrl();
    if (!baseUrl) throw new Error('CONFIG.API_URL não encontrado');

    const deviceId = this.obterDeviceId();
    if (deviceId && !paramsObj.deviceId) paramsObj.deviceId = deviceId;

    const opcoes = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(paramsObj)
    };

    let resp;
    if (window.AuthManager && typeof window.AuthManager.requisicaoSegura === 'function') {
      resp = await window.AuthManager.requisicaoSegura(baseUrl, opcoes);
    } else {
      const url = new URL(baseUrl);
      if (deviceId) url.searchParams.set('deviceId', deviceId);
      resp = await fetch(url.toString(), opcoes);
    }

    const texto = await resp.text();
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ': ' + texto);

    let json;
    try {
      json = JSON.parse(texto);
    } catch (e) {
      throw new Error('Resposta inválida do servidor: ' + texto);
    }

    if (json.sucesso === false || json.status === 'error') {
      throw new Error(json.mensagem || json.message || json.erro || 'Erro no servidor');
    }

    return json;
  }

  criarContainerSeNaoExistir() {
    let container = document.getElementById('alertas-ligacoes-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'alertas-ligacoes-container';
      container.style.cssText = `
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 99999;
        max-width: 410px;
        width: calc(100vw - 36px);
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  injetarEstilos() {
    if (document.getElementById('alertas-ligacoes-style')) return;

    const style = document.createElement('style');
    style.id = 'alertas-ligacoes-style';
    style.textContent = `
      @keyframes slideInAlertaLigacao {
        from { transform: translateX(450px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes girarMiniLoader {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .alerta-ligacao-card-unico {
        pointer-events: auto;
        background: linear-gradient(135deg, rgba(16,72,46,.97), rgba(18,66,37,.97));
        border: 2px solid rgba(76,175,80,.45);
        border-radius: 16px;
        padding: 14px;
        color: #dff7e6;
        box-shadow: 0 10px 40px rgba(76,175,80,.22);
        animation: slideInAlertaLigacao .25s ease-out;
        backdrop-filter: blur(14px);
        overflow: hidden;
      }
      .alerta-ligacao-card-unico .btn-alerta {
        flex: 1;
        min-height: 44px;
        padding: 10px 12px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 700;
        font-size: 13px;
        transition: .15s ease;
      }
      .alerta-ligacao-card-unico .btn-alerta:hover {
        filter: brightness(1.05);
        transform: translateY(-1px);
      }
      .alerta-ligacao-card-unico .loading-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        gap: 10px;
      }
      .alerta-ligacao-card-unico .mini-loader {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255,255,255,.18);
        border-top-color: #d4af37;
        border-radius: 50%;
        animation: girarMiniLoader .8s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }

  montarIdDom(idAlertaUnico) {
    return `alerta-${String(idAlertaUnico).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  mostrarAlerta(agendamento, idAlertaUnico) {
    this.injetarEstilos();
    const container = this.criarContainerSeNaoExistir();

    const alertDiv = document.createElement('div');
    alertDiv.id = this.montarIdDom(idAlertaUnico);
    alertDiv.className = 'alerta-ligacao-card-unico';

    const numero = this.obterNumero(agendamento);
    const descricao = this.obterDescricao(agendamento);
    const dataRef = new Date(this.obterDataBase(agendamento));
    const dataFormatada = Number.isNaN(dataRef.getTime()) ? '-' : dataRef.toLocaleDateString('pt-BR');
    const horaFormatada = Number.isNaN(dataRef.getTime()) ? '-' : dataRef.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const idAgendamento = this.obterId(agendamento);

    alertDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
        <div style="font-weight:800; font-size:15px; color:#2fcf8c; display:flex; align-items:center; gap:8px;">
          📞 LIGAÇÃO AGENDADA
        </div>
        <button onclick="window.sistemaAlertas.fecharAlerta('${idAlertaUnico}')" style="background:none; border:none; color:#a6d8ad; cursor:pointer; font-size:18px; line-height:1;">✕</button>
      </div>

      <div style="color:#d4af37; font-weight:700; margin-bottom:8px; font-size:15px; display:flex; align-items:center; gap:6px;">
        ☎️ ${this.escaparHtml(numero)}
      </div>

      <div style="color:#d7e8da; font-size:12px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
        📅 ${dataFormatada} às ${horaFormatada}
      </div>

      <div style="color:#eaf7ec; font-size:12px; font-style:italic; margin-bottom:12px; padding:10px; background:rgba(255,255,255,.06); border-radius:8px; display:flex; align-items:center; gap:6px;">
        📝 ${this.escaparHtml(descricao)}
      </div>

      <div style="display:flex; gap:10px; margin-top:10px;">
        <button onclick="window.sistemaAlertas.marcarComoLigou('${idAgendamento}', '${idAlertaUnico}')" class="btn-alerta" style="background:rgba(144,59,44,.45); border:1px solid rgba(244,67,54,.30); color:#ff6f61;">
          ✔ Ligou
        </button>
        <button onclick="window.sistemaAlertas.adiar5Minutos('${idAgendamento}', '${idAlertaUnico}')" class="btn-alerta" style="background:rgba(152,126,16,.35); border:1px solid rgba(255,193,7,.28); color:#f0c93d;">
          ⏱ Adiar 5min
        </button>
      </div>
    `;

    container.appendChild(alertDiv);
    this.tocarSom();
  }

  mostrarLoading(idAlertaUnico, titulo, texto) {
    const elemento = document.getElementById(this.montarIdDom(idAlertaUnico));
    if (!elemento) return;

    elemento.innerHTML = `
      <div class="loading-box">
        <div class="mini-loader"></div>
        <div style="font-size:13px; font-weight:700; color:#e9f7ec;">${this.escaparHtml(titulo || 'Processando...')}</div>
        <div style="font-size:12px; color:#cfe6d3; text-align:center; line-height:1.35;">${this.escaparHtml(texto || 'Aguarde um instante...')}</div>
      </div>
    `;
  }

  fecharAlerta(idAlertaUnico) {
    const elemento = document.getElementById(this.montarIdDom(idAlertaUnico));
    if (elemento && elemento.parentElement) {
      elemento.remove();
    }
    this.alertasExibidosNoTela.delete(idAlertaUnico);
  }

  tocarSom() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  }

  async marcarComoLigou(idAgendamento, idAlertaUnico) {
    const confirmar = await modalConfirm('Tem certeza que deseja excluir esse agendamento?', { title: 'Excluir agendamento', okText: 'Excluir', cancelText: 'Cancelar' });
    if (!confirmar) return;

    this.mostrarLoading(idAlertaUnico, 'Excluindo agendamento...', 'Aguarde, estou removendo esse aviso.');

    try {
      await this.postAcao({
        acao: 'apagarAgendamentoLigacao',
        id: idAgendamento
      });

      this.limparCacheAgendamentos();
      this.fecharAlerta(idAlertaUnico);
      this.agendamentos = this.agendamentos.filter(a => String(this.obterId(a)) !== String(idAgendamento));
      console.log('✅ Agendamento removido do JSON:', idAgendamento);
    } catch (erro) {
      console.error('❌ Erro ao excluir agendamento:', erro);
      alert('❌ Não consegui excluir o agendamento. Veja o console para detalhes.');
      this.fecharAlerta(idAlertaUnico);
    }
  }

  async adiar5Minutos(idAgendamento, idAlertaUnico) {
    const proximoAlerta = new Date(Date.now() + 5 * 60000);

    this.mostrarLoading(idAlertaUnico, 'Adiando alerta...', 'Aguarde, estou adiando este aviso em 5 minutos.');

    try {
      await this.postAcao({
        acao: 'adiarAgendamentoLigacao',
        id: idAgendamento,
        dataHoraProximoAlerta: proximoAlerta.toISOString()
      });

      this.limparCacheAgendamentos();

      const encontrado = this.agendamentos.find(a => String(this.obterId(a)) === String(idAgendamento));
      if (encontrado) encontrado.DataHoraProximoAlerta = proximoAlerta.toISOString();

      this.fecharAlerta(idAlertaUnico);
      console.log('✅ Agendamento adiado por 5 minutos:', idAgendamento);
    } catch (erro) {
      console.error('❌ Erro ao adiar agendamento:', erro);
      alert('❌ Não consegui adiar o agendamento. Veja o console para detalhes.');
      this.fecharAlerta(idAlertaUnico);
    }
  }

  verificarAgendamento(agendamento) {
    const agora = new Date();
    const dataAlertaAtual = this.obterDataAlerta(agendamento);
    if (!dataAlertaAtual) return;

    if (dataAlertaAtual > agora) return;

    const idBase = this.obterId(agendamento);
    const idAlertaUnico = `${idBase}-${Math.floor(dataAlertaAtual.getTime() / 300000)}`;

    if (this.alertasExibidosNoTela.has(idAlertaUnico)) return;

    console.log(`📞 ALERTA ÚNICO DE LIGAÇÃO: ${this.obterNumero(agendamento)}`);
    this.mostrarAlerta(agendamento, idAlertaUnico);
    this.alertasExibidosNoTela.add(idAlertaUnico);
  }

  async verificarAgendamentos() {
    if (this.emVerificacao) return;
    this.emVerificacao = true;

    try {
      const lista = await this.buscarAgendamentos();
      this.agendamentos = lista;

      for (const agendamento of lista) {
        this.verificarAgendamento(agendamento);
      }
    } catch (erro) {
      console.warn('⚠️ Erro ao verificar alertas de ligação:', erro);
    } finally {
      this.emVerificacao = false;
    }
  }
}

window.sistemaAlertas = new AlertaLigacaoSistema();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.sistemaAlertas.iniciar());
} else {
  window.sistemaAlertas.iniciar();
}
