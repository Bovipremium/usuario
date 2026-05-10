(function () {
  if (window.__MODAIS_GLOBAIS_SITE__) return;
  window.__MODAIS_GLOBAIS_SITE__ = true;

  const style = document.createElement('style');
  style.id = 'modais-globais-style';
  style.textContent = `
    .mg-overlay{
      position:fixed; inset:0; background:rgba(0,0,0,.58); backdrop-filter:blur(6px);
      display:flex; align-items:center; justify-content:center; z-index:999999; padding:16px;
    }
    .mg-modal{
      width:min(540px,calc(100vw - 24px));
      background:linear-gradient(180deg,rgba(22,35,33,.985),rgba(11,18,17,.99));
      border:1px solid rgba(90,220,180,.22); border-radius:18px; color:#ecfaf4;
      font-family:Arial,sans-serif; box-shadow:0 18px 56px rgba(0,0,0,.5); overflow:hidden;
    }
    .mg-head{
      display:flex; justify-content:space-between; align-items:center;
      padding:16px 18px 12px; border-bottom:1px solid rgba(90,220,180,.12);
    }
    .mg-title{font-size:22px; font-weight:800; color:#54d9af;}
    .mg-close{background:none; border:none; color:#9acdbd; font-size:28px; cursor:pointer;}
    .mg-body{padding:16px 18px 10px; white-space:pre-line; line-height:1.5;}
    .mg-input,.mg-textarea{
      width:100%; box-sizing:border-box; margin-top:12px; padding:12px 14px;
      border-radius:12px; border:1px solid rgba(215,181,158,.45);
      background:rgba(255,255,255,.04); color:#fff; font-size:16px; outline:none;
    }
    .mg-textarea{min-height:90px; resize:vertical;}
    .mg-input:focus,.mg-textarea:focus{
      border-color:#d7b59e; box-shadow:0 0 0 3px rgba(215,181,158,.16);
    }
    .mg-foot{padding:14px 18px 18px; display:flex; justify-content:flex-end; gap:10px;}
    .mg-btn{
      border:none; border-radius:12px; padding:11px 18px; font-weight:700;
      font-size:15px; cursor:pointer; min-width:110px;
    }
    .mg-btn-cancel{background:rgba(255,255,255,.10); color:#fff;}
    .mg-btn-ok{background:linear-gradient(135deg,#d2b197,#e0c1aa); color:#1d1917;}
    .mg-choice{display:grid; gap:10px; margin-top:12px;}
    .mg-choice-btn{
      width:100%; text-align:left; padding:12px 14px; border-radius:12px;
      border:1px solid rgba(90,220,180,.16); background:rgba(255,255,255,.03);
      color:#fff; cursor:pointer;
    }
    .mg-choice-btn:hover{background:rgba(90,220,180,.10); border-color:rgba(90,220,180,.30);}
  `;
  document.head.appendChild(style);

  function parseMoney(raw) {
    const limpo = String(raw || '')
      .replace(/R\$/gi, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '');
    const n = parseFloat(limpo);
    return isNaN(n) ? 0 : n;
  }

  function moneyMask(valor) {
    const digits = String(valor || '').replace(/\D/g, '');
    const numero = (parseInt(digits || '0', 10) / 100);
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function moneyFromDefault(valor) {
    const n = parseMoney(valor);
    return n
      ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '';
  }

  function criarBaseModal({ title = 'Janela do sistema', message = '' } = {}) {
    let resolver;

    const promise = new Promise((resolve) => {
      resolver = resolve;
    });

    const overlay = document.createElement('div');
    overlay.className = 'mg-overlay';
    overlay.innerHTML = `
      <div class="mg-modal" role="dialog" aria-modal="true">
        <div class="mg-head">
          <div class="mg-title"></div>
          <button class="mg-close" aria-label="Fechar">×</button>
        </div>
        <div class="mg-body">
          <div class="mg-msg"></div>
        </div>
        <div class="mg-foot"></div>
      </div>
    `;

    overlay.querySelector('.mg-title').textContent = title;
    overlay.querySelector('.mg-msg').textContent = String(message || '');

    function finalizar(resultado) {
      overlay.remove();
      resolver(resultado);
    }

    overlay.querySelector('.mg-close').addEventListener('click', () => finalizar(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finalizar(null);
    });

    (document.body || document.documentElement).appendChild(overlay);

    return { overlay, finalizar, promise };
  }

  async function alertModal(message, opts = {}) {
    const { overlay, finalizar, promise } = criarBaseModal({
      title: opts.title || 'Aviso do sistema',
      message
    });

    const ok = document.createElement('button');
    ok.className = 'mg-btn mg-btn-ok';
    ok.textContent = opts.okText || 'OK';
    ok.addEventListener('click', () => finalizar(true));

    overlay.querySelector('.mg-foot').appendChild(ok);
    setTimeout(() => ok.focus(), 20);

    return promise;
  }

  async function confirmModal(message, opts = {}) {
    const { overlay, finalizar, promise } = criarBaseModal({
      title: opts.title || 'Confirmação',
      message
    });

    const foot = overlay.querySelector('.mg-foot');

    const cancelar = document.createElement('button');
    cancelar.className = 'mg-btn mg-btn-cancel';
    cancelar.textContent = opts.cancelText || 'Cancelar';
    cancelar.addEventListener('click', () => finalizar(false));

    const ok = document.createElement('button');
    ok.className = 'mg-btn mg-btn-ok';
    ok.textContent = opts.okText || 'Confirmar';
    ok.addEventListener('click', () => finalizar(true));

    foot.append(cancelar, ok);
    setTimeout(() => ok.focus(), 20);

    return promise;
  }

  async function promptModal(opts = {}) {
    const { overlay, finalizar, promise } = criarBaseModal({
      title: opts.title || 'Preencher campo',
      message: opts.message || ''
    });

    const body = overlay.querySelector('.mg-body');
    const foot = overlay.querySelector('.mg-foot');

    let campo;

    if (opts.type === 'textarea') {
      campo = document.createElement('textarea');
      campo.className = 'mg-textarea';
    } else {
      campo = document.createElement('input');
      campo.className = 'mg-input';
      campo.type = opts.type === 'password'
        ? 'password'
        : (opts.type === 'date' ? 'date' : 'text');
    }

    if (opts.placeholder) campo.placeholder = opts.placeholder;
    if (opts.defaultValue != null) campo.value = String(opts.defaultValue);

    if (opts.type === 'money') {
      campo.type = 'text';
      campo.inputMode = 'numeric';
      campo.value = moneyFromDefault(opts.defaultValue || '');
      campo.addEventListener('input', () => {
        campo.value = moneyMask(campo.value);
      });
    }

    body.appendChild(campo);

    const cancelar = document.createElement('button');
    cancelar.className = 'mg-btn mg-btn-cancel';
    cancelar.textContent = opts.cancelText || 'Cancelar';
    cancelar.addEventListener('click', () => finalizar(null));

    const ok = document.createElement('button');
    ok.className = 'mg-btn mg-btn-ok';
    ok.textContent = opts.okText || 'OK';
    ok.addEventListener('click', () => finalizar(campo.value));

    foot.append(cancelar, ok);

    setTimeout(() => {
      campo.focus();
      if (campo.select) campo.select();
    }, 20);

    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && opts.type !== 'textarea') {
        e.preventDefault();
        ok.click();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelar.click();
      }
    });

    return promise;
  }

  async function chooseModal(opts = {}) {
    const { overlay, finalizar, promise } = criarBaseModal({
      title: opts.title || 'Escolha uma opção',
      message: opts.message || ''
    });

    const body = overlay.querySelector('.mg-body');
    const foot = overlay.querySelector('.mg-foot');

    const wrap = document.createElement('div');
    wrap.className = 'mg-choice';

    (opts.options || []).forEach((opcao) => {
      const botao = document.createElement('button');
      botao.className = 'mg-choice-btn';
      botao.textContent = opcao.label;
      botao.addEventListener('click', () => finalizar(opcao.value));
      wrap.appendChild(botao);
    });

    body.appendChild(wrap);

    const cancelar = document.createElement('button');
    cancelar.className = 'mg-btn mg-btn-cancel';
    cancelar.textContent = opts.cancelText || 'Cancelar';
    cancelar.addEventListener('click', () => finalizar(null));
    foot.appendChild(cancelar);

    return promise;
  }

  window.modalAlert = alertModal;
  window.modalConfirm = confirmModal;
  window.modalPromptMoeda = (message, defaultValue = '', title = 'Informar valor') =>
    promptModal({ title, message, defaultValue, type: 'money' });
  window.modalPromptTexto = (message, defaultValue = '', title = 'Preencher campo') =>
    promptModal({ title, message, defaultValue, type: 'text' });
  window.modalPromptSenha = (message, defaultValue = '', title = 'Confirmação de segurança') =>
    promptModal({ title, message, defaultValue, type: 'password' });
  window.modalPromptData = (message, defaultValue = '', title = 'Escolher data') =>
    promptModal({ title, message, defaultValue, type: 'date' });
  window.modalPromptObservacao = (message, defaultValue = '', title = 'Observação') =>
    promptModal({ title, message, defaultValue, type: 'textarea' });
  window.modalEscolherOpcao = (title, message, options) =>
    chooseModal({ title, message, options });

  window.__nativeAlert = window.alert.bind(window);
  window.alert = function (message) {
    alertModal(message, { title: 'Aviso do sistema' });
  };
})();
