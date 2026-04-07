/**
 * SISTEMA DE ALERTAS DE LIGAÇÕES - VERSÃO CORRIGIDA
 * Monitora agendamentos_ligacoes.json e mostra notificações
 * Cada alerta é removido INDIVIDUALMENTE ao clicar Liguei ou Adiar
 */

class AlertaLigacaoSistema {
  constructor() {
    this.agendamentos = [];
    this.alertasExibidosNoTela = new Set(); // IDs únicos dos alertas visíveis
    this.intervaloMonitor = null;
    this.ultimaVerificacao = null;
  }

  /**
   * Iniciar monitoramento global
   */
  iniciar() {
    console.log('🔔 Iniciando sistema de alertas de ligações...');
    
    // Carregar na primeira vez
    this.verificarAgendamentos();
    
    // Verificar a cada 30 segundos
    this.intervaloMonitor = setInterval(() => {
      this.verificarAgendamentos();
    }, 30000);

    // Também verificar quando página fica visível (voltou do minimizado)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('📱 Página visível - verificando agendamentos...');
        this.verificarAgendamentos();
      }
    });
  }

  /**
   * Parar monitoramento
   */
  parar() {
    if (this.intervaloMonitor) {
      clearInterval(this.intervaloMonitor);
      console.log('🔔 Monitoramento de ligações parado');
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
      console.warn('⚠️ Erro ao verificar agendamentos:', erro);
    }
  }

  /**
   * Verificar um agendamento específico
   */
  verificarAgendamento(agendamento) {
    const agora = new Date();
    const dataHora = new Date(agendamento.DataHoraInicio);
    
    // 🔍 VERIFICAR SE FOI ADIADO - Se tem DataHoraProximoAlerta, usar ela
    let dataAlertaAtual = dataHora;
    if (agendamento.DataHoraProximoAlerta) {
      dataAlertaAtual = new Date(agendamento.DataHoraProximoAlerta);
    }

    // ✅ Se ainda não chegou a hora (data no futuro), NÃO alertar
    if (dataAlertaAtual > agora) {
      return;
    }

    // ✅ Se a data é do passado (já passou há mais de 5 minutos), NÃO alertar
    const tempoDesdeAlerta = agora - dataAlertaAtual;
    if (tempoDesdeAlerta > 300000) { // 5 minutos em ms
      return;
    }

    // ID ÚNICO para este alerta (baseado no agendamento e timestamp)
    const idAlertaUnico = `${agendamento.Id}-${Math.floor(dataAlertaAtual.getTime() / 300000)}`;
    
    // Se já está visível na tela, pular
    if (this.alertasExibidosNoTela.has(idAlertaUnico)) {
      return;
    }

    // MOSTRAR ALERTA!
    console.log(`🔔 ALERTA DE LIGAÇÃO: ${agendamento.Numero}`);
    this.mostrarAlerta(agendamento, idAlertaUnico);
    this.alertasExibidosNoTela.add(idAlertaUnico);
  }

  /**
   * Mostrar notificação visual
   */
  mostrarAlerta(agendamento, idAlertaUnico) {
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

    // Criar card de alerta COM ID ÚNICO
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

    alertDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div style="font-weight: 700; font-size: 16px; color: #1fa37a;">📞 LIGAÇÃO AGENDADA</div>
        <button onclick="sistemaAlertas.fecharAlerta('${idAlertaUnico}')" style="background: none; border: none; color: #81c784; cursor: pointer; font-size: 18px;">✕</button>
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
        <button onclick="sistemaAlertas.marcarComoLigou('${agendamento.Id}', '${idAlertaUnico}')" style="flex: 1; padding: 8px 12px; background: rgba(244,67,54,.2); border: 1px solid rgba(244,67,54,.3); color: #ef5350; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">
          ✓ Ligou
        </button>
        <button onclick="sistemaAlertas.adiar5Minutos('${agendamento.Id}', '${idAlertaUnico}')" style="flex: 1; padding: 8px 12px; background: rgba(255,193,7,.2); border: 1px solid rgba(255,193,7,.3); color: #fbc02d; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">
          ⏱️ Adiar 5min
        </button>
      </div>
    `;

    container.appendChild(alertDiv);

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
      `;
      document.head.appendChild(style);
    }

    // Som de notificação (opcional)
    this.tocarSom();

    // Auto-remover após 30 segundos se não interagir
    setTimeout(() => {
      const elemento = document.getElementById(`alerta-${idAlertaUnico}`);
      if (elemento && elemento.parentElement) {
        elemento.style.animation = 'slideIn 0.4s ease-out reverse';
        setTimeout(() => {
          if (elemento && elemento.parentElement) {
            elemento.remove();
            this.alertasExibidosNoTela.delete(idAlertaUnico);
          }
        }, 400);
      }
    }, 30000);
  }

  /**
   * Fechar alerta manualmente
   */
  fecharAlerta(idAlertaUnico) {
    const elemento = document.getElementById(`alerta-${idAlertaUnico}`);
    if (elemento && elemento.parentElement) {
      elemento.remove();
      this.alertasExibidosNoTela.delete(idAlertaUnico);
    }
  }

  /**
   * Tocar som de notificação
   */
  tocarSom() {
    try {
      // Web Audio API - só funciona após um gesto do usuário
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Se o contexto está suspenso, retornar silenciosamente
      if (audioContext.state === 'suspended') {
        console.warn('⚠️ AudioContext suspenso - som não será tocado');
        return;
      }

      const oscilador = audioContext.createOscillator();
      const ganho = audioContext.createGain();

      oscilador.connect(ganho);
      ganho.connect(audioContext.destination);

      // Melody: dó, mi, sol (notification sound)
      const notas = [262, 330, 392]; // C4, E4, G4
      const duracao = 0.1;

      let tempo = audioContext.currentTime;
      for (const nota of notas) {
        oscilador.frequency.setValueAtTime(nota, tempo);
        tempo += duracao;
      }

      ganho.gain.setValueAtTime(0.3, audioContext.currentTime);
      ganho.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscilador.start(audioContext.currentTime);
      oscilador.stop(audioContext.currentTime + 0.3);
    } catch (erro) {
      // Suporta navegadores sem Web Audio API
      console.warn('⚠️ Som não disponível:', erro.message);
    }
  }

  /**
   * Buscar agendamentos do Google Drive
   */
  async buscarAgendamentos() {
    if (typeof buscarArquivo === 'function') {
      return await buscarArquivo('agendamentos_ligacoes.json');
    }

    throw new Error('Função buscarArquivo não disponível');
  }

  /**
   * ✅ Marcar como "Ligou" - Remove do alerta E apaga do JSON
   */
  async marcarComoLigou(id, idAlertaUnico) {
    try {
      console.log(`✓ Marcado como LIGOU: ${id}`);
      console.log(`✓ Tipo do ID: ${typeof id}`);
      console.log(`✓ ID do Alerta: ${idAlertaUnico}`);
      
      // 1. Remover da tela
      this.fecharAlerta(idAlertaUnico);
      
      // 2. Apagar do JSON no servidor
      const resultado = await this.apagarAgendamento(id);
      console.log(`✓ Resposta do servidor:`, resultado);
      
      // 3. Remover da lista local
      const agendamentoIndex = this.agendamentos.findIndex(a => String(a.Id) === String(id));
      if (agendamentoIndex !== -1) {
        this.agendamentos.splice(agendamentoIndex, 1);
        console.log(`✓ Removido da memória (índice ${agendamentoIndex})`);
      }
      
      // 4. Mostrar confirmação
      console.log(`✓ Agendamento ${id} removido do JSON e da memória`);
      
    } catch (erro) {
      console.error('❌ Erro ao marcar como ligou:', erro);
      console.error('❌ Stack:', erro.stack);
      alert('❌ Erro ao salvar! Tente novamente.');
    }
  }

  /**
   * ✅ Adiar por 5 minutos - Remove do alerta E atualiza no JSON com DataHoraProximoAlerta
   */
  async adiar5Minutos(id, idAlertaUnico) {
    try {
      console.log(`⏱️ Adiado por 5 minutos: ${id}`);
      
      // 1. Remover da tela (volta em 5 min)
      this.fecharAlerta(idAlertaUnico);
      
      // 2. Atualizar data/hora no servidor (armazena próximo alerta = agora + 5 min)
      const agora = new Date();
      const proximoAlerta = new Date(agora.getTime() + 5 * 60 * 1000); // +5 minutos
      
      await this.adiarAgendamento(id, proximoAlerta);
      
      // 3. Remover do rastreamento para poder alertar de novo em 5 min
      this.alertasExibidosNoTela.delete(idAlertaUnico);
      
      console.log(`✓ Agendamento ${id} adiado até ${proximoAlerta.toLocaleTimeString('pt-BR')}`);
      
    } catch (erro) {
      console.error('❌ Erro ao adiar:', erro);
      alert('❌ Erro ao salvar! Tente novamente.');
    }
  }

  /**
   * Apagar agendamento do JSON
   */
  async apagarAgendamento(id) {
    try {
      const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
      
      console.log(`🔍 APAGAR - ID recebido: ${id} (tipo: ${typeof id})`);
      console.log(`🔍 APAGAR - DeviceId: ${deviceId}`);
      console.log(`🔍 APAGAR - URL: ${CONFIG.API_URL}`);

      const params = new URLSearchParams({
        'acao': 'apagarAgendamentoLigacao',
        'id': String(id),
        'deviceId': deviceId
      });
      
      console.log(`� APAGAR - Parâmetros:`, params.toString());

      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      const texto = await response.text();
      console.log(`📨 APAGAR - Resposta bruta: ${texto}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${texto}`);
      }

      const resultado = JSON.parse(texto);
      console.log(`📨 APAGAR - Resultado parseado:`, resultado);
      
      if (!resultado.sucesso) {
        throw new Error(resultado.mensagem || 'Erro ao apagar');
      }

      console.log(`✅ APAGAR - Agendamento ${id} apagado com sucesso!`);
      return resultado;
    } catch (erro) {
      console.error('❌ APAGAR - Erro:', erro);
      console.error('❌ APAGAR - Stack:', erro.stack);
      throw erro;
    }
  }

  /**
   * Adiar agendamento (armazena DataHoraProximoAlerta)
   */
  async adiarAgendamento(id, proximoAlerta) {
    try {
      const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
      
      // Usar URLSearchParams para enviar como POST com parâmetros
      const response = await fetch(CONFIG.API_URL, {
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
      if (!resultado.sucesso) {
        throw new Error(resultado.mensagem || 'Erro ao adiar');
      }

      console.log(`✅ Agendamento ${id} adiado até ${proximoAlerta.toLocaleTimeString('pt-BR')}`);
      return resultado;
    } catch (erro) {
      console.error('❌ Erro ao adiar:', erro);
      throw erro;
    }
  }
}

// Instância global
const sistemaAlertas = new AlertaLigacaoSistema();

// Iniciar automaticamente quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  sistemaAlertas.iniciar();
});

// Parar quando fechar página
window.addEventListener('beforeunload', () => {
  sistemaAlertas.parar();
});
