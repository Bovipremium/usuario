// SIDEBAR DOCK - Hidden by default
// PC: appears on hover on left edge
// Mobile: appears on click
// Auto-hide after 10 seconds

const MODULOS_DOCK = [
  { nome: 'Clientes', tipo: 'modulos', icon: '👥', url: 'index.html' },
  { nome: 'Insumos', tipo: 'modulos', icon: '📦', url: 'index.html' },
  { nome: 'Transporte', tipo: 'modulos', icon: '🚚', url: 'index.html' },
  { nome: 'Pagamentos', tipo: 'modulos', icon: '💳', url: 'index.html' },
  { nome: 'Receitas', tipo: 'modulos', icon: '📈', url: 'index.html' },
  { nome: 'Despesas', tipo: 'modulos', icon: '💸', url: 'index.html' },
  { nome: 'Análise', tipo: 'modulos', icon: '📊', url: 'analise-vendedor.html' },
  { nome: 'WhatsApp', tipo: 'modulos', icon: '📞', url: 'agendar-ligacoes.html' },
  { nome: 'Admin', tipo: 'modulos', icon: '⚙️', url: 'usuarios-admin.html' },
  { nome: 'Auditoria', tipo: 'modulos', icon: '📋', url: 'auditoria.html' },
];

let hideTimeout = null;
let isMobile = false;
let dock = null;

// Detect if mobile
function detectMobile() {
  isMobile = window.innerWidth <= 768;
}

// Initialize dock sidebar
function renderizarSidebarDock() {
  detectMobile();

  // Check if already exists
  if (document.getElementById('sidebar-dock')) {
    console.log('✓ Sidebar dock já existe');
    return;
  }

  console.log('🔧 Criando sidebar dock...');

  // Create trigger zone first (before dock so CSS sibling selector works)
  const trigger = document.createElement('div');
  trigger.id = 'sidebar-trigger';
  trigger.className = 'sidebar-trigger';
  document.body.appendChild(trigger);

  // Create dock container
  dock = document.createElement('div');
  dock.id = 'sidebar-dock';
  dock.className = 'sidebar-dock';

  // Add modules to dock
  MODULOS_DOCK.forEach((modulo, index) => {
    if (index === 6) {
      // Add divider before Análise
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
    item.onclick = () => irParaModuloDock(modulo.nome, modulo.tipo, modulo.url);
    dock.appendChild(item);
  });

  document.body.appendChild(dock);

  console.log('✓ Sidebar dock criado com sucesso');

  // Desktop: Show on hover
  dock.addEventListener('mouseenter', () => {
    console.log('🖱️ Mouse entering dock');
    clearTimeout(hideTimeout);
    dock.classList.add('visible');
  });

  // Desktop: Hide after mouse leave (auto-hide after 10s)
  dock.addEventListener('mouseleave', () => {
    console.log('🖱️ Mouse leaving dock');
    scheduleHide(dock);
  });

  // Mobile: Show on click anywhere
  if (isMobile) {
    console.log('📱 Mobile device detected - using click trigger');
    document.addEventListener('click', (e) => {
      // Don't trigger if clicking the dock itself
      if (dock.contains(e.target)) {
        clearTimeout(hideTimeout);
        scheduleHide(dock);
        return;
      }
      
      console.log('📱 Mobile tap detected');
      dock.classList.add('visible');
      clearTimeout(hideTimeout);
      scheduleHide(dock);
    });
  } else {
    console.log('🖥️ Desktop device detected - using hover trigger');
  }

  // Listen for window resize to detect orientation change
  window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    detectMobile();
    
    if (wasMobile !== isMobile) {
      console.log('📐 Orientation changed');
      clearTimeout(hideTimeout);
      dock.classList.remove('visible');
    }
  });
}

// Schedule hide after timeout (IMMEDIATE - no delay)
function scheduleHide(dockElement) {
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    console.log('⏱️ Auto-hiding sidebar');
    dockElement.classList.remove('visible');
  }, 100); // 100ms - return immediately
}

// Navigate to module
function irParaModuloDock(nome, tipo, url) {
  console.log(`🔗 Navigating to module: ${nome}`);
  
  if (tipo === 'modulos') {
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
    
    // Check if need to navigate to different page
    if (!paginaAtual.includes(url.replace('.html', ''))) {
      console.log(`📄 Navigating to: ${url}`);
      window.location.href = url;
      return;
    }

    // On same page, call module loading function
    if (typeof carregarModulo === 'function') {
      console.log(`📦 Loading module on same page: ${nome}`);
      carregarModulo(nome, tipo);
    } else {
      console.log(`⚠️ carregarModulo function not found, trying to navigate to module`);
      // If carregarModulo doesn't exist, navigate to index.html
      if (paginaAtual !== 'index.html') {
        window.location.href = url;
      }
    }
  }
}

// Auto-render on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded - initializing sidebar dock');
    renderizarSidebarDock();
  });
} else {
  // Already loaded
  console.log('📄 DOM already loaded - initializing sidebar dock immediately');
  renderizarSidebarDock();
}
