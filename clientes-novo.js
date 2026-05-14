// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Inicializando página de novo cliente...");
  
  // Carregar lista de vendedores
  await carregarVendedores();
  
  // Adicionar listener ao form
  document.getElementById('formCliente').addEventListener('submit', handleFormSubmit);
  
  // Máscaras
  aplicarMascaras();
});

// ===== CARREGAR VENDEDORES (MESMA FORMA DO usuarios-admin.js) =====
async function carregarVendedores() {
  try {
    console.log("📥 Buscando vendedores em usuarios.json (via API)...");
    
    // Obter device ID do localStorage (mesmo que usuarios-admin.js faz)
    const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
    
    // Fazer requisição IGUAL ao usuarios-admin.js
    const response = await fetch(
      `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.USUARIOS}&deviceId=${deviceId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let dados = await response.json();
    console.log("📥 Resposta bruta da API:", dados);

    // Se for string, tenta parsear (pode vir assim do backend)
    if (typeof dados === 'string') {
      try {
        dados = JSON.parse(dados);
      } catch (e) {
        dados = [];
      }
    }

    // Converter para array se necessário
    const usuariosList = Array.isArray(dados) ? dados : [];
    
    console.log(`📊 ${usuariosList.length} usuário(s) encontrado(s) em usuarios.json`);
    console.log("📥 Lista de usuários:", usuariosList);
    
    // Extrair apenas os nomes dos usuários
    const vendedores = usuariosList
      .filter(u => u && u.Nome && u.Nome.trim())
      .map(u => u.Nome)
      .sort();
    
    console.log(`✅ Vendedores extraídos:`, vendedores);
    
    // Preencher select
    const selectVendedor = document.getElementById('vendedor');
    selectVendedor.innerHTML = '<option value="">-- Selecione um vendedor --</option>';
    
    if (vendedores.length === 0) {
      console.warn("⚠️ Nenhum usuário encontrado em usuarios.json");
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '(Nenhum usuário cadastrado)';
      selectVendedor.appendChild(option);
      selectVendedor.disabled = true;
      return;
    }
    
    // Adicionar opções ao select
    vendedores.forEach(vendedor => {
      const option = document.createElement('option');
      option.value = vendedor;
      option.textContent = vendedor;
      selectVendedor.appendChild(option);
    });
    
    // 🎯 PRÉ-SELECIONAR USUÁRIO LOGADO
    let usuarioLogado = obterUsuario();
    if (!usuarioLogado || !usuarioLogado.nome) {
      const usuarioLogadoStorage = localStorage.getItem('usuarioLogado');
      if (usuarioLogadoStorage) {
        usuarioLogado = JSON.parse(usuarioLogadoStorage);
      }
    }
    
    const nomeUsuarioLogado = usuarioLogado?.nome || usuarioLogado?.Nome;
    if (nomeUsuarioLogado && vendedores.includes(nomeUsuarioLogado)) {
      selectVendedor.value = nomeUsuarioLogado;
      console.log(`✅ Vendedor pré-selecionado: ${nomeUsuarioLogado}`);
    }
    
    console.log(`✅ ${vendedores.length} vendedor(es) carregado(s) com sucesso!`);
    
  } catch (erro) {
    console.error("❌ Erro ao carregar vendedores:", erro);
    console.error("❌ Stack:", erro.stack);
    
    // Fallback: mostrar erro no select
    const selectVendedor = document.getElementById('vendedor');
    selectVendedor.innerHTML = '<option value="">❌ Erro ao carregar</option>';
    selectVendedor.disabled = true;
  }
}

// ===== APLICAR MÁSCARAS =====
function aplicarMascaras() {
  // Máscara CPF/CNPJ
  document.getElementById('cpf').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length <= 11) {
      // CPF: 000.000.000-00
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ: 00.000.000/0000-00
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    e.target.value = value;
  });
  
  // Máscara CEP
  document.getElementById('cep').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    e.target.value = value;
  });
  
  // Máscara Telefone
  document.getElementById('telefone1').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length <= 10) {
      value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    e.target.value = value;
  });

  document.getElementById('telefone1').addEventListener('blur', function(e) {
    const nums = e.target.value.replace(/\D/g, '');
    if (nums.length < 10) {
      e.target.setCustomValidity('Telefone inválido. Use o formato (DDD) 9XXXX-XXXX');
      e.target.reportValidity();
    } else if (nums.length === 11 && nums[2] !== '9') {
      e.target.setCustomValidity('Celular deve ter 9 como primeiro dígito após o DDD');
      e.target.reportValidity();
    } else {
      e.target.setCustomValidity('');
    }
  });
  
  document.getElementById('telefone2').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length <= 10) {
      value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    e.target.value = value;
  });

  document.getElementById('telefone2').addEventListener('blur', function(e) {
    const nums = e.target.value.replace(/\D/g, '');
    if (nums.length === 0) {
      e.target.setCustomValidity(''); // Telefone 2 é opcional
      return;
    }
    if (nums.length < 10) {
      e.target.setCustomValidity('Telefone inválido. Use o formato (DDD) 9XXXX-XXXX');
      e.target.reportValidity();
    } else if (nums.length === 11 && nums[2] !== '9') {
      e.target.setCustomValidity('Celular deve ter 9 como primeiro dígito após o DDD');
      e.target.reportValidity();
    } else {
      e.target.setCustomValidity('');
    }
  });
}

// ===== VALIDAR FORM =====
function validarFormCliente() {
const campos = ['nome', 'cpf', 'endereco', 'numeroEndereco', 'bairro', 'cidade', 'estado', 'telefone1', 'tipo', 'vendedor'];
  const erros = [];

  campos.forEach(campo => {
    const elemento = document.getElementById(campo);
    if (!elemento.value.trim()) {
      erros.push(`${elemento.previousElementSibling?.textContent || campo} é obrigatório`);
    }
  });

  // Validar telefone1
  const tel1 = document.getElementById('telefone1').value.replace(/\D/g, '');
  if (tel1.length < 10) {
    erros.push('Telefone inválido. Mínimo DDD + 8 dígitos. Ex: (62) 99218-9644');
  } else if (tel1.length === 11 && tel1[2] !== '9') {
    erros.push('Celular deve ter 9 como primeiro dígito após o DDD. Ex: (62) 99218-9644');
  }

  // Validar telefone2 (se preenchido)
  const tel2 = document.getElementById('telefone2').value.replace(/\D/g, '');
  if (tel2.length > 0 && tel2.length < 10) {
    erros.push('Telefone 2 inválido. Mínimo DDD + 8 dígitos. Ex: (62) 99218-9644');
  }

  return { valido: erros.length === 0, erros };
}

// ===== HANDLE FORM SUBMIT =====
async function handleFormSubmit(e) {
  e.preventDefault();
  
  console.log("🔄 Validando formulário...");
  
  const validacao = validarFormCliente();
  
  if (!validacao.valido) {
    mostrarAlert('error', `❌ Erros encontrados:\n${validacao.erros.join('\n')}`);
    return;
  }
  
  // Desabilitar botão para evitar múltiplos cliques
  const btnSubmit = e.target.querySelector('button[type="submit"]');
  btnSubmit.disabled = true;
  btnSubmit.textContent = '⏳ Salvando...';
  // Mostrar loader full-screen
  showLoader();
  
  try {
    // Recolher dados do form
    const novoCliente = montarObjCliente();
    
    console.log("📦 Novo cliente:", novoCliente);
    
    // Buscar clientes existentes (MESMA FORMA DO ADMIN)
    console.log("📥 Carregando clientes do Drive...");
    let clientes = await carregarClientesDrive();
    clientes = Array.isArray(clientes) ? clientes : [];
    
    console.log(`📊 ${clientes.length} cliente(s) existente(s)`);
    
    // ===== VALIDAR CPF DUPLICADO =====
    const cpfSemMascara = novoCliente.CPF.replace(/\D/g, '');
    const clienteExistente = clientes.find(c => c.CPF.replace(/\D/g, '') === cpfSemMascara);
    
    if (clienteExistente) {
      console.warn("⚠️ CPF já cadastrado no cliente ID:", clienteExistente.Id);
      
      // Re-habilitar botão
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Criar Cliente';
      hideLoader();
      
      // Mostrar alerta e sugerir ir para vendas do cliente existente
      const irParaVendas = await modalConfirm(
        `⚠️ CPF ${novoCliente.CPF} já está cadastrado para ${clienteExistente.Nome}!\n\n` +
        `Deseja adicionar uma venda a este cliente em vez de criar um novo?\n\n` +
        `Clique "OK" para ir para a página de vendas do cliente ${clienteExistente.Nome}.`
      );
      
      if (irParaVendas) {
        // Redirecionar para vendas-cliente.html com ID do cliente existente
        sessionStorage.setItem('clienteNovoId', clienteExistente.Id);
        sessionStorage.setItem('clienteNome', clienteExistente.Nome);
        window.location.href = 'vendas-cliente.html';
      }
      
      return;
    }
    
    // Gerar novo ID
    const novoId = clientes.length > 0 ? Math.max(...clientes.map(c => c.Id)) + 1 : 1;
    novoCliente.Id = novoId;
    
    // Adicionar cliente
    clientes.push(novoCliente);
    
    console.log(`💾 Salvando ${clientes.length} cliente(s) no Drive...`);
    btnSubmit.textContent = '💾 Salvando no Drive...';
    
    // Salvar em arquivo (MESMA FORMA DO ADMIN)
    const salvoComSucesso = await salvarClientesDrive(clientes);
    
    if (!salvoComSucesso) {
      throw new Error("Falha ao salvar cliente no Drive");
    }
    
    console.log(`✅ Cliente ${novoCliente.Nome} criado com sucesso! ID: ${novoId}`);
    
    // 📋 REGISTRAR EM AUDITORIA
    if (typeof registrarCriacaoCliente === 'function') {
      await registrarCriacaoCliente(novoCliente);
    }
    
    // Esconder loader, mostrar confirmação e redirecionar
    hideLoader();
    btnSubmit.textContent = '✅ Redirecionando...';
    mostrarAlert('success', `✅ Cliente criado! Abrindo página de vendas...`);
    
    // Guardar ID do cliente em sessionStorage ANTES de redirecionar
    sessionStorage.setItem('clienteNovoId', novoId);
    sessionStorage.setItem('clienteNome', novoCliente.Nome);
    
    // Redirecionar logo (sem aguardar muito)
    setTimeout(() => {
      window.location.href = 'vendas-cliente.html';
    }, 800);
    
  } catch (erro) {
    console.error("❌ Erro ao salvar cliente:", erro);
    hideLoader();
    mostrarAlert('error', `❌ Erro ao salvar cliente: ${erro.message}`);
    
    // Re-habilitar botão
    btnSubmit.disabled = false;
    btnSubmit.textContent = '✅ Criar Cliente & Adicionar Venda';
  }
}

// ===== LOADER HELPERS =====
function showLoader() {
  const el = document.getElementById('globalLoader');
  if (el) el.classList.add('visible');
}

function hideLoader() {
  const el = document.getElementById('globalLoader');
  if (el) el.classList.remove('visible');
}

// ===== MONTAR OBJETO CLIENTE =====
function montarObjCliente() {
  const formData = new FormData(document.getElementById('formCliente'));
  
  return {
    Id: 0, // Será atribuído ao salvar
    Nome: formData.get('nome').trim(),
    CPF: formData.get('cpf').trim(),
    Inscricao: formData.get('inscricao').trim() || '',
    RepresentanteNome: formData.get('representanteNome') ? formData.get('representanteNome').trim() : '',
    RepresentanteCPF: formData.get('representanteCPF') ? formData.get('representanteCPF').trim() : '',
    Endereco: formData.get('endereco').trim(),
    Bairro: formData.get('bairro').trim(),
    Cidade: formData.get('cidade').trim(),
    Estado: formData.get('estado').trim(),
    CEP: formData.get('cep').trim() || '',
    Midia: formData.get('midia').trim() || '',
    Vendedor: formData.get('vendedor').trim(),
    Telefone1: formData.get('telefone1').trim() || '',
    Telefone2: formData.get('telefone2').trim() || '',
    Email: formData.get('email').trim() || '',
    DataCadastro: new Date().toISOString(),
    Vendas: [],
    Observacoes: [],
    ObservacoesCliente: [formData.get('observacoes').trim()].filter(o => o),
    Anexos: [],
    NumeroVendas: 0,
    ProdutoPronto: false,
    Satisfacao: parseInt(formData.get('satisfacao')) || 0,
    QuantidadeGado: parseInt(formData.get('quantidadeGado')) || 0,
    NumeroEndereco: formData.get('numeroEndereco').trim(),
    ComplementoEndereco: formData.get('complementoEndereco').trim() || '',
    Tipo: parseInt(formData.get('tipo')) || 0
  };
}

// ===== MOSTRAR ALERT =====
function mostrarAlert(tipo, mensagem) {
  const container = document.getElementById('alertContainer');
  container.innerHTML = `
    <div class="alert ${tipo} show">
      ${mensagem}
    </div>
  `;
  
  // Auto-remover em 5 segundos
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

// ===== CARREGAR CLIENTES DO DRIVE (MESMA FORMA DO ADMIN) =====
async function carregarClientesDrive() {
  try {
    const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
    
    // Fazer requisição IGUAL ao admin
    const response = await fetch(
      `${CONFIG.API_URL}?acao=buscar&arquivo=${CONFIG.ARQUIVOS.CLIENTES}&deviceId=${deviceId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let dados = await response.json();
    console.log("📥 Clientes carregados:", dados);

    // Se for string, tenta parsear
    if (typeof dados === 'string') {
      try {
        dados = JSON.parse(dados);
      } catch (e) {
        dados = [];
      }
    }

    return Array.isArray(dados) ? dados : [];

  } catch (erro) {
    console.error("❌ Erro ao carregar clientes:", erro);
    return [];
  }
}

// ===== SALVAR CLIENTES NO DRIVE (MESMA FORMA DO ADMIN) =====
async function salvarClientesDrive(clientes) {
  try {
    const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
    const dadosJson = JSON.stringify(clientes);

    console.log('📤 Enviando dados para salvar:', {
      acao: 'salvar',
      arquivo: CONFIG.ARQUIVOS.CLIENTES,
      tamanhoDados: dadosJson.length,
      clientesCount: clientes.length
    });

    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'acao': 'salvar',
        'arquivo': CONFIG.ARQUIVOS.CLIENTES,
        'dados': dadosJson,
        'deviceId': deviceId
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    let resultado;
    try {
      resultado = await response.json();
    } catch (e) {
      // Se não for JSON válido, trata como sucesso se resposta for OK
      const texto = await response.text();
      console.log('⚠️ Resposta não JSON:', texto);
      resultado = { success: true, mensagem: texto };
    }

    console.log('📤 Resultado salvar:', resultado);

    // Checar de múltiplas formas se foi sucesso
    const foiSucesso = resultado.success === true || 
                       resultado.success === 'true' || 
                       resultado.sucesso === true ||
                       resultado.mensagem === 'Arquivo salvo com sucesso' ||
                       !resultado.erro;

    if (foiSucesso) {
      console.log('✅ Clientes salvos com sucesso!');
      return true;
    } else {
      console.error('❌ Falha ao salvar clientes:', resultado);
      return false;
    }

  } catch (erro) {
    console.error('❌ Erro ao salvar clientes no Drive:', erro);
    return false;
  }
}

// ===== VOLTAR =====
async function goBack() {
  if (await modalConfirm('Deseja voltar? Os dados não salvos serão perdidos.', { title: 'Voltar', okText: 'Voltar', cancelText: 'Cancelar' })) {
    window.history.back();
  }
}
