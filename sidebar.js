// ============================================
// SIDEBAR GLOBAL - TODOS OS ARQUIVOS
// ============================================

const MODULOS_SIDEBAR = {
  "Clientes": { icone: "👥", tipo: "clientes" },
  "Insumos": { icone: "📦", tipo: "insumos" },
  "Transporte": { icone: "🚚", tipo: "transporte" },
  "Pagamentos": { icone: "💳", tipo: "pagamentos" },
  "Receitas": { icone: "📈", tipo: "receitas" },
  "Despesas": { icone: "💸", tipo: "despesas" },
  "Análise Vendedor": { icone: "📊", tipo: "analise-vendedor" },
  "AutoWhatsApp": { icone: "📞", tipo: "agendar-ligacao" },
  "Administrador": { icone: "⚙️", tipo: "administrador" },
  "Auditoria": { icone: "📋", tipo: "auditoria" }
};

// Renderizar sidebar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  renderizarSidebarGlobal();
});

// Função para renderizar sidebar
function renderizarSidebarGlobal() {
  // Verificar se já existe sidebar
  if (document.querySelector('.sidebar')) {
    return;
  }

  // Criar sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';

  // Começar com o ícone de home
  let sidebarHTML = `
    <div class="sidebar-item" onclick="window.location.href='index.html'" title="Ir para página inicial">
      🏠
      <div class="tooltip">Home</div>
    </div>
    <div class="sidebar-divider"></div>
  `;

  // Adicionar ícones de cada módulo
  Object.entries(MODULOS_SIDEBAR).forEach(([nome, dados]) => {
    sidebarHTML += `
      <div class="sidebar-item" onclick="irParaModulo('${nome}', '${dados.tipo}')" title="${nome}">
        ${dados.icone}
        <div class="tooltip">${nome}</div>
      </div>
    `;
  });

  // Adicionar divisor e ícone de logout
  sidebarHTML += `
    <div class="sidebar-divider"></div>
    <div class="sidebar-item" onclick="logout()" style="margin-top: auto;" title="Sair do sistema">
      🚪
      <div class="tooltip">Sair</div>
    </div>
  `;

  sidebar.innerHTML = sidebarHTML;
  document.body.prepend(sidebar);

  // Adicionar classe with-sidebar ao body ou container
  if (document.body.children.length > 1) {
    const container = document.querySelector('.container') || document.body.children[1];
    if (container) {
      container.classList.add('with-sidebar');
    }
  }
}

// Função para ir para um módulo
function irParaModulo(nome, tipo) {
  // Se for um módulo com arquivo específico
  const modulosComArquivo = {
    "Clientes": "clientes-detalhes.html",
    "Insumos": "pagamentos.html", 
    "Transporte": "transporte.html",
    "Pagamentos": "pagamentos.html",
    "Receitas": "receita.html",
    "Despesas": "despesas.html",
    "Análise Vendedor": "analise-vendedor.html",
    "AutoWhatsApp": "agendar-ligacoes.html",
    "Administrador": "usuarios-admin.html",
    "Auditoria": "auditoria.html"
  };

  const arquivo = modulosComArquivo[nome];
  if (arquivo) {
    window.location.href = arquivo;
  } else {
    window.location.href = `index.html?modulo=${encodeURIComponent(tipo)}`;
  }
}
