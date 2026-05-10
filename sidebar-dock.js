// SIDEBAR DOCK - Hidden by default
// PC: appears on hover on left edge
// Mobile: appears on click
// Auto-hide after 10 seconds

const MODULOS_DOCK = [
  { nome: 'Início', permissao: null, icon: '🏠', url: 'index.html' },
  { nome: 'Clientes', permissao: 'Clientes', icon: '👥', url: 'clientes.html' },
  { nome: 'Insumos', permissao: 'Insumos', icon: '📦', url: 'insumos.html' },
  { nome: 'Transporte', permissao: 'Transporte', icon: '🚚', url: 'transporte.html' },
  { nome: 'Pagamentos', permissao: 'Pagamentos', icon: '💳', url: 'pagamentos.html' },
  { nome: 'Receitas', permissao: 'Receitas', icon: '📈', url: 'receita.html' },
  { nome: 'Despesas', permissao: 'Despesas', icon: '💸', url: 'despesas.html' },
  { nome: 'Relatório Completo', permissao: 'Relatório Completo', icon: '🧠', url: 'relatorio-completo.html' },
  { nome: 'AutoWhatsApp', permissao: 'AutoWhatsApp', icon: '📞', url: 'agendar-ligacoes.html' },
  { nome: 'Revisão Contatos', permissao: 'Revisão Contatos', icon: '📱', url: 'revisao-contatos.html' },
  { nome: 'Administrador', permissao: 'Administrador', icon: '⚙️', url: 'usuarios-admin.html' },
];

const MODULOS_COMPLETOS_DOCK = MODULOS_DOCK
  .map(m => m.permissao)
  .filter(Boolean);

let hideTimeout = null;
let isMobile = false;
let dock = null;

function obterModulosPermitidosDock() {
  try {
    if (typeof obterModulos === 'function') {
      return obterModulos();
    }
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
    if (!usuario) return [];
    const modulos = Array.isArray(usuario.modulos)
      ? usuario.modulos
      : (Array.isArray(usuario.ModulosPermitidos) ? usuario.ModulosPermitidos : []);
    if (modulos.includes('Administrador')) {
      return Array.from(new Set([...modulos, ...MODULOS_COMPLETOS_DOCK]));
    }
    return modulos;
  } catch {
    return [];
  }
}

function detectarMobile() {
  isMobile = window.innerWidth <= 768;
}

function renderizarSidebarDock() {
  detectarMobile();

  if (document.getElementById('sidebar-dock')) {
    console.log('✓ Sidebar dock já existe');
    return;
  }

  console.log('🔧 Criando sidebar dock...');

  const trigger = document.createElement('div');
  trigger.id = 'sidebar-trigger';
  trigger.className = 'sidebar-trigger';
  document.body.appendChild(trigger);

  dock = document.createElement('div');
  dock.id = 'sidebar-dock';
  dock.className = 'sidebar-dock';

  const permitidos = obterModulosPermitidosDock();
  const modulosVisiveis = MODULOS_DOCK.filter(m => !m.permissao || permitidos.includes(m.permissao));

  modulosVisiveis.forEach((modulo, index) => {
    if (index === 7) {
      const divider = document.createElement('div');
      divider.className = 'sidebar-dock-divider';
      dock.appendChild(divider);
    }

    const item = document.createElement('button');
    item.className = 'sidebar-dock-item';
    item.innerHTML = `
      <div class="dock-icon">${modulo.icon}</div>
      <div class="dock-label">${modulo.nome}</div>
      <div class="dock-tooltip">${modulo.nome}</div>
    `;
    item.onclick = () => irParaModuloDock(modulo.url);
    dock.appendChild(item);
  });

  document.body.appendChild(dock);
  console.log('✓ Sidebar dock criado com sucesso');

  dock.addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout);
    dock.classList.add('visible');
  });

  dock.addEventListener('mouseleave', () => {
    agendarOcultacao(dock);
  });

  if (isMobile) {
    document.addEventListener('click', (e) => {
      if (dock.contains(e.target)) {
        clearTimeout(hideTimeout);
        agendarOcultacao(dock);
        return;
      }
      dock.classList.add('visible');
      clearTimeout(hideTimeout);
      agendarOcultacao(dock);
    });
  }

  window.addEventListener('resize', () => {
    const eraMobile = isMobile;
    detectarMobile();
    if (eraMobile !== isMobile) {
      clearTimeout(hideTimeout);
      dock.classList.remove('visible');
    }
  });
}

function agendarOcultacao(elemento) {
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    elemento.classList.remove('visible');
  }, 10000);
}

function irParaModuloDock(url) {
  const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
  if (paginaAtual !== url) {
    window.location.href = url;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded - initializing sidebar dock');
    renderizarSidebarDock();
  });
} else {
  console.log('📄 DOM already loaded - initializing sidebar dock immediately');
  renderizarSidebarDock();
}

