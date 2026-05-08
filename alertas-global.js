/**
 * SISTEMA DE ALERTAS GLOBAL - VERSÃO CENTRALIZADA
 * 
 * Este arquivo carrega o sistema de alertas de ligações em TODOS os HTMLs
 * Funciona da mesma forma que alertas-ligacoes.js mas pode ser incluído
 * em qualquer página do aplicativo
 * 
 * USO: Adicionar no <head> ou antes de </body> em qualquer HTML:
 *   <script src="alertas-global.js"></script>
 */

class AlertaLigacaoGlobal {
  constructor() {
    this.agendamentos = [];
    this.alertasExibidosNoTela = new Set();
    this.intervaloMonitor = null;
    this.ultimaVerificacao = null;
    this.paginaOrigem = this.detectarPaginaAtual();
  }

  /**
   * Detectar qual página HTML está ativa
   */
  detectarPaginaAtual() {
    const url = window.location.pathname;
    if (url.includes('alertas-ligacoes.html')) return 'alertas-ligacoes.html';
    if (url.includes('agendar-ligacoes.html')) return 'agendar-ligacoes.html';
    if (url.includes('revisao-contatos.html')) return 'revisao-contatos.html';
    if (url.includes('clientes.html')) return 'clientes.html';
    if (url.includes('vendas')) return 'vendas.html';
    if (url.includes('index.html')) return 'index.html';
    return 'página desconhecida';
  }

