<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <link rel="icon" type="image/png" href="assets/img/logo.png">
  <link rel="stylesheet" href="sidebar-dock.css">
  <title>Novo Cliente</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: radial-gradient(circle at 20% 50%, #0e1f1a 0%, #050b09 100%); min-height: 100vh; color: #e5f3ee; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, rgba(31,163,122,.15), rgba(212,175,55,.08)); border: 1px solid rgba(31,163,122,.25); border-radius: 20px; padding: 20px 30px; margin-bottom: 30px; backdrop-filter: blur(14px); box-shadow: 0 20px 40px rgba(0,0,0,.45); display: flex; justify-content: space-between; align-items: center; }
    .header h1 { color: #1fa37a; font-size: 28px; font-weight: 700; }
    .btn { background: linear-gradient(145deg, rgba(31,163,122,.3), rgba(31,163,122,.15)); color: #7cf0c2; border: 1px solid rgba(31,163,122,.3); padding: 10px 20px; border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.3s; }
    .btn:hover { background: linear-gradient(145deg, rgba(31,163,122,.4), rgba(31,163,122,.25)); transform: translateY(-2px); box-shadow: 0 10px 20px rgba(31,163,122,.2); }
    .btn-primary { background: linear-gradient(145deg, rgba(212,175,55,.3), rgba(212,175,55,.15)); color: #d4af37; border-color: rgba(212,175,55,.3); }
    .form-section { background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02)); border: 1px solid rgba(31,163,122,.25); border-radius: 16px; padding: 25px; margin-bottom: 20px; backdrop-filter: blur(14px); }
    .form-section h3 { color: #1fa37a; margin-bottom: 20px; font-size: 16px; font-weight: 700; border-bottom: 1px solid rgba(31,163,122,.2); padding-bottom: 12px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 15px; }
    label { color: #8fb9ac; font-size: 11px; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; display: block; }
    input, select, textarea { background: rgba(15,42,34,.5); border: 1px solid rgba(31,163,122,.2); color: #e5f3ee; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: 'Inter', sans-serif; width: 100%; transition: all 0.3s; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: rgba(31,163,122,.4); box-shadow: 0 0 0 3px rgba(31,163,122,.1); }
    .form-group { margin-bottom: 0; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(31,163,122,.2); }
    .alert { padding: 12px 15px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid; display: none; }
    .alert.show { display: block; }
    .alert.success { background: rgba(50,200,50,.15); border-color: rgba(50,200,50,.3); color: #32c832; }
    .alert.error { background: rgba(255,107,107,.15); border-color: rgba(255,107,107,.3); color: #ff6b6b; }
    .loader-container { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.9); display: flex; justify-content: center; align-items: center; z-index: 9999; backdrop-filter: blur(4px); }
    .loader-container.hidden { display: none; }
    .spinner { width: 60px; height: 60px; border: 4px solid rgba(31, 163, 122, 0.2); border-top: 4px solid #1fa37a; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loader-text { color: #7cf0c2; font-size: 16px; font-weight: 500; }
    .required { color: #d4af37; }
    @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } label { font-size: 10px; } input, select, textarea { font-size: 12px; } }
  </style>
</head>
<body>
<div id="loaderContainer" class="loader-container hidden">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
    <div class="spinner"></div>
    <div class="loader-text">👤 Criando cliente...</div>
    <div style="color: #5fa39c; font-size: 12px;">Enviando dados para o servidor</div>
  </div>
</div>

<div class="container">
  <div class="header">
    <div>
      <h1>👤 Novo Cliente</h1>
      <p style="color: #8fb9ac; font-size: 13px; margin-top: 5px;">Preencha os dados para registrar um novo cliente</p>
    </div>
    <div style="display: flex; gap: 12px;">
      <button class="btn" onclick="goBack()">← Voltar</button>
    </div>
  </div>

  <div id="alertContainer"></div>

  <form id="formCliente">
    <!-- INFORMAÇÕES BÁSICAS -->
    <div class="form-section">
      <h3>📋 Informações Básicas</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="nome">Nome Completo <span class="required">*</span></label>
          <input type="text" id="nome" name="nome" placeholder="Ex: João da Silva" required>
        </div>
        <div class="form-group">
          <label for="tipo">Tipo de Cliente <span class="required">*</span></label>
          <select id="tipo" name="tipo" required>
            <option value="">Selecione...</option>
            <option value="0">Pessoa Física</option>
            <option value="1">Pessoa Jurídica</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="cpf">CPF/CNPJ <span class="required">*</span></label>
          <input type="text" id="cpf" name="cpf" placeholder="000.000.000-00" required>
        </div>
        <div class="form-group">
          <label for="inscricao">Inscrição Estadual</label>
          <input type="text" id="inscricao" name="inscricao" placeholder="Opcional">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="representanteNome">Representante (Nome)</label>
          <input type="text" id="representanteNome" name="representanteNome" placeholder="Nome do representante">
        </div>
        <div class="form-group">
          <label for="representanteCPF">Representante (CPF)</label>
          <input type="text" id="representanteCPF" name="representanteCPF" placeholder="000.000.000-00">
        </div>
      </div>
    </div>

    <!-- ENDEREÇO -->
    <div class="form-section">
      <h3>📍 Endereço</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="cep">CEP <span class="required">*</span></label>
          <input type="text" id="cep" name="cep" placeholder="00000-000" required>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="endereco">Rua/Avenida <span class="required">*</span></label>
          <input type="text" id="endereco" name="endereco" placeholder="Ex: Rua das Flores" required>
        </div>
        <div class="form-group">
          <label for="numeroEndereco">Número <span class="required">*</span></label>
          <input type="text" id="numeroEndereco" name="numeroEndereco" placeholder="123" required>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="complementoEndereco">Complemento</label>
          <input type="text" id="complementoEndereco" name="complementoEndereco" placeholder="Apto, sala, etc">
        </div>
        <div class="form-group">
          <label for="bairro">Bairro <span class="required">*</span></label>
          <input type="text" id="bairro" name="bairro" placeholder="Ex: Centro" required>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="cidade">Cidade <span class="required">*</span></label>
          <input type="text" id="cidade" name="cidade" placeholder="Ex: São Paulo" required>
        </div>
        <div class="form-group">
          <label for="estado">Estado <span class="required">*</span></label>
          <select id="estado" name="estado" required>
            <option value="">Selecione...</option>
            <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option><option value="AM">AM</option>
            <option value="BA">BA</option><option value="CE">CE</option><option value="DF">DF</option><option value="ES">ES</option>
            <option value="GO">GO</option><option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
            <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option><option value="PR">PR</option>
            <option value="PE">PE</option><option value="PI">PI</option><option value="RJ">RJ</option><option value="RN">RN</option>
            <option value="RS">RS</option><option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
            <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
          </select>
        </div>
      </div>
    </div>

    <!-- CONTATO -->
    <div class="form-section">
      <h3>📞 Contato</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="telefone1">Telefone <span class="required">*</span></label>
          <input type="tel" id="telefone1" name="telefone1" placeholder="(11) 99999-9999" required>
        </div>
        <div class="form-group">
          <label for="telefone2">Telefone 2</label>
          <input type="tel" id="telefone2" name="telefone2" placeholder="(11) 99999-9999">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="email">E-mail</label>
          <input type="email" id="email" name="email" placeholder="contato@exemplo.com">
        </div>
      </div>
    </div>

    <!-- INFORMAÇÕES COMERCIAIS -->
    <div class="form-section">
      <h3>💼 Informações Comerciais</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="vendedor">Vendedor <span class="required">*</span></label>
          <select id="vendedor" name="vendedor" required>
            <option value="">Selecione...</option>
          </select>
        </div>
        <div class="form-group">
          <label for="midia">Mídia/Origem</label>
          <input type="text" id="midia" name="midia" placeholder="Como conheceu?">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="satisfacao">Satisfação</label>
          <select id="satisfacao" name="satisfacao">
            <option value="0">Não Avaliado</option>
            <option value="1">Satisfeito</option>
            <option value="2">Muito Satisfeito</option>
          </select>
        </div>
      </div>
    </div>

    <!-- OBSERVAÇÕES -->
    <div class="form-section">
      <h3>📝 Observações</h3>
      <div class="form-group">
        <label for="observacoes">Observações Internas</label>
        <textarea id="observacoes" name="observacoes" placeholder="Anotações sobre o cliente..."></textarea>
      </div>
    </div>

    <!-- BOTÕES -->
    <div class="form-actions">
      <button type="button" class="btn" onclick="goBack()" style="background: linear-gradient(145deg, rgba(255,107,107,.25), rgba(255,107,107,.1)); color: #ff6b6b;">✕ Cancelar</button>
      <button type="submit" class="btn btn-primary">✅ Criar Cliente</button>
    </div>
  </form>
</div>

<script src="config.js"></script>
<script src="auth.js"></script>
<script src="clientes-novo.js"></script>
<script src="sidebar-dock.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderizarSidebarDock === 'function') renderizarSidebarDock();
  });

  // ===== AUTOCOMPLETE CEP (VIACEP API) =====
  document.getElementById('cep').addEventListener('blur', async function() {
    const cep = this.value.replace(/\D/g, '');
    
    if (cep.length !== 8) {
      return;
    }
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await response.json();
      
      if (dados.erro) {
        console.warn("⚠️ CEP não encontrado");
        return;
      }
      
      document.getElementById('endereco').value = dados.logradouro || '';
      document.getElementById('bairro').value = dados.bairro || '';
      document.getElementById('cidade').value = dados.localidade || '';
      document.getElementById('estado').value = dados.uf || '';
      
      console.log("✅ CEP preenchido automaticamente", dados);
    } catch (erro) {
      console.error("❌ Erro ao buscar CEP:", erro);
    }
  });
</script>
<script src="alertas-ligacoes.js"></script>
<script src="sidebar-dock.js"></script>
</body>
</html>
