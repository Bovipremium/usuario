
const DEVICE_ID = localStorage.getItem('deviceId');

console.log(`🔐 Device ID carregado: ${DEVICE_ID || '❌ NÃO AUTENTICADO'}`);

// Extensões permitidas por tipo
const EXTENSOES_PERMITIDAS = {
  'ANEXO': ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'],
  'NF': ['pdf', 'jpg', 'jpeg', 'png']
};

// Tamanho máximo de arquivo: 50MB
const TAMANHO_MAX_MB = 50;
const TAMANHO_MAX_BYTES = TAMANHO_MAX_MB * 1024 * 1024;

// ============================================
// ABRIR MODAL DE UPLOAD - ANEXO
// ============================================
function abrirUploadAnexo() {
  
  if (!DEVICE_ID) {
    alert('❌ ACESSO NEGADO\n\nVocê precisa autenticar com a palavra-chave antes de fazer upload.\n\nDigite a palavra-chave no menu de configurações.');
    console.error('🔐 Tentativa de upload SEM autenticação');
    return;
  }

  if (!clienteAtual) {
    alert('❌ Nenhum cliente selecionado');
    return;
  }

  if (!clienteAtual.CPF || !clienteAtual.Nome) {
    alert('⚠️ Cliente não possui CPF ou Nome. Edite os dados antes.');
    return;
  }

  console.log(`✅ Autenticação verificada. Device: ${DEVICE_ID}`);
  mostrarModalUpload('ANEXO');
}

// ============================================
// ABRIR MODAL DE UPLOAD - NOTA FISCAL
// ============================================
function abrirUploadNF() {
  // 🔐 VERIFICAR SE ESTÁ AUTENTICADO
  if (!DEVICE_ID) {
    alert('❌ ACESSO NEGADO\n\nVocê precisa autenticar com a palavra-chave antes de fazer upload.\n\nDigite a palavra-chave no menu de configurações.');
    console.error('🔐 Tentativa de upload SEM autenticação');
    return;
  }

  if (!clienteAtual) {
    alert('❌ Nenhum cliente selecionado');
    return;
  }

  if (!clienteAtual.CPF || !clienteAtual.Nome) {
    alert('⚠️ Cliente não possui CPF ou Nome. Edite os dados antes.');
    return;
  }

  console.log(`✅ Autenticação verificada. Device: ${DEVICE_ID}`);
  mostrarModalUpload('NF');
}

