// ============================================
// TEMPLATE PARA INTEGRAÇÃO DE AUDITORIA
// Use este template para integrar auditoria em outros arquivos .js
// ============================================

// 1️⃣ NO INÍCIO DO SEU ARQUIVO, CERTIFIQUE-SE QUE AUDITORIA.JS ESTÁ CARREGADO
// (deve estar no HTML: <script src="auditoria.js"></script>)

// 2️⃣ ANTES DE SALVAR, CAPTURE OS DADOS ANTIGOS (para ATUALIZAÇÃO)
// Exemplo em uma função de salvar cliente:

async function salvarCliente() {
    const nome = document.getElementById('nomeCliente').value.trim();
    const email = document.getElementById('emailCliente').value.trim();
    const telefone = document.getElementById('telefonCliente').value.trim();

    if (!nome) {
        alert('Por favor, informe o nome');
        return;
    }

    // Se estamos EDITANDO, pegar dados antigos
    if (clienteEdicao !== null) {
        const clienteAntigo = JSON.parse(JSON.stringify(clientes[clienteEdicao]));
        
        // Atualizar dados
        clientes[clienteEdicao] = {
            ...clientes[clienteEdicao],
            Nome: nome,
            Email: email,
            Telefone: telefone,
            DataAtualizacao: new Date().toISOString()
        };

        // 📝 REGISTRAR AUDITORIA - ATUALIZAÇÃO
        await registrarAtualizacaoCliente(clienteAntigo, clientes[clienteEdicao]);

    } else {
        // CRIANDO NOVO
        const novoCliente = {
            Id: Date.now(),
            Nome: nome,
            Email: email,
            Telefone: telefone,
            DataCriacao: new Date().toISOString()
        };
        clientes.push(novoCliente);

        // 📝 REGISTRAR AUDITORIA - CRIAÇÃO
        await registrarCriacaoCliente(novoCliente);
    }

    renderizar();
    fecharModal();
    mostrarAlerta('Salvo com sucesso!', 'success');
}

// 3️⃣ NA FUNÇÃO DE DELETAR

async function deletarCliente(id) {
    if (confirm('Tem certeza?')) {
        const cliente = clientes.find(c => c.Id === id);
        clientes = clientes.filter(c => c.Id !== id);
        
        // 📝 REGISTRAR AUDITORIA - DELEÇÃO
        if (cliente) {
            await registrarDelecaoCliente(cliente);
        }
        
        renderizar();
        mostrarAlerta('Deletado!', 'success');
    }
}

// ============================================
// FUNÇÕES DE AUDITORIA DISPONÍVEIS
// ============================================

// CLIENTES
await registrarCriacaoCliente(cliente)
await registrarAtualizacaoCliente(clienteAntigo, clienteNovo)
await registrarDelecaoCliente(cliente)

// INSUMOS
await registrarCriacaoInsumo(insumo)
await registrarAtualizacaoInsumo(insumoAntigo, insumoNovo)
await registrarDelecaoInsumo(insumo)

// TRANSPORTE
await registrarCriacaoTransporte(transporte)
await registrarAtualizacaoTransporte(transporteAntigo, transporteNovo)
await registrarDelecaoTransporte(transporte)

// RECEITAS
await registrarCriacaoReceita(receita)
await registrarAtualizacaoReceita(receitaAntiga, receitaNova)
await registrarDelecaoReceita(receita)

// DESPESAS
await registrarCriacaoDespesa(despesa)
await registrarAtualizacaoDespesa(despesaAntiga, despesaNova)
await registrarDelecaoDespesa(despesa)

// PAGAMENTOS
await registrarMarcacaoPagamento(parcela, pago)

// ============================================
// FUNÇÃO GENÉRICA (se precisar de algo customizado)
// ============================================

await registrarAuditoria(
    "Ação aqui",           // "Criar", "Atualizar", "Deletar", "Marcar como Pago", etc
    "Tipo aqui",           // "Cliente", "Insumo", "Transporte", etc
    "ID_DO_OBJETO",        // ID único
    "Nome do Objeto",      // Nome legível
    "Descrição em português", // Ex: "Cliente 'João' criado via Site"
    "",                    // dadosAntigos (JSON string, vazio para CREATE)
    JSON.stringify(novo)   // dadosNovos (JSON string, vazio para DELETE)
);

// ============================================
// CHECKLIST DE IMPLEMENTAÇÃO
// ============================================

// [ ] Adicionar <script src="auditoria.js"></script> no HTML
// [ ] No CREATE: chamar registrar*Criacao*()
// [ ] No UPDATE: capturar dados antigos, chamar registrar*Atualizacao*()
// [ ] No DELETE: chamar registrar*Delecao*()
// [ ] Testar editando algo no site
// [ ] Verificar se aparece em auditoria.json
// [ ] Abrir FormAuditoria no C# e confirmar que mostra a ação

// ============================================
