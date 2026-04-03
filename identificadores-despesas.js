// ============================================
// GERENCIADOR DE IDENTIFICADORES DE DESPESAS
// ============================================

let identificadores = [];

// ============================================
// CARREGAR IDENTIFICADORES DO SERVIDOR
// ============================================
async function carregarIdentificadores() {
  try {
    console.log('📥 Carregando identificadores...');
    const script = 'https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercontent';
    
    // Usar buscarArquivo que já está no projeto
    const dados = await buscarArquivo('identificadores-despesas.json');
    identificadores = Array.isArray(dados) ? dados : [];
    
    console.log('✅ Identificadores carregados:', identificadores.length);
    return identificadores;
  } catch (erro) {
    console.log('⚠️ Arquivo de identificadores não encontrado, criando novo...');
    identificadores = [];
    return [];
  }
}

// ============================================
// SALVAR IDENTIFICADORES
// ============================================
async function salvarIdentificadores() {
  try {
    const resultado = await salvarArquivo(
      'identificadores-despesas.json',
      JSON.stringify(identificadores, null, 2)
    );
    console.log('✅ Identificadores salvos');
    return resultado;
  } catch (erro) {
    console.error('❌ Erro ao salvar identificadores:', erro);
    return false;
  }
}

// ============================================
// ADICIONAR IDENTIFICADOR
// ============================================
function adicionarIdentificadorLocal(identificador, categoria) {
  if (!identificador || !categoria) {
    return {
      sucesso: false,
      erro: 'Identificador e categoria obrigatórios'
    };
  }
  
  // Verificar duplicação
  if (identificadores.some(id => 
    id.identificador.toLowerCase() === identificador.toLowerCase())) {
    return {
      sucesso: false,
      erro: 'Este identificador já existe'
    };
  }
  
  const novoId = {
    id: 'id_' + Date.now(),
    identificador: identificador.trim(),
    categoria: categoria,
    dataCriacao: new Date().toLocaleString('pt-BR')
  };
  
  identificadores.push(novoId);
  console.log('✅ Identificador adicionado:', identificador);
  
  return {
    sucesso: true,
    id: novoId.id
  };
}

// ============================================
// DELETAR IDENTIFICADOR
// ============================================
function deletarIdentificadorLocal(id) {
  const indice = identificadores.findIndex(i => i.id === id);
  if (indice === -1) {
    return { sucesso: false, erro: 'Não encontrado' };
  }
  
  identificadores.splice(indice, 1);
  console.log('✅ Identificador deletado');
  return { sucesso: true };
}

// ============================================
// APLICAR IDENTIFICADOR A DESCRIÇÃO
// ============================================
function aplicarIdentificadorADescricao(descricao) {
  if (!descricao) return '';
  
  for (const id of identificadores) {
    // Case-insensitive, procura pelo identificador em qualquer parte da descrição
    if (descricao.toLowerCase().includes(id.identificador.toLowerCase())) {
      console.log(`🏷️ Identificador encontrado: "${id.identificador}" → "${id.categoria}"`);
      return id.categoria;
    }
  }
  
  return '';
}

// ============================================
// OBTER LISTA DE IDENTIFICADORES PARA EXIBIR
// ============================================
function listarIdentificadores() {
  return identificadores.sort((a, b) => 
    a.identificador.localeCompare(b.identificador)
  );
}