  /**
   * Iniciar monitoramento global
   */
  iniciar() {
    console.log(`🔔 [ALERTAS GLOBAL] Iniciando em: ${this.paginaOrigem}`);
    
    // Carregar na primeira vez
    this.verificarAgendamentos();
    
    // Verificar a cada 30 segundos
    this.intervaloMonitor = setInterval(() => {
      this.verificarAgendamentos();
    }, 30000);

    // Também verificar quando página fica visível (voltou do minimizado)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log(`📱 [ALERTAS GLOBAL] Página visível (${this.paginaOrigem}) - verificando agendamentos...`);
        this.verificarAgendamentos();
      }
    });

    console.log('✅ [ALERTAS GLOBAL] Monitoramento iniciado');
  }

  /**
   * Parar monitoramento
   */
  parar() {
    if (this.intervaloMonitor) {
      clearInterval(this.intervaloMonitor);
      console.log('🔔 [ALERTAS GLOBAL] Monitoramento parado');
    }
  }

  /**
   * Verificar se há agendamentos pendentes
   */
  async verificarAgendamentos() {
    try {
      const agora = new Date();
      
      // Se foi verificado há menos de 10 segundos, pular
      if (this.ultimaVerificacao && (agora - this.ultimaVerificacao) < 10000) {
        return;
      }

      this.ultimaVerificacao = agora;

      // Carregar agendamentos
      const dados = await this.buscarAgendamentos();
      this.agendamentos = Array.isArray(dados) ? dados : (dados.dados || []);

      // Verificar cada agendamento
      for (const agendamento of this.agendamentos) {
        this.verificarAgendamento(agendamento);
      }

    } catch (erro) {
      console.warn('⚠️ [ALERTAS GLOBAL] Erro ao verificar agendamentos:', erro);
    }
  }

  /**
   * Buscar agendamentos do Drive (via API)
   */
  async buscarAgendamentos() {
    try {
      const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
      
      // Usar CONFIG se estiver disponível
      const apiUrl = typeof CONFIG !== 'undefined' ? CONFIG.API_URL : null;
      const arquivo = typeof CONFIG !== 'undefined' ? 
        (CONFIG.ARQUIVOS?.AGENDAMENTOS_LIGACOES || 'agendamentos_ligacoes.json') : 
        'agendamentos_ligacoes.json';

      if (!apiUrl) {
        console.warn('⚠️ [ALERTAS GLOBAL] CONFIG não carregado ainda, aguardando...');
        return [];
      }

      const url = `${apiUrl}?acao=buscar&arquivo=${arquivo}&deviceId=${deviceId}&t=${Date.now()}`;
      
      const response = await fetch(url, { 
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        console.log('⚠️ [ALERTAS GLOBAL] Arquivo de agendamentos não existe ainda');
        return [];
      }

      let dados = await response.json();
      
      // Se vier como string, fazer parse
      if (typeof dados === 'string') {
        dados = JSON.parse(dados);
      }

      // Se vier objeto com propriedade 'dados', extrair array
      if (dados && typeof dados === 'object' && !Array.isArray(dados)) {
        dados = dados.dados || [];
      }

      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      console.error('❌ [ALERTAS GLOBAL] Erro ao buscar agendamentos:', erro);
      return [];
    }
  }

  /**
   * Verificar um agendamento específico
   */
  verificarAgendamento(agendamento) {
    try {
      if (!agendamento.DataHoraInicio || !agendamento.Numero) {
        console.warn('⚠️ [ALERTAS GLOBAL] Agendamento inválido:', agendamento);
        return;
      }

      const agora = new Date();
      const dataHora = new Date(agendamento.DataHoraInicio);
      
      // Se tem DataHoraProximoAlerta, usar ela
      let dataAlertaAtual = dataHora;
      if (agendamento.DataHoraProximoAlerta) {
        dataAlertaAtual = new Date(agendamento.DataHoraProximoAlerta);
      }

      // Se ainda não chegou a hora, NÃO alertar
      if (dataAlertaAtual > agora) {
        return;
      }

      // Se passou há mais de 5 minutos, NÃO alertar
      const tempoDesdeAlerta = agora - dataAlertaAtual;
      if (tempoDesdeAlerta > 300000) {
        return;
      }

      // ID ÚNICO para este alerta
      const idAlertaUnico = `${agendamento.Id}-${Math.floor(dataAlertaAtual.getTime() / 300000)}`;
      
      // Se já está visível, pular
      if (this.alertasExibidosNoTela.has(idAlertaUnico)) {
        return;
      }

      // MOSTRAR ALERTA!
      console.log(`🔔 [ALERTAS GLOBAL] ALERTA DE LIGAÇÃO: ${agendamento.Numero}`);
      this.mostrarAlerta(agendamento, idAlertaUnico);
      this.alertasExibidosNoTela.add(idAlertaUnico);
    } catch (erro) {
      console.error('❌ [ALERTAS GLOBAL] Erro ao verificar agendamento:', erro);
    }
  }

  /**
   * Mostrar notificação visual
   */
  mostrarAlerta(agendamento, idAlertaUnico) {
    try {
      // Criar container se não existir
      let container = document.getElementById('alertas-ligacoes-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'alertas-ligacoes-container';
        container.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 99999;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        document.body.appendChild(container);
      }

      // Criar card de alerta
      const alertDiv = document.createElement('div');
      alertDiv.id = `alerta-${idAlertaUnico}`;
      alertDiv.style.cssText = `
        background: linear-gradient(135deg, rgba(31,163,122,.3), rgba(76,175,80,.2));
        border: 2px solid rgba(76,175,80,.5);
        border-radius: 12px;
        padding: 16px;
        backdrop-filter: blur(14px);
        color: #81c784;
        font-size: 14px;
        box-shadow: 0 10px 40px rgba(76,175,80,.3);
        animation: slideIn 0.4s ease-out;
      `;

      const dataHora = new Date(agendamento.DataHoraInicio);
      const dataFormatada = dataHora.toLocaleDateString('pt-BR');
      const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Criar funções locais para evitar problemas com 'this'
      const instancia = this;
      const onLiguei = async () => {
        await instancia.marcarComoLigou(agendamento.Id, idAlertaUnico);
      };
      const onAdiar = async () => {
        await instancia.adiar5Minutos(agendamento.Id, idAlertaUnico);
      };
      const onFechar = () => {
        instancia.fecharAlerta(idAlertaUnico);
      };

      alertDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 16px; color: #1fa37a;">📞 LIGAÇÃO AGENDADA</div>
          <button id="btn-close-${idAlertaUnico}" style="background: none; border: none; color: #81c784; cursor: pointer; font-size: 18px;">✕</button>
        </div>
        
        <div style="color: #d4af37; font-weight: 600; margin-bottom: 8px; font-size: 15px;">
          ☎️ ${agendamento.Numero}
        </div>
        
        <div style="color: #b9d8ce; font-size: 13px; margin-bottom: 4px;">
          📅 ${dataFormatada} às ${horaFormatada}
        </div>

        ${agendamento.Descricao ? `
          <div style="color: #b9d8ce; font-size: 13px; font-style: italic; margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,.05); border-left: 3px solid rgba(76,175,80,.3); border-radius: 4px;">
            📝 ${agendamento.Descricao}
          </div>
        ` : ''}

        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button id="btn-ligou-${idAlertaUnico}" style="flex: 1; padding: 8px 12px; background: rgba(244,67,54,.2); border: 1px solid rgba(244,67,54,.3); color: #ef5350; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">
            ✓ Ligou
          </button>
          <button id="btn-adiar-${idAlertaUnico}" style="flex: 1; padding: 8px 12px; background: rgba(255,193,7,.2); border: 1px solid rgba(255,193,7,.3); color: #fbc02d; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">
            ⏱️ Adiar 5min
          </button>
        </div>
      `;

      container.appendChild(alertDiv);

      // Adicionar event listeners (mais seguro que onclick)
      const btnLiguei = document.getElementById(`btn-ligou-${idAlertaUnico}`);
      const btnAdiar = document.getElementById(`btn-adiar-${idAlertaUnico}`);
      const btnFechar = document.getElementById(`btn-close-${idAlertaUnico}`);

      if (btnLiguei) {
        btnLiguei.addEventListener('click', onLiguei);
      }
      if (btnAdiar) {
        btnAdiar.addEventListener('click', onAdiar);
      }
      if (btnFechar) {
        btnFechar.addEventListener('click', onFechar);
      }

      // Adicionar animação CSS se não existir
      if (!document.getElementById('alertas-ligacoes-style')) {
        const style = document.createElement('style');
        style.id = 'alertas-ligacoes-style';
        style.textContent = `
          @keyframes slideIn {
            from {
              transform: translateX(450px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(450px);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
    } catch (erro) {
      console.error('❌ [ALERTAS GLOBAL] Erro ao mostrar alerta:', erro);
    }
  }

  /**
   * Fechar alerta individual
   */
  fecharAlerta(idAlertaUnico) {
    try {
      const alertDiv = document.getElementById(`alerta-${idAlertaUnico}`);
      if (alertDiv) {
        alertDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => alertDiv.remove(), 300);
      }
      this.alertasExibidosNoTela.delete(idAlertaUnico);
    } catch (erro) {
      console.error('❌ [ALERTAS GLOBAL] Erro ao fechar alerta:', erro);
    }
  }

  /**
   * Marcar como ligou (remover e atualizar status)
   */
  async marcarComoLigou(id, idAlertaUnico) {
    try {
      console.log(`📞 [ALERTAS GLOBAL] Marcando como LIGOU: ${id}`);
      console.log(`📞 [ALERTAS GLOBAL] ID Alert: ${idAlertaUnico}`);
      
      const resultado = await this.apagarAgendamento(id);
      console.log(`📞 [ALERTAS GLOBAL] Resultado apagar:`, resultado);
      
      this.fecharAlerta(idAlertaUnico);
      
      // Notificar visualmente
      this.mostrarNotificacao('✅ Ligação marcada como feita!', 'success');
      
      // Recarregar lista após 1 segundo
      setTimeout(() => {
        console.log(`📞 [ALERTAS GLOBAL] Recarregando agendamentos após marcar como ligou...`);
        this.verificarAgendamentos();
      }, 1000);
    } catch (erro) {
      console.error('❌ [ALERTAS GLOBAL] Erro ao marcar como ligou:', erro);
      console.error('❌ Stack:', erro.stack);
      this.mostrarNotificacao('❌ Erro ao marcar ligação: ' + erro.message, 'error');
    }
  }

  /**
   * Adiar por 5 minutos
   */
  async adiar5Minutos(id, idAlertaUnico) {
    try {
      console.log(`⏱️ [ALERTAS GLOBAL] Adiando por 5 minutos: ${id}`);
      
      const proximoAlerta = new Date();
      proximoAlerta.setMinutes(proximoAlerta.getMinutes() + 5);
      
      await this.adiarAgendamento(id, proximoAlerta);
      this.fecharAlerta(idAlertaUnico);
      
      this.mostrarNotificacao('⏱️ Ligação adiada por 5 minutos', 'info');
    } catch (erro) {
      console.error('❌ [ALERTAS GLOBAL] Erro ao adiar:', erro);
      this.mostrarNotificacao('❌ Erro ao adiar', 'error');
    }
  }

  /**
   * Mostrar notificação temporária
   */
  mostrarNotificacao(mensagem, tipo = 'info') {
    try {
      const div = document.createElement('div');
      div.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 16px;
        background: ${tipo === 'success' ? 'rgba(76,175,80,.2)' : tipo === 'error' ? 'rgba(244,67,54,.2)' : 'rgba(33,150,243,.2)'};
        color: ${tipo === 'success' ? '#81c784' : tipo === 'error' ? '#ef5350' : '#64b5f6'};
        border: 1px solid ${tipo === 'success' ? 'rgba(76,175,80,.3)' : tipo === 'error' ? 'rgba(244,67,54,.3)' : 'rgba(33,150,243,.3)'};
        border-radius: 8px;
        font-size: 12px;
        z-index: 99998;
        animation: slideIn 0.3s ease-out;
      `;
      div.textContent = mensagem;
      document.body.appendChild(div);
      
      setTimeout(() => {
        div.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => div.remove(), 300);
      }, 3000);
    } catch (erro) {
      console.error('❌ [ALERTAS GLOBAL] Erro ao mostrar notificação:', erro);
    }
  }

  /**
   * Apagar agendamento (remover do JSON)
   */
  async apagarAgendamento(id) {
    try {
      const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
      const apiUrl = typeof CONFIG !== 'undefined' ? CONFIG.API_URL : null;

      if (!apiUrl) {
        throw new Error('CONFIG não disponível');
      }

      console.log(`🔍 [ALERTAS GLOBAL] APAGAR - ID: ${id}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'acao': 'apagarAgendamentoLigacao',
          'id': String(id),
          'deviceId': deviceId
        })
      });

      const texto = await response.text();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${texto}`);
      }

      const resultado = JSON.parse(texto);
      
      if (!resultado.sucesso && !resultado.success) {
        throw new Error(resultado.mensagem || 'Erro ao apagar');
      }

      console.log(`✅ [ALERTAS GLOBAL] Agendamento ${id} apagado!`);
      return resultado;
    } catch (erro) {
      console.error('❌ [ALERTAS GLOBAL] Erro ao apagar agendamento:', erro);
      throw erro;
    }
  }

  /**
   * Adiar agendamento
   */
  async adiarAgendamento(id, proximoAlerta) {
    try {
      const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
      const apiUrl = typeof CONFIG !== 'undefined' ? CONFIG.API_URL : null;

      if (!apiUrl) {
        throw new Error('CONFIG não disponível');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'acao': 'adiarAgendamentoLigacao',
          'id': id,
          'dataHoraProximoAlerta': proximoAlerta.toISOString(),
          'deviceId': deviceId
        })
      });

      const resultado = await response.json();
      
      if (!resultado.sucesso && !resultado.success) {
        throw new Error(resultado.mensagem || 'Erro ao adiar');
      }

      console.log(`✅ [ALERTAS GLOBAL] Agendamento ${id} adiado`);
      return resultado;
    } catch (erro) {
      console.error('❌ [ALERTAS GLOBAL] Erro ao adiar:', erro);
      throw erro;
    }
  }
}

// ============================================
// INSTÂNCIA GLOBAL
// ============================================

// Criar instância global e deixar acessível
let sistemaAlertas = new AlertaLigacaoGlobal();
window.sistemaAlertas = sistemaAlertas;

// Iniciar automaticamente quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ [ALERTAS GLOBAL] DOMContentLoaded disparado, iniciando...');
    setTimeout(() => sistemaAlertas.iniciar(), 500); // Aguarda CONFIG carregar
  });
} else {
  // DOM já carregado
  console.log('✅ [ALERTAS GLOBAL] DOM já carregado, iniciando...');
  setTimeout(() => sistemaAlertas.iniciar(), 500);
}

// Parar quando fechar página
window.addEventListener('beforeunload', () => {
  sistemaAlertas.parar();
});

console.log('✅ alertas-global.js CARREGADO');
