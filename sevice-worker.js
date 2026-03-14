// ============================================
// SERVICE WORKER - NOTIFICAÇÕES EM TEMPO REAL
// ============================================

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker ativado');
  self.clients.claim();
});

// ============================================
// RECEBER NOTIFICAÇÃO PUSH DO SERVIDOR
// ============================================
self.addEventListener('push', (event) => {
  const dados = event.data ? event.data.json() : {};
  
  const opcoes = {
    body: dados.body || 'Nova notificação',
    icon: 'assets/img/logo-bovi-premium.png',
    badge: 'assets/img/logo-bovi-premium.png',
    tag: dados.tag || 'notificacao-padrao',
    requireInteraction: dados.requerInteracao || false,
    data: dados.dados || {}
  };

  // Adicionar ações conforme o tipo
  if (dados.tipo === 'ligacao') {
    opcoes.actions = [
      { action: 'ligar', title: '📞 Ligar Agora' },
      { action: 'adiar', title: '⏱️ Adiar 15 min' },
      { action: 'fechar', title: '✖️ Fechar' }
    ];
  } else if (dados.tipo === 'pagamento') {
    opcoes.actions = [
      { action: 'abrir-pagamento', title: '💰 Ver Pagamentos' },
      { action: 'fechar', title: '✖️ Fechar' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo || 'Bovi Premium', opcoes)
  );
});

// ============================================
// AÇÕES AO CLICAR NA NOTIFICAÇÃO
// ============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const dados = event.notification.data;

  if (event.action === 'ligar' || (event.action === '' && event.notification.tag.includes('ligacao'))) {
    // Abrir módulo de agendamento de ligações
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (let client of clientList) {
          if (client.url.includes('index.html')) {
            client.focus();
            client.postMessage({
              tipo: 'abrir-ligacao',
              dados: dados
            });
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('index.html');
        }
      })
    );
  } else if (event.action === 'abrir-pagamento' || (event.action === '' && event.notification.tag.includes('pagamento'))) {
    // Abrir módulo de pagamentos do cliente
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (let client of clientList) {
          if (client.url.includes('index.html')) {
            client.focus();
            client.postMessage({
              tipo: 'abrir-pagamento',
              nomeCliente: dados.nomeCliente,
              cpf: dados.cpf
            });
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('index.html');
        }
      })
    );
  } else if (event.action === 'adiar') {
    // Adiar ligação por 15 minutos
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (let client of clientList) {
          client.postMessage({
            tipo: 'adiar-ligacao',
            dados: dados
          });
        }
      })
    );
  } else {
    // Clique padrão - abrir app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (let client of clientList) {
          if (client.url.includes('index.html')) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('index.html');
        }
      })
    );
  }
});

// ============================================
// RECEBER MENSAGENS DO FRONTEND
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'MOSTRAR_NOTIFICACAO') {
    self.registration.showNotification(event.data.titulo, event.data.opcoes);
  }
});