// ============================================
// RENDERIZAR TABELA DE IDENTIFICADORES
// ============================================
function renderizarTabelaIdentificadores(containerId = 'tabelaIdentificadores') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (identificadores.length === 0) {
    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td colspan="3" style="text-align: center; padding: 20px; color: #8fb9ac;">
            📭 Nenhum identificador configurado
          </td>
        </tr>
      </table>
    `;
    return;
  }
  
  let html = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: rgba(31,163,122,.2); border-bottom: 2px solid rgba(31,163,122,.3);">
          <th style="padding: 12px; text-align: left; color: #7cf0c2; font-weight: 600;">Identificador</th>
          <th style="padding: 12px; text-align: left; color: #7cf0c2; font-weight: 600;">Categoria</th>
          <th style="padding: 12px; text-align: center; color: #7cf0c2; font-weight: 600;">Ação</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  identificadores.forEach(id => {
    html += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,.1);">
        <td style="padding: 12px; color: #e5f3ee; font-weight: 500;">
          "${id.identificador}"
        </td>
        <td style="padding: 12px; color: #7cf0c2; font-weight: 600;">
          🏷️ ${id.categoria}
        </td>
        <td style="padding: 12px; text-align: center;">
          <button onclick="deletarIdentificadorUI('${id.id}')" 
            style="background: rgba(244,67,54,.3); color: #ef5350; border: none; 
            padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
            🗑️ Deletar
          </button>
        </td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
}

// ============================================
// DELETAR IDENTIFICADOR E ATUALIZAR TELA
// ============================================
async function deletarIdentificadorUI(id) {
  if (!confirm('Tem certeza que deseja deletar este identificador?')) return;
  
  deletarIdentificadorLocal(id);
  await salvarIdentificadores();
  renderizarTabelaIdentificadores();
  
  console.log('✅ Identificador deletado e salvo');
}

// ============================================
// MOSTRAR MODAL DE ADICIONAR IDENTIFICADOR
// ============================================
function mostrarModalAdicionarIdentificador() {
  const modal = document.getElementById('modalAdicionarIdentificador');
  if (!modal) {
    console.error('❌ Modal não encontrado');
    return;
  }
  
  modal.classList.add('visible');
  document.getElementById('inputIdentificador').value = '';
  document.getElementById('selectCategoriaIdentificador').value = '';
  document.getElementById('inputIdentificador').focus();
}

// ============================================
// FECHAR MODAL
// ============================================
function fecharModalIdentificador() {
  const modal = document.getElementById('modalAdicionarIdentificador');
  if (modal) {
    modal.classList.remove('visible');
  }
}

// ============================================
// ADICIONAR IDENTIFICADOR E SALVAR
// ============================================
async function adicionarIdentificadorUI() {
  const identificador = document.getElementById('inputIdentificador').value.trim();
  const categoria = document.getElementById('selectCategoriaIdentificador').value;
  
  if (!identificador) {
    alert('⚠️ Digite o identificador');
    return;
  }
  
  if (!categoria) {
    alert('⚠️ Selecione uma categoria');
    return;
  }
  
  const resultado = adicionarIdentificadorLocal(identificador, categoria);
  
  if (!resultado.sucesso) {
    alert('❌ ' + resultado.erro);
    return;
  }
  
  await salvarIdentificadores();
  renderizarTabelaIdentificadores();
  fecharModalIdentificador();
  
  console.log('✅ Identificador adicionado e salvo');
}

// ============================================
// APLICAR CATEGORIA AUTOMATICAMENTE AO CARREGAR ARQUIVO
// ============================================
function aplicarCategoriaAutomaticaAoCarregar(despesas) {
  return despesas.map(d => {
    if (!d.Categoria || d.Categoria === '') {
      const categoriaAuto = aplicarIdentificadorADescricao(d.Descricao);
      if (categoriaAuto) {
        console.log(`✅ Auto-categoria: "${d.Descricao}" → "${categoriaAuto}"`);
        return {
          ...d,
          Categoria: categoriaAuto,
          CategoriaPronta: true // Flag para indicar que foi auto-preenchida
        };
      }
    }
    return d;
  });
}

// ============================================
// PERMITIR QUE USUÁRIO CONFIRME MUDANÇA DE CATEGORIA
// ============================================
function confirmarMudancaCategoria(descricao, categoriaAnterior, categoriaNova) {
  return confirm(
    `A categoria para "${descricao}" foi mudada?\n\n` +
    `Anterior: ${categoriaAnterior || 'Vazia'}\n` +
    `Nova: ${categoriaNova}\n\n` +
    `Deseja atualizar este identificador como padrão?`
  );
}