// ============================================
// MOSTRAR MODAL DE UPLOAD
// ============================================
function mostrarModalUpload(tipoDocumento) {
  fecharTodosModais();

  const modal = document.createElement('div');
  modal.className = 'modal-upload-docs';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9998;
    backdrop-filter: blur(8px);
  `;

  const conteudo = document.createElement('div');
  conteudo.style.cssText = `
    background: linear-gradient(180deg, rgba(14,31,26,1), rgba(5,11,9,1));
    border: 2px solid rgba(31,163,122,.5);
    border-radius: 20px;
    padding: 40px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 80px rgba(0,0,0,0.8), 0 0 30px rgba(31,163,122,0.2);
  `;

  const icone = tipoDocumento === 'NF' ? '📄' : '📎';
  const titulo = tipoDocumento === 'NF' ? 'Upload de Nota Fiscal' : 'Upload de Anexo';
  const extensoes = EXTENSOES_PERMITIDAS[tipoDocumento].join(', ').toUpperCase();

  conteudo.innerHTML = `
    <div style="margin-bottom: 25px;">
      <div style="font-size: 48px; margin-bottom: 15px; text-align: center;">${icone}</div>
      <h2 style="color: #1fa37a; margin-bottom: 12px; font-size: 22px; font-weight: 800; text-align: center;">${titulo}</h2>
      <p style="color: #8fb9ac; margin-bottom: 20px; font-size: 14px; line-height: 1.5; text-align: center;">
        Selecione um arquivo do seu computador para fazer upload.
      </p>
    </div>

    <!-- Info do Cliente -->
    <div style="background: rgba(31,163,122,.1); border: 1px solid rgba(31,163,122,.3); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
      <p style="color: #7cf0c2; font-size: 12px; margin: 0;"><strong>📋 Cliente:</strong> ${clienteAtual.Nome}</p>
      <p style="color: #7cf0c2; font-size: 12px; margin: 5px 0 0;">📌 <strong>CPF:</strong> ${clienteAtual.CPF}</p>
    </div>

    <!-- Seletor de Arquivo -->
    <div style="margin-bottom: 20px;">
      <input 
        type="file" 
        id="inputArquivoUpload" 
        style="display: none;" 
        accept="${getAceitedMimeTypes(tipoDocumento)}"
      />
      <button 
        id="btnSelecionarArquivo"
        style="
          width: 100%;
          padding: 20px;
          background: linear-gradient(145deg, rgba(31,163,122,.2), rgba(31,163,122,.1));
          border: 2px dashed rgba(31,163,122,.5);
          color: #7cf0c2;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
          text-align: center;
        "
        onclick="document.getElementById('inputArquivoUpload').click()"
        onmouseover="this.style.background='linear-gradient(145deg, rgba(31,163,122,.3), rgba(31,163,122,.2))'"
        onmouseout="this.style.background='linear-gradient(145deg, rgba(31,163,122,.2), rgba(31,163,122,.1))'"
      >
        📁 Clique para selecionar arquivo
      </button>
      <p style="color: #8fb9ac; font-size: 12px; margin-top: 8px; text-align: center;">
        Tipos aceitos: ${extensoes}<br>
        Tamanho máximo: ${TAMANHO_MAX_MB}MB
      </p>
    </div>

    <!-- Preview do Arquivo Selecionado -->
    <div id="previewArquivo" style="display: none; background: rgba(31,163,122,.05); border: 1px solid rgba(31,163,122,.3); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
      <p style="color: #8fb9ac; font-size: 12px; margin: 0 0 8px;">✅ Arquivo selecionado:</p>
      <p id="nomeArquivo" style="color: #7cf0c2; font-weight: 600; margin: 0; word-break: break-word; font-size: 14px;"></p>
      <p id="tamanhoArquivo" style="color: #8fb9ac; font-size: 12px; margin: 5px 0 0;"></p>
    </div>

    <!-- Barra de Progresso -->
    <div id="barraProgresso" style="display: none; background: rgba(31,163,122,.1); border: 1px solid rgba(31,163,122,.3); border-radius: 12px; padding: 12px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <p style="color: #8fb9ac; font-size: 12px; margin: 0;">📤 Enviando...</p>
        <p id="percentualProgresso" style="color: #7cf0c2; font-size: 12px; margin: 0; font-weight: 600;">0%</p>
      </div>
      <div style="background: rgba(0,0,0,.3); border-radius: 8px; height: 8px; overflow: hidden;">
        <div id="barraProgressoInterna" style="background: #1fa37a; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
      </div>
    </div>

    <!-- Botões -->
    <div style="display: flex; gap: 12px; flex-direction: column;">
      <button 
        id="btnEnviarArquivo" 
        class="btn" 
        style="padding: 16px; font-size: 15px; background: #1fa37a; color: white; cursor: pointer; opacity: 0.5;" 
        disabled
      >
        📤 Enviar Arquivo
      </button>
      <button 
        id="btnFecharModal"
        style="background: transparent; border: none; color: #8fb9ac; cursor: pointer; font-size: 13px; text-decoration: underline; margin-top: 5px;"
      >
        ✕ Cancelar
      </button>
    </div>
  `;

  modal.appendChild(conteudo);
  document.body.appendChild(modal);

  // Event Listeners
  const inputArquivo = document.getElementById('inputArquivoUpload');
  const btnEnviar = document.getElementById('btnEnviarArquivo');
  const btnFechar = document.getElementById('btnFecharModal');
  const btnSelecionar = document.getElementById('btnSelecionarArquivo');

  // Seleção de arquivo
  inputArquivo.addEventListener('change', function() {
    const arquivo = this.files[0];
    
    if (!arquivo) {
      document.getElementById('previewArquivo').style.display = 'none';
      btnEnviar.disabled = true;
      btnEnviar.style.opacity = '0.5';
      return;
    }

    // Validar arquivo
    const validacao = validarArquivoUpload(arquivo, tipoDocumento);
    
    if (!validacao.valido) {
      alert('❌ ' + validacao.erro);
      this.value = '';
      document.getElementById('previewArquivo').style.display = 'none';
      btnEnviar.disabled = true;
      btnEnviar.style.opacity = '0.5';
      return;
    }

    // Mostrar preview
    document.getElementById('nomeArquivo').textContent = arquivo.name;
    document.getElementById('tamanhoArquivo').textContent = `Tamanho: ${formatarTamanho(arquivo.size)}`;
    document.getElementById('previewArquivo').style.display = 'block';

    // Habilitar botão enviar
    btnEnviar.disabled = false;
    btnEnviar.style.opacity = '1';
  });

  // Enviar arquivo
  btnEnviar.addEventListener('click', async function() {
    const arquivo = inputArquivo.files[0];
    
    if (!arquivo) {
      alert('❌ Selecione um arquivo');
      return;
    }

    // Desabilitar botão e mostrar progresso
    btnEnviar.disabled = true;
    btnSelecionar.disabled = true;
    document.getElementById('barraProgresso').style.display = 'block';

    try {
      await enviarDocumentoParaDrive(arquivo, tipoDocumento, modal);
    } catch (erro) {
      console.error('Erro:', erro);
      alert('❌ Erro ao enviar: ' + erro.message);
      
      // Re-habilitar
      btnEnviar.disabled = false;
      btnSelecionar.disabled = false;
      document.getElementById('barraProgresso').style.display = 'none';
    }
  });

  // Fechar modal
  btnFechar.addEventListener('click', function() {
    modal.remove();
  });

  // Focar no botão selecionar
  setTimeout(() => btnSelecionar.focus(), 100);
}

// ============================================
// VALIDAR ARQUIVO ANTES DE ENVIAR
// ============================================
function validarArquivoUpload(arquivo, tipoDocumento) {
  // Validar tamanho
  if (arquivo.size > TAMANHO_MAX_BYTES) {
    return {
      valido: false,
      erro: `Arquivo muito grande. Máximo: ${TAMANHO_MAX_MB}MB`
    };
  }

  // Validar extensão
  const extensao = arquivo.name.split('.').pop().toLowerCase();
  const extensoesPermitidas = EXTENSOES_PERMITIDAS[tipoDocumento];

  if (!extensoesPermitidas.includes(extensao)) {
    return {
      valido: false,
      erro: `Extensão não permitida. Aceitos: ${extensoesPermitidas.join(', ')}`
    };
  }

  // Validar arquivo não vazio
  if (arquivo.size === 0) {
    return {
      valido: false,
      erro: 'Arquivo vazio'
    };
  }

  return { valido: true };
}

// ============================================
// ENVIAR DOCUMENTO PARA GOOGLE DRIVE
// ============================================
async function enviarDocumentoParaDrive(arquivo, tipoDocumento, modal) {
  try {
    console.log(`📤 Iniciando upload de ${tipoDocumento}...`);
    
    // 🔐 VERIFICAR AUTENTICAÇÃO
    if (!DEVICE_ID) {
      throw new Error('❌ ACESSO NEGADO: Não autenticado. Você precisa digitar a palavra-chave primeiro.');
    }
    console.log(`🔐 Enviando com Device ID: ${DEVICE_ID}`);
    
    // Validações
    if (!clienteAtual || !clienteAtual.CPF || !clienteAtual.Nome) {
      throw new Error('Dados do cliente incompletos');
    }

    // Converter arquivo para base64
    const base64 = await fileToBase64(arquivo);
    console.log(`✅ Arquivo convertido. Tamanho: ${formatarTamanho(base64.length)}`);

    // Preparar payload COM DEVICE_ID
    const payload = {
      deviceId: DEVICE_ID,  // 🔐 SEGURANÇA: Validação no backend
      clientName: clienteAtual.Nome,
      clientCPF: clienteAtual.CPF,
      documentType: tipoDocumento,
      fileName: arquivo.name,
      fileBase64: base64,
      fileSize: arquivo.size,
      fileMimeType: arquivo.type,
      timestamp: new Date().toISOString()
    };

    console.log(`📡 Enviando payload COM deviceId: ${DEVICE_ID}`);

    // Enviar para Google Apps Script
    if (!CONFIG || !CONFIG.API_URL) {
      throw new Error('CONFIG.API_URL não configurada');
    }

    const response = await AuthManager.requisicaoSegura(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Erro na resposta: ${response.status}`);
    }

    const resultado = await response.json();
    console.log('✅ Resposta do servidor:', resultado);

    if (resultado.status === 'success' || resultado.sucesso) {
      console.log('🎉 Upload realizado com sucesso!');
      
      // Mostrar mensagem de sucesso
      mostrarMensagemSucesso(resultado, tipoDocumento, modal);
      
      return true;
    } else {
      throw new Error(resultado.message || resultado.erro || 'Erro desconhecido');
    }

  } catch (erro) {
    console.error('❌ Erro ao enviar:', erro);
    throw erro;
  }
}

