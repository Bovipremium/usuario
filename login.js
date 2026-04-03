// ============================================
// SCRIPT DE LOGIN - VALIDAÇÃO HÍBRIDA
// ============================================
// ✅ Usuários do usuarios.json no Drive (via Apps Script)
// ✅ URL centralizada em config.js

// 🔧 URL DO WEB APP - VINDA DE config.js
const API_URL = CONFIG.API_URL;

// ============================================
// ELEMENTOS DO FORMULÁRIO
// ============================================
const formLogin = document.getElementById("formLogin");
const loginInput = document.getElementById("login");
const senhaInput = document.getElementById("senha");
const btnLogin = document.getElementById("btnLogin");
const erro = document.getElementById("erro");
const sucesso = document.getElementById("sucesso");
const loading = document.getElementById("loading");

// ============================================
// EVENT LISTENERS
// ============================================
formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  await validarLogin();
});

// ============================================
// 🔐 FUNÇÃO PRINCIPAL - VALIDAR LOGIN
// ============================================
async function validarLogin() {
  const login = loginInput.value.trim();
  const senha = senhaInput.value.trim();

  // Validação básica
  if (!login || !senha) {
    mostraErro("Preencha todos os campos");
    return;
  }

  // Desabilita botão e mostra loading
  btnLogin.disabled = true;
  loading.classList.add("ativo");
  ocultaErro();
  ocultaSucesso();

  try {
    let usuario = null;

    // 1️⃣ VERIFICAR USUÁRIOS - DO DRIVE (via Apps Script)
    try {
      console.log("📥 Buscando usuarios.json do Drive...");
      
      const url = `${API_URL}?acao=buscar&arquivo=usuarios.json`;
      const response = await AuthManager.requisicaoSegura(url);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const usuarios = await response.json();
      console.log("✅ Usuários carregados:", usuarios);
      
      // Procurar usuário que corresponde ao login e senha
      if (Array.isArray(usuarios)) {
        usuario = usuarios.find(u => 
          (u.Login === login || u.Login.toLowerCase() === login.toLowerCase()) && 
          u.Senha === senha
        );
        
        if (usuario) {
          // Adaptar estrutura do usuário do Drive
          usuario = {
            id: usuario.Id || 0,
            nome: usuario.Nome || usuario.Login,
            login: usuario.Login,
            tipo: "drive",
            modulos: usuario.ModulosPermitidos || [],
            permissoes: usuario.Permissoes || {}
          };
        }
      }
    } catch (erro) {
      console.error("❌ Erro ao buscar usuarios.json:", erro);
      mostraErro("Erro ao validar usuário");
      btnLogin.disabled = false;
      loading.classList.remove("ativo");
      return;
    }

    // ✅ LOGIN SUCESSO
    if (usuario) {
      localStorage.setItem("usuario", JSON.stringify(usuario));
      mostraSucesso("Login realizado com sucesso! Redirecionando...");
      
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    } 
    // ❌ LOGIN FALHOU
    else {
      mostraErro("Login ou senha inválidos");
      btnLogin.disabled = false;
      loading.classList.remove("ativo");
    }

  } catch (erro) {
    mostraErro("Erro ao processar login: " + erro.message);
    btnLogin.disabled = false;
    loading.classList.remove("ativo");
  }
}

// ============================================
// 🔧 FUNÇÕES AUXILIARES
// ============================================

function mostraErro(mensagem) {
  erro.textContent = mensagem;
  erro.style.display = "block";
  sucesso.style.display = "none";
}

function ocultaErro() {
  erro.style.display = "none";
}

function mostraSucesso(mensagem) {
  sucesso.textContent = mensagem;
  sucesso.style.display = "block";
  erro.style.display = "none";
}

function ocultaSucesso() {
  sucesso.style.display = "none";
}

// ============================================
// ✅ VERIFICAR SE JÁ ESTÁ LOGADO
// ============================================
window.addEventListener("load", () => {
  const usuarioSalvo = localStorage.getItem("usuario");
  
  // Se já tem usuário salvo e está na página de login, redireciona
  if (usuarioSalvo && window.location.pathname.includes("login.html")) {
    window.location.href = "index.html";
  }
});