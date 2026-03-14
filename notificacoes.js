// ============================================
// GERENCIADOR COMPLETO DE NOTIFICAÇÕES
// ============================================

class GerenciadorNotificacoes {
  constructor() {
    this.serviceWorkerRegistrado = false;
    this.permissaoNotificacao = false;
    this.inicializado = false;
    this.init();
    this.configurarRecepcaoMensagens();
  }

  // ============================================
  // INICIALIZAR SERVICE WORKER
  // ============================================
  async init() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('service-worker.js');
        this.serviceWorkerRegistrado = true;
        console.log('✅ Service Worker registrado');
        
        this.verificarPermissao();
        this.iniciarVerificacaoLembretes();
        this.inicializado = true;
      } catch (erro) {
        console.error('❌ Erro ao registrar Service Worker:', erro);
      }
    } else {
      console.warn('⚠️ Service Workers não suportados');
    }
  }

  // ============================================
  // VERIFICAR PERMISSÃO ATUAL
  // ============================================
  verificarPermissao() {
    if ('Notification' in window) {
      this.permissaoNotificacao = Notification.permission === 'granted';
      console.log('Permissão de notificação:', Notification.permission);
    }
  }

  // ============================================
  // SOLICITAR PERMISSÃO AO USUÁRIO
  // ============================================
  async solicitarPermissao() {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissaoNotificacao = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permissao = await Notification.requestPermission();
      this.permissaoNotificacao = permissao === 'granted';
      
      if (this.permissaoNotificacao) {
        console.log('✅ Notificações habilitadas pelo usuário');
      }
      
      return this.permissaoNotificacao;
    }

    return false;
  }

  // ============================================
  // ENVIAR NOTIFICAÇÃO LOCAL
  // ============================================
  enviarNotificacaoLocal(titulo, opcoes = {}) {
    if (!this.permissaoNotificacao) {
      console.warn('⚠️ Permissão de notificação não concedida');
      return;
    }

    const opcoesDefault = {
      icon: 'assets/img/logo-bovi-premium.png',
      badge: 'assets/img/logo-bovi-premium.png',
      ...opcoes
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'MOSTRAR_NOTIFICACAO',
        titulo,
        opcoes: opcoesDefault
      });
    }
  }

  // ============================================
  // CONFIGURAR RECEPÇÃO DE MENSAGENS DO SW
  // ============================================
  configurarRecepcaoMensagens() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const dados = event.data;

        if (dados.tipo === 'abrir-ligacao') {
          this.abrirModuloLigacao(dados);
        } else if (dados.tipo === 'abrir-pagamento') {
          this.abrirModuloPagamento(dados);
        } else if (dados.tipo === 'adiar-ligacao') {
          this.adiarLigacao(dados);
        }
      });
    }
  }

  // ============================================
  // INICIAR VERIFICAÇÃO DE LEMBRETES
  // ============================================
  iniciarVerificacaoLembretes() {
    console.log('⏰ Sistema de lembretes iniciado');
    
    // Verificar a cada 1 minuto
    setInterval(() => {
      this.verificarAgendasLigacao();
      this.verificarVencimentoBoletos();
    }, 60000);

    // Também verificar imediatamente ao iniciar
    setTimeout(() => {
      this.verificarAgendasLigacao();
      this.verificarVencimentoBoletos();
    }, 5000);
  }

  // ============================================
  // VERIFICAR AGENDAS DE LIGAÇÃO
  // ============================================
  async verificarAgendasLigacao() {
    try {
      const clientes = await this.buscarArquivo('clientes.json');
      if (!Array.isArray(clientes)) return;

      const agora = new Date();

      clientes.forEach((cliente) => {
        if (cliente.AgendaLigacoes && Array.isArray(cliente.AgendaLigacoes)) {
          cliente.AgendaLigacoes.forEach((agenda) => {
            const dataAgenda = new Date(agenda.data + 'T' + agenda.horario);
            const diferencaMinutos = (dataAgenda - agora) / (1000 * 60);

            // 🔔 NOTIFICAR 15 MINUTOS ANTES
            if (diferencaMinutos <= 15 && diferencaMinutos > 14) {
              this.enviarNotificacaoLigacao(cliente, agenda, 'aviso');
            }

            // 🔴 NOTIFICAR NA HORA EXATA
            if (diferencaMinutos <= 1 && diferencaMinutos > 0) {
              this.enviarNotificacaoLigacao(cliente, agenda, 'agora');
            }
          });
        }
      });
    } catch (erro) {
      console.error('❌ Erro ao verificar agendas:', erro);
    }
  }

  // ============================================
  // ENVIAR NOTIFICAÇÃO DE LIGAÇÃO
  // ============================================
  enviarNotificacaoLigacao(cliente, agenda, tipo = 'aviso') {
    let titulo, corpo, requerInteracao;

    if (tipo === 'agora') {
      titulo = '🔴 LIGAR AGORA!';
      corpo = `${cliente.Nome} - Telefone: ${cliente.Telefone1}`;
      requerInteracao = true;
    } else {
      titulo = '⏰ Ligação Agendada em 15 min';
      corpo = `${cliente.Nome} às ${agenda.horario}`;
      requerInteracao = false;
    }

    const opcoes = {
      body: corpo,
      tag: `ligacao-${cliente.Nome}-${agenda.data}`,
      requireInteraction: requerInteracao,
      tipo: 'ligacao',
      dados: {
        nomeCliente: cliente.Nome,
        telefone: cliente.Telefone1,
        horario: agenda.horario,
        observacao: agenda.Observacao || ''
      }
    };

    this.enviarNotificacaoLocal(titulo, opcoes);

    if (tipo === 'agora') {
      this.tocarSom();
    }
  }

  // ============================================
  // VERIFICAR VENCIMENTO DE BOLETOS
  // ============================================
  async verificarVencimentoBoletos() {
    try {
      const clientes = await this.buscarArquivo('clientes.json');
      if (!Array.isArray(clientes)) return;

      const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
      const modulos = usuarioLogado.modulos || [];

      // Verificar se usuário tem acesso a Pagamentos
      if (!modulos.includes('Pagamentos')) return;

      const agora = new Date();
      agora.setHours(0, 0, 0, 0);

      clientes.forEach((cliente) => {
        if (cliente.Vendas && Array.isArray(cliente.Vendas)) {
          cliente.Vendas.forEach((venda) => {
            if (venda.Parcelas && Array.isArray(venda.Parcelas)) {
              venda.Parcelas.forEach((parcela) => {
                if (!parcela.Pago) {
                  const dataVencimento = new Date(parcela.DataVencimento);
                  dataVencimento.setHours(0, 0, 0, 0);
                  
                  const diasRestantes = Math.floor((dataVencimento - agora) / (1000 * 60 * 60 * 24));

                  // 📢 NOTIFICAR 10 DIAS ANTES DO VENCIMENTO
                  if (diasRestantes === 10) {
                    this.enviarNotificacaoVencimento(cliente, parcela, 'aviso-10');
                  }

                  // 📢 NOTIFICAR 5 DIAS ANTES DO VENCIMENTO
                  if (diasRestantes === 5) {
                    this.enviarNotificacaoVencimento(cliente, parcela, 'aviso-5');
                  }

                  // 🔴 NOTIFICAR NO DIA DO VENCIMENTO
                  if (diasRestantes === 0) {
                    this.enviarNotificacaoVencimento(cliente, parcela, 'venceu');
                  }

                  // 🔴 NOTIFICAR SE VENCEU (APÓS DATA)
                  if (diasRestantes < 0) {
                    this.enviarNotificacaoVencimento(cliente, parcela, 'vencido');
                  }
                }
              });
            }
          });
        }
      });
    } catch (erro) {
      console.error('❌ Erro ao verificar vencimentos:', erro);
    }
  }

  // ============================================
  // ENVIAR NOTIFICAÇÃO DE VENCIMENTO
  // ============================================
  enviarNotificacaoVencimento(cliente, parcela, tipo) {
    let titulo, corpo, requerInteracao;

    const dataVencimento = new Date(parcela.DataVencimento).toLocaleDateString('pt-BR');

    switch (tipo) {
      case 'aviso-10':
        titulo = '📢 Boleto Vencendo em 10 dias';
        corpo = `${cliente.Nome} - Vencimento: ${dataVencimento} - R$ ${parcela.Valor.toFixed(2)}`;
        requerInteracao = false;
        break;
      
      case 'aviso-5':
        titulo = '⚠️ Boleto Vencendo em 5 dias';
        corpo = `${cliente.Nome} - Vencimento: ${dataVencimento} - R$ ${parcela.Valor.toFixed(2)}`;
        requerInteracao = true;
        break;
      
      case 'venceu':
        titulo = '🔴 Boleto Venceu Hoje!';
        corpo = `${cliente.Nome} - Data: ${dataVencimento} - R$ ${parcela.Valor.toFixed(2)}`;
        requerInteracao = true;
        break;
      
      case 'vencido':
        titulo = '⛔ Boleto em Atraso';
        corpo = `${cliente.Nome} - Vencimento: ${dataVencimento} - R$ ${parcela.Valor.toFixed(2)}`;
        requerInteracao = true;
        break;
    }

    const opcoes = {
      body: corpo,
      tag: `pagamento-${cliente.Nome}-${parcela.DataVencimento}`,
      requireInteraction: requerInteracao,
      tipo: 'pagamento',
      dados: {
        nomeCliente: cliente.Nome,
        cpf: cliente.CPF,
        dataVencimento: parcela.DataVencimento,
        valor: parcela.Valor
      }
    };

    this.enviarNotificacaoLocal(titulo, opcoes);

    if (tipo === 'venceu' || tipo === 'vencido') {
      this.tocarSom();
    }
  }

  // ============================================
  // 🔊 TOCAR SOM DE ALERTA
  // ============================================
  tocarSom() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
      audio.volume = 0.7;
      audio.play().catch(() => {
        console.log('⚠️ Som não reproduzido (navegador pode estar silencioso)');
      });
    } catch (erro) {
      console.log('⚠️ Erro ao reproduzir som:', erro);
    }
  }

  // ============================================
  // ABRIR MÓDULO DE LIGAÇÕES
  // ============================================
  abrirModuloLigacao(dados) {
    console.log('📞 Abrindo módulo de ligações:', dados);
    
    if (window.carregarModulo) {
      window.carregarModulo('AutoWhatsApp', 'agendar-ligacao', 'agendar-ligacoes.html');
    }
  }

  // ============================================
  // ABRIR MÓDULO DE PAGAMENTOS
  // ============================================
  abrirModuloPagamento(dados) {
    console.log('💰 Abrindo módulo de pagamentos:', dados);
    
    if (window.carregarModulo) {
      // Salvar cliente no sessionStorage
      const clientes = JSON.parse(localStorage.getItem('clientes.json') || '[]');
      const cliente = clientes.find(c => c.Nome === dados.nomeCliente);
      
      if (cliente) {
        sessionStorage.setItem('clienteSelecionado', JSON.stringify(cliente));
        localStorage.setItem('clienteSelecionado', JSON.stringify(cliente));
      }
      
      window.carregarModulo('Pagamentos', 'pagamentos', 'clientes.json');
    }
  }

  // ============================================
  // ADIAR LIGAÇÃO POR 15 MINUTOS
  // ============================================
  adiarLigacao(dados) {
    console.log('⏱️ Adiando ligação:', dados);
    
    const clientes = JSON.parse(localStorage.getItem('clientes.json') || '[]');
    const cliente = clientes.find(c => c.Nome === dados.dados.nomeCliente);
    
    if (cliente && cliente.AgendaLigacoes) {
      const novaData = new Date();
      novaData.setMinutes(novaData.getMinutes() + 15);
      
      const novoHorario = novaData.toTimeString().slice(0, 5);
      
      // Adicionar nova agenda adiada
      cliente.AgendaLigacoes.push({
        data: new Date().toISOString().split('T')[0],
        horario: novoHorario,
        Observacao: 'Adiado automaticamente (notificação)',
        status: 'Agendado'
      });
      
      // Atualizar localStorage
      const indice = clientes.findIndex(c => c.Nome === dados.dados.nomeCliente);
      if (indice !== -1) {
        clientes[indice] = cliente;
        localStorage.setItem('clientes.json', JSON.stringify(clientes));
        console.log('✅ Ligação adiada com sucesso');
      }
    }
  }

  // ============================================
  // BUSCAR ARQUIVO (simulado com localStorage)
  // ============================================
  async buscarArquivo(nomeArquivo) {
    try {
      if (nomeArquivo === 'clientes.json') {
        return JSON.parse(localStorage.getItem('clientes.json') || '[]');
      }
      return [];
    } catch (erro) {
      console.error('Erro ao buscar arquivo:', erro);
      return [];
    }
  }

  // ============================================
  // ADICIONAR AGENDA COM NOTIFICAÇÃO
  // ============================================
  adicionarAgenda(nomeCliente, dados) {
    try {
      const clientes = JSON.parse(localStorage.getItem('clientes.json') || '[]');
      const cliente = clientes.find(c => c.Nome === nomeCliente);

      if (cliente) {
        if (!cliente.AgendaLigacoes) {
          cliente.AgendaLigacoes = [];
        }

        cliente.AgendaLigacoes.push({
          data: dados.data,
          horario: dados.horario,
          Observacao: dados.observacao || '',
          status: 'Agendado'
        });

        const indice = clientes.findIndex(c => c.Nome === nomeCliente);
        clientes[indice] = cliente;
        localStorage.setItem('clientes.json', JSON.stringify(clientes));

        // Notificar que foi agendado
        this.enviarNotificacaoLocal('✅ Ligação Agendada', {
          body: `${nomeCliente} - ${dados.data} às ${dados.horario}`,
          tag: 'agenda-confirmada',
          tipo: 'info'
        });

        return true;
      }

      return false;
    } catch (erro) {
      console.error('Erro ao adicionar agenda:', erro);
      return false;
    }
  }
}

// ✅ INSTANCIAR GLOBALMENTE
const notificacoes = new GerenciadorNotificacoes();