// ============================================
// CONVERTER ARQUIVO PARA BASE64
// ============================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      // Remover o prefixo 'data:application/pdf;base64,' etc
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsDataURL(file);
  });
}

// ============================================
// FORMATAR TAMANHO DE ARQUIVO
// ============================================
function formatarTamanho(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================
// OBTER TIPOS MIME ACEITOS
// ============================================
function getAceitedMimeTypes(tipoDocumento) {
  const mimeTypes = {
    'ANEXO': '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx',
    'NF': '.pdf,.jpg,.jpeg,.png'
  };
  return mimeTypes[tipoDocumento] || '*';
}

// ============================================
// MOSTRAR MENSAGEM DE SUCESSO
// ============================================
function mostrarMensagemSucesso(resultado, tipoDocumento, modalAnterior) {
  // Fechar modal anterior
  if (modalAnterior) {
    modalAnterior.remove();
  }

  // Criar novo modal de sucesso
  const modalSucesso = document.createElement('div');
  modalSucesso.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    backdrop-filter: blur(8px);
  `;

  const icone = tipoDocumento === 'NF' ? '📄' : '📎';
  const titulo = `${tipoDocumento} Enviado com Sucesso!`;

  const conteudo = document.createElement('div');
  conteudo.style.cssText = `
    background: linear-gradient(180deg, rgba(14,31,26,1), rgba(5,11,9,1));
    border: 2px solid rgba(16, 185, 129,.5);
    border-radius: 20px;
    padding: 40px;
    max-width: 450px;
    width: 90%;
    text-align: center;
    box-shadow: 0 20px 80px rgba(0,0,0,0.8), 0 0 30px rgba(16, 185, 129,0.2);
  `;

  conteudo.innerHTML = `
    <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
    <h2 style="color: #10b981; margin-bottom: 15px; font-size: 24px; font-weight: 800;">${titulo}</h2>
    <p style="color: #8fb9ac; margin-bottom: 15px; font-size: 14px; line-height: 1.5;">
      O arquivo foi salvo com sucesso no Google Drive.
    </p>
    
    <div style="background: rgba(16, 185, 129,.1); border: 1px solid rgba(16, 185, 129,.3); border-radius: 12px; padding: 15px; margin-bottom: 25px; text-align: left;">
      <p style="color: #7cf0c2; font-size: 12px; margin: 5px 0;"><strong>📌 Cliente:</strong> ${clienteAtual.Nome}</p>
      <p style="color: #7cf0c2; font-size: 12px; margin: 5px 0;"><strong>📄 Tipo:</strong> ${tipoDocumento}</p>
      <p style="color: #7cf0c2; font-size: 12px; margin: 5px 0;"><strong>📅 Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      ${resultado.pastaId ? `<p style="color: #7cf0c2; font-size: 12px; margin: 5px 0;"><strong>📁 Pasta:</strong> ${resultado.pastaNome || 'Criada'}</p>` : ''}
    </div>

    <button 
      id="btnFecharSucesso"
      style="
        width: 100%;
        background: #10b981;
        color: white;
        border: none;
        padding: 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 15px;
        font-weight: 600;
        transition: all 0.3s;
      "
      onmouseover="this.style.background='#059669'"
      onmouseout="this.style.background='#10b981'"
    >
      ✅ OK
    </button>
  `;

  modalSucesso.appendChild(conteudo);
  document.body.appendChild(modalSucesso);

  document.getElementById('btnFecharSucesso').addEventListener('click', function() {
    modalSucesso.remove();
  });
}

// ============================================
// CARREGAR E EXIBIR ARQUIVOS ANEXADOS
// ============================================
function carregarArquivosAnexados(tipo = 'ANEXO') {
  // 🔐 VERIFICAR AUTENTICAÇÃO
  if (!DEVICE_ID) {
    console.error('🔐 Tentativa de listar arquivos SEM autenticação');
    const containerId = tipo === 'NF' ? 'arquivosNFContainer' : 'arquivosAnexoContainer';
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '<p class="empty-message">❌ Não autenticado. Autentique com a palavra-chave para ver arquivos.</p>';
    }
    return;
  }

  if (!clienteAtual || !clienteAtual.CPF || !clienteAtual.Nome) {
    console.log('⚠️ Cliente sem dados suficientes');
    return;
  }

  console.log(`📂 Carregando arquivos ${tipo} para ${clienteAtual.Nome}...`);
  console.log(`📂 CPF: "${clienteAtual.CPF}"`);
  console.log(`📂 Nome: "${clienteAtual.Nome}"`);
  console.log(`🔐 Device ID: ${DEVICE_ID}`);

  const payload = {
    deviceId: DEVICE_ID,  // 🔐 SEGURANÇA: Validação no backend
    action: 'listarArquivosCliente',
    cpf: clienteAtual.CPF,
    nome: clienteAtual.Nome,
    tipo: tipo
  };

  console.log(`📤 Enviando payload COM deviceId: ${DEVICE_ID}`);

  AuthManager.requisicaoSegura(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
    .then(response => {
      console.log(`✅ Status da resposta: ${response.status}`);
      return response.json();
    })
    .then(dados => {
      console.log(`✅ Resposta de arquivos (${tipo}):`, dados);
      
      // Log adicional para debug
      if (dados.debug) {
        console.log(`📂 [DEBUG Backend] Pasta procurada: ${dados.debug.pastaProcurada}`);
        if (dados.debug.pastasEncontradas) {
          console.log(`📂 [DEBUG Backend] Pastas encontradas:`, dados.debug.pastasEncontradas);
        }
        if (dados.debug.pastaClienteNome) {
          console.log(`📂 [DEBUG Backend] Pasta do cliente (encontrada): ${dados.debug.pastaClienteNome}`);
        }
      }
      
      // Validar dados recebidos
      if (!dados.arquivos) {
        console.log(`⚠️ Dados sem campo 'arquivos', criando array vazio`);
        dados.arquivos = [];
      }
      
      console.log(`📂 Total de arquivos (${tipo}): ${dados.total || dados.arquivos.length}`);
      exibirListaArquivos(dados, tipo);
    })
    .catch(erro => {
      console.error(`❌ Erro ao carregar arquivos (${tipo}):`, erro);
      console.error(erro.stack);
      exibirListaArquivos({ status: 'error', arquivos: [], message: erro.message }, tipo);
    });
}

// ============================================
// EXIBIR LISTA DE ARQUIVOS ANEXADOS
// ============================================
function exibirListaArquivos(dados, tipo) {
  const containerId = tipo === 'NF' ? 'arquivosNFContainer' : 'arquivosAnexoContainer';
  const container = document.getElementById(containerId);

  if (!container) {
    console.log(`⚠️ Container ${containerId} não encontrado`);
    return;
  }

  // Limpar container
  container.innerHTML = '';

  // Se erro ou sem arquivos
  if (!dados.arquivos || dados.arquivos.length === 0) {
    container.innerHTML = `
      <div style="
        padding: 20px;
        text-align: center;
        color: #8fb9ac;
        font-size: 14px;
        background: rgba(31, 163, 122, 0.05);
        border: 1px solid rgba(31, 163, 122, 0.2);
        border-radius: 8px;
      ">
        <p>📭 Nenhum arquivo ${tipo === 'NF' ? 'de Nota Fiscal' : 'anexado'} ainda</p>
      </div>
    `;
    return;
  }

  // Criar lista de arquivos
  const lista = document.createElement('div');
  lista.style.cssText = 'display: grid; gap: 12px;';

  dados.arquivos.forEach((arquivo, index) => {
    const itemArquivo = document.createElement('div');
    itemArquivo.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(31, 163, 122, 0.05);
      border: 1px solid rgba(31, 163, 122, 0.2);
      border-radius: 8px;
      transition: all 0.3s;
    `;

    itemArquivo.onmouseover = () => {
      itemArquivo.style.background = 'rgba(31, 163, 122, 0.1)';
      itemArquivo.style.borderColor = 'rgba(31, 163, 122, 0.4)';
    };

    itemArquivo.onmouseout = () => {
      itemArquivo.style.background = 'rgba(31, 163, 122, 0.05)';
      itemArquivo.style.borderColor = 'rgba(31, 163, 122, 0.2)';
    };

    // Determinar ícone
    let icone = '📄';
    const nomeMinusculo = arquivo.nome.toLowerCase();
    if (nomeMinusculo.includes('.jpg') || nomeMinusculo.includes('.jpeg') || nomeMinusculo.includes('.png')) {
      icone = '🖼️';
    } else if (nomeMinusculo.includes('.pdf')) {
      icone = '📕';
    } else if (nomeMinusculo.includes('.doc') || nomeMinusculo.includes('.docx')) {
      icone = '📝';
    } else if (nomeMinusculo.includes('.xls') || nomeMinusculo.includes('.xlsx')) {
      icone = '📊';
    }

    const infoArquivo = document.createElement('div');
    infoArquivo.style.cssText = 'flex: 1; min-width: 0;';
    infoArquivo.innerHTML = `
      <div style="color: #1fa37a; font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">
        ${icone} ${arquivo.nome}
      </div>
      <div style="color: #8fb9ac; font-size: 12px;">
        ${arquivo.tamanho} • ${arquivo.dataCriacao}
      </div>
    `;

    const botoesAcao = document.createElement('div');
    botoesAcao.style.cssText = 'display: flex; gap: 8px; flex-shrink: 0;';

    // Botão Abrir
    const btnAbrir = document.createElement('button');
    btnAbrir.innerHTML = '👁️';
    btnAbrir.style.cssText = `
      background: rgba(31, 163, 122, 0.3);
      border: 1px solid rgba(31, 163, 122, 0.5);
      color: #1fa37a;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.3s;
    `;
    btnAbrir.title = 'Visualizar/Abrir arquivo';

    btnAbrir.onmouseover = () => {
      btnAbrir.style.background = 'rgba(31, 163, 122, 0.5)';
    };
    btnAbrir.onmouseout = () => {
      btnAbrir.style.background = 'rgba(31, 163, 122, 0.3)';
    };

    btnAbrir.onclick = () => {
      const isImage = arquivo.mimeType && (arquivo.mimeType.includes('image') || 
                     arquivo.nome.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/i));
      
      if (isImage) {
        // Abrir imagem no navegador
        window.open(arquivo.previewUrl, '_blank');
      } else {
        // Baixar arquivo
        window.open(arquivo.url, '_blank');
      }
    };

    // Botão Baixar
    const btnBaixar = document.createElement('button');
    btnBaixar.innerHTML = '⬇️';
    btnBaixar.style.cssText = `
      background: rgba(200, 150, 100, 0.3);
      border: 1px solid rgba(200, 150, 100, 0.5);
      color: #d97706;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.3s;
    `;
    btnBaixar.title = 'Baixar arquivo';

    btnBaixar.onmouseover = () => {
      btnBaixar.style.background = 'rgba(200, 150, 100, 0.5)';
    };
    btnBaixar.onmouseout = () => {
      btnBaixar.style.background = 'rgba(200, 150, 100, 0.3)';
    };

    btnBaixar.onclick = () => {
      window.open(arquivo.url, '_blank');
    };

    botoesAcao.appendChild(btnAbrir);
    botoesAcao.appendChild(btnBaixar);

    itemArquivo.appendChild(infoArquivo);
    itemArquivo.appendChild(botoesAcao);

    lista.appendChild(itemArquivo);
  });

  container.appendChild(lista);
}

// ============================================
// FECHAR TODOS OS MODAIS
// ============================================
function fecharTodosModais() {
  const modais = document.querySelectorAll('.modal-upload-docs');
  modais.forEach(modal => modal.remove());
}
