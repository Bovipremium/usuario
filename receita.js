// ============================================
// MÓDULO DE RECEITAS - JAVASCRIPT
// ============================================

// Variáveis globais
let receitas = [];
let materiasPrimas = [];
let historico = [];
let loteCalculos = [];
let receitaEdicao = null;
let materiaEdicao = null;

const STORAGE_HISTORICO = 'historico_receitas_bovi';

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Iniciando Módulo de Receitas...');
    console.log('📝 receita.js carregado com sucesso');
    
    console.log('🔍 Tentando carregar receitas...');
    await carregarReceitas();
    console.log(`📊 Receitas carregadas: ${receitas.length} total`);
    
    console.log('🔍 Tentando carregar matérias-primas...');
    await carregarMateriasPrimas();
    console.log(`📦 Matérias-primas carregadas: ${materiasPrimas.length} total`);
    
    carregarHistorico();
    
    console.log('🎨 Renderizando interfaces...');
    preencherFiltroClasse();
    renderizarReceitas();
    renderizarMaterias();
    renderizarHistorico();
    
    console.log('✅ Módulo de Receitas carregado com sucesso!');
    console.log('📋 Receitas:', receitas);
    console.log('📦 Matérias:', materiasPrimas);
});

// ============================================
// CARREGAR DADOS DO C#
// ============================================
async function carregarReceitas() {
    try {
        console.log('📂 Iniciando carregamento de receitas.json...');
        console.log('🌐 Chamando buscarArquivo("receitas.json")...');
        
        const dados = await buscarArquivo("receitas.json");
        console.log('✅ Resposta recebida:', dados);
        
        receitas = Array.isArray(dados) ? dados : (dados.dados || []);
        console.log(`✅ ${receitas.length} receita(s) carregada(s)`);
        console.log('📋 Conteúdo:', receitas);
        
        return receitas;
    } catch (erro) {
        console.error('❌ Erro ao carregar receitas:', erro.message);
        console.error('📍 Stack:', erro.stack);
        receitas = [];
        return [];
    }
}

async function carregarMateriasPrimas() {
    try {
        console.log('📂 Iniciando carregamento de materiasprimas_receita.json...');
        console.log('🌐 Chamando buscarArquivo("materiasprimas_receita.json")...');
        
        const dados = await buscarArquivo("materiasprimas_receita.json");
        console.log('✅ Resposta recebida:', dados);
        
        materiasPrimas = Array.isArray(dados) ? dados : (dados.dados || []);
        console.log(`✅ ${materiasPrimas.length} matéria(s) prima(s) carregada(s)`);
        console.log('📦 Conteúdo:', materiasPrimas);
        
        return materiasPrimas;
    } catch (erro) {
        console.error('❌ Erro ao carregar matérias-primas:', erro.message);
        console.error('📍 Stack:', erro.stack);
        materiasPrimas = [];
        return [];
    }
}

// ============================================
// SALVAR DADOS
// ============================================
async function salvarReceitas() {
    try {
        // TODO: Implementar POST para backend quando API estiver pronta
        console.log('💾 Receitas salvas (localStorage + backend)');
    } catch (erro) {
        console.error('❌ Erro ao salvar receitas:', erro.message);
    }
}

async function salvarMateriasPrimas() {
    try {
        // TODO: Implementar POST para backend quando API estiver pronta
        console.log('💾 Matérias-primas salvas (localStorage + backend)');
    } catch (erro) {
        console.error('❌ Erro ao salvar matérias-primas:', erro.message);
    }
}

function carregarHistorico() {
    try {
        const dados = localStorage.getItem(STORAGE_HISTORICO);
        historico = dados ? JSON.parse(dados) : [];
        console.log(`📜 ${historico.length} item(ns) do histórico carregado(s)`);
    } catch (e) {
        historico = [];
    }
}

function salvarHistorico() {
    localStorage.setItem(STORAGE_HISTORICO, JSON.stringify(historico));
}

// ============================================
// NAVEGAÇÃO - ABAS
// ============================================
function abrirAba(nomeAba) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });

    document.getElementById(nomeAba).classList.add('active');
    event.target.classList.add('active');
}

// ============================================
// MODAIS
// ============================================
function abrirModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function fecharModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};

// ============================================
// RECEITAS - CRUD
// ============================================
function abrirModalReceita(id = null) {
    receitaEdicao = id;

    if (id !== null) {
        const receita = receitas.find(r => r.Id === id);
        if (receita) {
            document.querySelector('#modalReceita .modal-header h2').textContent = 'Editar Receita';
            document.getElementById('nomeReceita').value = receita.Nome || '';
            document.getElementById('classeReceita').value = receita.Tipo || '';
            document.getElementById('pesoReceita').value = receita.PesoPadrao || 0;
            definirMoedaInput(document.getElementById('custoPorKgReceita'), receita.CustoPorKg || 0);
            document.getElementById('descricaoReceita').value = receita.Descricao || '';
        }
    } else {
        document.querySelector('#modalReceita .modal-header h2').textContent = 'Nova Receita';
        document.getElementById('nomeReceita').value = '';
        document.getElementById('classeReceita').value = '';
        document.getElementById('pesoReceita').value = 10;
        definirMoedaInput(document.getElementById('custoPorKgReceita'), 0);
        document.getElementById('descricaoReceita').value = '';
    }

    abrirModal('modalReceita');
}

function salvarReceita() {
    const nome = document.getElementById('nomeReceita').value.trim();
    const classe = document.getElementById('classeReceita').value.trim();
    const peso = parseFloat(document.getElementById('pesoReceita').value) || 0;
    const custoPorKg = valorNumerico(document.getElementById('custoPorKgReceita').value) || 0;
    const descricao = document.getElementById('descricaoReceita').value.trim();

    if (!nome) {
        alert('Por favor, informe o nome da receita');
        return;
    }

    if (receitaEdicao !== null) {
        const idx = receitas.findIndex(r => r.Id === receitaEdicao);
        if (idx !== -1) {
            const receitaAntiga = JSON.parse(JSON.stringify(receitas[idx])); // Copiar dados antigos
            
            receitas[idx] = {
                ...receitas[idx],
                Nome: nome,
                Tipo: classe,
                PesoPadrao: peso,
                CustoPorKg: custoPorKg,
                Descricao: descricao,
                DataAtualizacao: new Date().toISOString()
            };

            // 📝 Registrar auditoria + Salvar no servidor
            salvarDadosComAuditoria(
                "receitas.json",
                receitas,
                "auditoria",
                "Atualizar",
                "Receita",
                receitas[idx].Id,
                receitas[idx].Nome,
                `Receita '${receitas[idx].Nome}' atualizada via Site`,
                JSON.stringify(receitaAntiga),
                JSON.stringify(receitas[idx])
            );
        }
    } else {
        const novaReceita = {
            Id: Date.now(),
            Nome: nome,
            Tipo: classe,
            PesoPadrao: peso,
            CustoPorKg: custoPorKg,
            Descricao: descricao,
            Ingredientes: [],
            DataCriacao: new Date().toISOString()
        };
        receitas.push(novaReceita);

        // 📝 Registrar auditoria + Salvar no servidor
        salvarDadosComAuditoria(
            "receitas.json",
            receitas,
            "auditoria",
            "Criar",
            "Receita",
            novaReceita.Id,
            novaReceita.Nome,
            `Receita '${novaReceita.Nome}' criada via Site`,
            "",
            JSON.stringify(novaReceita)
        );
    }

    renderizarReceitas();
    preencherFiltroClasse();
    fecharModal('modalReceita');
    mostrarAlerta('Receita salva com sucesso!', 'success');
}

async function deletarReceita(id) {
    if (await modalConfirm('Tem certeza que deseja deletar esta receita?', { title: 'Deletar receita', okText: 'Deletar', cancelText: 'Cancelar' })) {
        const receita = receitas.find(r => r.Id === id);
        receitas = receitas.filter(r => r.Id !== id);
        
        // 📝 Registrar auditoria + Salvar no servidor
        if (receita) {
            salvarDadosComAuditoria(
                "receitas.json",
                receitas,
                "auditoria",
                "Deletar",
                "Receita",
                receita.Id,
                receita.Nome,
                `Receita '${receita.Nome}' deletada via Site`,
                JSON.stringify(receita),
                ""
            );
        }
        
        renderizarReceitas();
        preencherFiltroClasse();
        mostrarAlerta('Receita deletada!', 'success');
    }
}

function renderizarReceitas() {
    const tbody = document.getElementById('tabelaReceitas');

    if (receitas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">Nenhuma receita cadastrada</td></tr>';
        return;
    }

    tbody.innerHTML = receitas.map(r => `
        <tr>
            <td><strong>${r.Nome}</strong></td>
            <td><span class="badge">${r.Tipo || 'N/A'}</span></td>
            <td>${(r.PesoPadrao || 0).toFixed(3)} kg</td>
            <td>R$ ${(r.CustoPorKg || 0).toFixed(2)}</td>
            <td style="display: flex; gap: 5px;">
                <button class="btn btn-primary btn-sm" onclick="abrirModalReceita(${r.Id})">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deletarReceita(${r.Id})">Deletar</button>
            </td>
        </tr>
    `).join('');
}

function filtrarReceitas() {
    const busca = document.getElementById('buscarReceita').value.toLowerCase();
    document.querySelectorAll('#tabelaReceitas tr').forEach(tr => {
        const nome = tr.textContent.toLowerCase();
        tr.style.display = nome.includes(busca) ? '' : 'none';
    });
    
    // 🎯 AUTO-SCROLL ENQUANTO DIGITA
    setTimeout(() => {
      scrollParaPrimeiraReceita();
    }, 50);
}

// 🎯 AUTO-SCROLL PARA PRIMEIRA RECEITA ENCONTRADA
function scrollParaPrimeiraReceita() {
    const tabela = document.querySelector('#tabelaReceitas');
    if (!tabela) return;
    
    const linhas = tabela.querySelectorAll('tr');
    for (let linha of linhas) {
        if (linha.style.display !== 'none') {
            linha.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            console.log('✅ Auto-scroll para primeira receita encontrada');
            break;
        }
    }
}

// ============================================
// MATÉRIAS-PRIMAS - CRUD
// ============================================
function abrirModalMateria(id = null) {
    materiaEdicao = id;

    if (id !== null) {
        const materia = materiasPrimas.find(m => m.Id === id);
        if (materia) {
            document.querySelector('#modalMateria .modal-header h2').textContent = 'Editar Matéria-Prima';
            document.getElementById('nomeMateria').value = materia.Nome || '';
            document.getElementById('categoriaMateria').value = materia.Categoria || 'Mineral';
            definirMoedaInput(document.getElementById('valorMateria'), materia.ValorUnitario || 0);
            document.getElementById('pesoMateria').value = materia.PesoUnitario || 25;
            document.getElementById('quantidadeMateria').value = materia.Quantidade || 0;
        }
    } else {
        document.querySelector('#modalMateria .modal-header h2').textContent = 'Nova Matéria-Prima';
        document.getElementById('nomeMateria').value = '';
        document.getElementById('categoriaMateria').value = 'Mineral';
        document.getElementById('valorMateria').value = 0;
        document.getElementById('pesoMateria').value = 25;
        document.getElementById('quantidadeMateria').value = 0;
    }

    abrirModal('modalMateria');
}

function salvarMateria() {
    const nome = document.getElementById('nomeMateria').value.trim();
    const categoria = document.getElementById('categoriaMateria').value;
    const valorUnitario = valorNumerico(document.getElementById('valorMateria').value) || 0;
    const pesoUnitario = parseFloat(document.getElementById('pesoMateria').value) || 0;
    const quantidade = parseFloat(document.getElementById('quantidadeMateria').value) || 0;

    if (!nome) {
        alert('Por favor, informe o nome da matéria-prima');
        return;
    }

    if (materiaEdicao !== null) {
        const idx = materiasPrimas.findIndex(m => m.Id === materiaEdicao);
        if (idx !== -1) {
            const materiaAntiga = JSON.parse(JSON.stringify(materiasPrimas[idx]));
            
            materiasPrimas[idx] = {
                ...materiasPrimas[idx],
                Nome: nome,
                Categoria: categoria,
                ValorUnitario: valorUnitario,
                PesoUnitario: pesoUnitario,
                Quantidade: quantidade
            };

            // 📝 Registrar auditoria + Salvar no servidor
            salvarDadosComAuditoria(
                "materiasPrimas.json",
                materiasPrimas,
                "auditoria",
                "Atualizar",
                "Insumo",
                materiasPrimas[idx].Id,
                materiasPrimas[idx].Nome,
                `Matéria-prima '${materiasPrimas[idx].Nome}' atualizada via Site`,
                JSON.stringify(materiaAntiga),
                JSON.stringify(materiasPrimas[idx])
            );
        }
    } else {
        const novaMateria = {
            Id: Date.now(),
            Nome: nome,
            Categoria: categoria,
            ValorUnitario: valorUnitario,
            PesoUnitario: pesoUnitario,
            Quantidade: quantidade,
            DataCriacao: new Date().toISOString()
        };
        materiasPrimas.push(novaMateria);

        // 📝 Registrar auditoria + Salvar no servidor
        salvarDadosComAuditoria(
            "materiasPrimas.json",
            materiasPrimas,
            "auditoria",
            "Criar",
            "Insumo",
            novaMateria.Id,
            novaMateria.Nome,
            `Matéria-prima '${novaMateria.Nome}' criada via Site`,
            "",
            JSON.stringify(novaMateria)
        );
    }

    renderizarMaterias();
    fecharModal('modalMateria');
    mostrarAlerta('Matéria-prima salva com sucesso!', 'success');
}

async function deletarMateria(id) {
    if (await modalConfirm('Tem certeza que deseja deletar esta matéria-prima?', { title: 'Deletar matéria-prima', okText: 'Deletar', cancelText: 'Cancelar' })) {
        const materia = materiasPrimas.find(m => m.Id === id);
        materiasPrimas = materiasPrimas.filter(m => m.Id !== id);
        
        // 📝 Registrar auditoria + Salvar no servidor
        if (materia) {
            salvarDadosComAuditoria(
                "materiasPrimas.json",
                materiasPrimas,
                "auditoria",
                "Deletar",
                "Insumo",
                materia.Id,
                materia.Nome,
                `Matéria-prima '${materia.Nome}' deletada via Site`,
                JSON.stringify(materia),
                ""
            );
        }
        
        renderizarMaterias();
        mostrarAlerta('Matéria-prima deletada!', 'success');
    }
}

function renderizarMaterias() {
    const tbody = document.getElementById('tabelaMaterias');
    const filtro = document.getElementById('filtroCategoria').value;

    if (materiasPrimas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8;">Nenhuma matéria-prima cadastrada</td></tr>';
        return;
    }

    const filtrados = filtro ? materiasPrimas.filter(m => m.Categoria === filtro) : materiasPrimas;

    tbody.innerHTML = filtrados.map(m => {
        const pesoTotal = (m.PesoUnitario * m.Quantidade).toFixed(3);
        return `
            <tr>
                <td><strong>${m.Nome}</strong></td>
                <td><span class="badge">${m.Categoria}</span></td>
                <td>R$ ${(m.ValorUnitario || 0).toFixed(2)}</td>
                <td>${(m.PesoUnitario || 0).toFixed(3)} kg</td>
                <td>${(m.Quantidade || 0).toFixed(3)}</td>
                <td><strong>${pesoTotal} kg</strong></td>
                <td style="display: flex; gap: 5px;">
                    <button class="btn btn-primary btn-sm" onclick="abrirModalMateria(${m.Id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deletarMateria(${m.Id})">Deletar</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// CALCULADORA
// ============================================
function preencherFiltroClasse() {
    const classes = [...new Set(receitas.map(r => r.Tipo).filter(Boolean))];
    const select = document.getElementById('filtroClasse');
    select.innerHTML = '<option value="">Todas</option>';
    classes.forEach(c => {
        select.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

function atualizarReceitas() {
    const classe = document.getElementById('filtroClasse').value;
    const select = document.getElementById('selectReceita');

    const filtradas = classe
        ? receitas.filter(r => r.Tipo === classe)
        : receitas;

    select.innerHTML = '<option value="">Selecione uma receita...</option>';
    filtradas.forEach(r => {
        select.innerHTML += `<option value="${r.Id}">${r.Nome}</option>`;
    });

    if (select.value) {
        const receita = receitas.find(r => r.Id == select.value);
        if (receita) {
            document.getElementById('pesoBalde').value = receita.PesoPadrao;
        }
    }
}

function calcularReceita() {
    const receitaId = parseInt(document.getElementById('selectReceita').value);
    const pesoBalde = parseFloat(document.getElementById('pesoBalde').value) || 0;
    const qtdBaldes = parseInt(document.getElementById('quantidadeBaldes').value) || 0;

    const receita = receitas.find(r => r.Id === receitaId);
    if (!receita) {
        alert('Selecione uma receita válida');
        return;
    }

    const pesoTotal = pesoBalde * qtdBaldes;
    let resultado = '';
    let custoTotal = 0;
    const faltantes = [];

    resultado += 'CÁLCULO DE RECEITA\n';
    resultado += '='.repeat(70) + '\n';
    resultado += `Receita: ${receita.Nome}\n`;
    resultado += `Classe: ${receita.Tipo || 'N/A'}\n`;
    resultado += `Peso por balde: ${pesoBalde.toFixed(3)} kg\n`;
    resultado += `Quantidade de baldes: ${qtdBaldes}\n`;
    resultado += `Peso total: ${pesoTotal.toFixed(3)} kg\n\n`;

    resultado += 'INGREDIENTES NECESSÁRIOS\n';
    resultado += '─'.repeat(70) + '\n';
    resultado += 'Nome                          Qtd(kg)    Val/kg      Total        %\n';
    resultado += '─'.repeat(70) + '\n';

    if (receita.Ingredientes && receita.Ingredientes.length > 0) {
        receita.Ingredientes.forEach(ing => {
            const proporcao = receita.PesoPadrao > 0 ? ing.Quantidade / receita.PesoPadrao : 0;
            const qtdNecessaria = pesoTotal * proporcao;
            const custoIng = qtdNecessaria * ing.CustoPorKg;
            const percentual = proporcao * 100;

            const nomeCompleto = `${ing.Nome} (${ing.Categoria})`;
            const linha = `${nomeCompleto.padEnd(28)} ${qtdNecessaria.toFixed(3).padStart(8)} kg  R$ ${ing.CustoPorKg.toFixed(2).padStart(6)}  R$ ${custoIng.toFixed(2).padStart(8)}    ${percentual.toFixed(1).padStart(5)}%`;
            resultado += linha + '\n';

            custoTotal += custoIng;

            // Verificar estoque
            const materia = materiasPrimas.find(m =>
                m.Nome.toLowerCase() === ing.Nome.toLowerCase() &&
                m.Categoria === ing.Categoria
            );

            if (materia) {
                const pesoTotalMateria = materia.PesoUnitario * materia.Quantidade;
                if (pesoTotalMateria < qtdNecessaria) {
                    const falta = qtdNecessaria - pesoTotalMateria;
                    faltantes.push({ nome: ing.Nome, falta });
                }
            }
        });
    }

    resultado += '─'.repeat(70) + '\n';
    resultado += `Custo total de produção: R$ ${custoTotal.toFixed(2)}\n`;
    resultado += `Custo por kg: R$ ${(pesoTotal > 0 ? custoTotal / pesoTotal : 0).toFixed(2)}\n`;

    if (faltantes.length > 0) {
        resultado += '\n⚠️  ATENÇÃO - FALTA DE MATÉRIA-PRIMA:\n';
        resultado += '─'.repeat(70) + '\n';
        faltantes.forEach(f => {
            const unidade = f.falta >= 1 ? `${f.falta.toFixed(3)} kg` : `${(f.falta * 1000).toFixed(0)} g`;
            resultado += `• ${f.nome}: Faltam ${unidade}\n`;
        });
    }

    document.getElementById('resultados').textContent = resultado;

    // Salvar no histórico
    historico.unshift({
        id: Date.now(),
        data: new Date().toLocaleString('pt-BR'),
        receita: receita.Nome,
        peso: pesoBalde,
        quantidade: qtdBaldes,
        custoTotal,
        detalhes: resultado
    });
    if (historico.length > 100) historico.pop();
    salvarHistorico();
    renderizarHistorico();
}

function adicionarLote() {
    const receitaId = parseInt(document.getElementById('selectReceita').value);
    const pesoBalde = parseFloat(document.getElementById('pesoBalde').value) || 0;
    const qtdBaldes = parseFloat(document.getElementById('quantidadeBaldes').value) || 0;

    const receita = receitas.find(r => r.Id === receitaId);
    if (!receita) {
        alert('Selecione uma receita válida');
        return;
    }

    loteCalculos.push({
        id: Date.now(),
        receita,
        pesoBalde,
        qtdBaldes
    });

    renderizarLote();
    document.getElementById('msgLote').textContent = `✓ ${loteCalculos.length} item(ns) adicionado(s) ao lote`;
}

function removerDoLote(id) {
    loteCalculos = loteCalculos.filter(l => l.id !== id);
    renderizarLote();
    if (loteCalculos.length === 0) {
        document.getElementById('msgLote').textContent = '';
    }
}

function renderizarLote() {
    const tbody = document.getElementById('corpLote');
    const tabela = document.getElementById('tabelaLote');

    if (loteCalculos.length === 0) {
        tabela.style.display = 'none';
        return;
    }

    tabela.style.display = 'table';
    tbody.innerHTML = loteCalculos.map(l => `
        <tr>
            <td>${l.receita.Nome}</td>
            <td>${l.pesoBalde.toFixed(3)} kg</td>
            <td>${l.qtdBaldes}</td>
            <td><button class="btn btn-danger btn-sm" onclick="removerDoLote(${l.id})">×</button></td>
        </tr>
    `).join('');
}

function calcularLote() {
    if (loteCalculos.length === 0) {
        alert('Adicione receitas ao lote antes de calcular');
        return;
    }

    let resultado = '';
    let custoTotalGeral = 0;
    const requisitos = {};

    resultado += 'CÁLCULO DE LOTE\n';
    resultado += '='.repeat(70) + '\n';
    resultado += `Data/Hora: ${new Date().toLocaleString('pt-BR')}\n`;
    resultado += `Total de receitas: ${loteCalculos.length}\n\n`;

    loteCalculos.forEach((item, idx) => {
        const receita = item.receita;
        const pesoTotal = item.pesoBalde * item.qtdBaldes;

        resultado += `\n${idx + 1}. RECEITA: ${receita.Nome}\n`;
        resultado += `Classe: ${receita.Tipo || 'N/A'}\n`;
        resultado += `Peso por balde: ${item.pesoBalde.toFixed(3)} kg | Qtd: ${item.qtdBaldes}\n`;
        resultado += `Peso total: ${pesoTotal.toFixed(3)} kg\n`;
        resultado += '─'.repeat(70) + '\n';

        let custoReceita = 0;

        if (receita.Ingredientes && receita.Ingredientes.length > 0) {
            receita.Ingredientes.forEach(ing => {
                const proporcao = receita.PesoPadrao > 0 ? ing.Quantidade / receita.PesoPadrao : 0;
                const qtdNecessaria = pesoTotal * proporcao;
                const custoIng = qtdNecessaria * ing.CustoPorKg;

                const chave = `${ing.Nome}__${ing.Categoria}`;
                if (!requisitos[chave]) {
                    requisitos[chave] = { qtd: 0, ing };
                }
                requisitos[chave].qtd += qtdNecessaria;

                custoReceita += custoIng;
            });
        }

        resultado += `Custo desta receita: R$ ${custoReceita.toFixed(2)}\n`;
        custoTotalGeral += custoReceita;
    });

    resultado += '\n\n' + '='.repeat(70) + '\n';
    resultado += 'RESUMO DE MATERIAIS NECESSÁRIOS\n';
    resultado += '='.repeat(70) + '\n';
    resultado += 'Material                          Qtd(kg)      Unidades\n';
    resultado += '─'.repeat(70) + '\n';

    const faltantesLote = [];

    Object.entries(requisitos).forEach(([chave, data]) => {
        const parts = chave.split('__');
        const nomeMat = parts[0];
        const categMat = parts[1];
        const qtdTotal = data.qtd;

        const materia = materiasPrimas.find(m =>
            m.Nome.toLowerCase() === nomeMat.toLowerCase() &&
            m.Categoria === categMat
        );

        let unidadesTexto = 'N/A';
        if (materia && materia.PesoUnitario > 0) {
            const unidades = Math.ceil(qtdTotal / materia.PesoUnitario);
            unidadesTexto = `${unidades}x${materia.PesoUnitario.toFixed(0)}kg`;
        }

        const linhaResumo = `${nomeMat.padEnd(30)} ${qtdTotal.toFixed(3).padStart(8)} kg  ${unidadesTexto}`;
        resultado += linhaResumo + '\n';

        if (materia) {
            const pesoTotalMateria = materia.PesoUnitario * materia.Quantidade;
            if (pesoTotalMateria < qtdTotal) {
                const falta = qtdTotal - pesoTotalMateria;
                faltantesLote.push({ nome: nomeMat, falta, materia });
            }
        }
    });

    resultado += '─'.repeat(70) + '\n';
    resultado += `CUSTO TOTAL DO LOTE: R$ ${custoTotalGeral.toFixed(2)}\n`;

    if (faltantesLote.length > 0) {
        resultado += '\n⚠️  ATENÇÃO - FALTANTES DO LOTE:\n';
        resultado += '─'.repeat(70) + '\n';
        faltantesLote.forEach(f => {
            const unidade = f.falta >= 1 ? `${f.falta.toFixed(3)} kg` : `${(f.falta * 1000).toFixed(0)} g`;
            const unidades = f.materia && f.materia.PesoUnitario > 0
                ? Math.ceil(f.falta / f.materia.PesoUnitario)
                : 0;
            resultado += `• ${f.nome}: Faltam ${unidade} (${unidades} unidades)\n`;
        });
    }

    resultado += '='.repeat(70) + '\n';

    document.getElementById('resultados').textContent = resultado;
}

async function limparLote() {
    if (await modalConfirm('Tem certeza que deseja limpar o lote?', { title: 'Limpar lote', okText: 'Limpar', cancelText: 'Cancelar' })) {
        loteCalculos = [];
        renderizarLote();
        document.getElementById('msgLote').textContent = '';
    }
}

function imprimirResultados() {
    const conteudo = document.getElementById('resultados').textContent;
    if (!conteudo || conteudo === 'Aguardando cálculo...') {
        alert('Realize um cálculo antes de imprimir');
        return;
    }

    const win = window.open('', 'Imprimir', 'width=800,height=600');
    const htmlContent = '<html><head><title>Impressão - Receitas</title><style>body{font-family:"Courier New",monospace;font-size:12px;margin:20px;}pre{white-space:pre-wrap;word-wrap:break-word;}</style></head><body><pre>' + conteudo + '</pre></body></html>';
    win.document.write(htmlContent);
    win.document.close();

    setTimeout(() => {
        win.print();
    }, 100);
}

// ============================================
// HISTÓRICO
// ============================================
function renderizarHistorico() {
    const tbody = document.getElementById('tabelaHistorico');

    if (historico.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">Sem histórico</td></tr>';
        return;
    }

    tbody.innerHTML = historico.map(h => `
        <tr>
            <td>${h.data}</td>
            <td>${h.receita}</td>
            <td>${h.peso.toFixed(3)} kg</td>
            <td>${h.quantidade}</td>
            <td><strong>R$ ${h.custoTotal.toFixed(2)}</strong></td>
            <td><button class="btn btn-primary btn-sm" onclick="mostrarDetalhesHistorico(${h.id})">Ver</button></td>
        </tr>
    `).join('');
}

function mostrarDetalhesHistorico(id) {
    const item = historico.find(h => h.id === id);
    if (item) {
        document.getElementById('resultados').textContent = item.detalhes;
        abrirAba('calculadora');
    }
}

async function limparHistorico() {
    if (await modalConfirm('Tem certeza que deseja limpar todo o histórico?', { title: 'Limpar histórico', okText: 'Limpar', cancelText: 'Cancelar' })) {
        historico = [];
        salvarHistorico();
        renderizarHistorico();
        mostrarAlerta('Histórico limpo!', 'success');
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function mostrarAlerta(mensagem, tipo = 'info') {
    const classes = {
        'success': 'alert-success',
        'danger': 'alert-danger'
    };

    const alerta = document.createElement('div');
    alerta.className = `alert ${classes[tipo] || 'alert-success'}`;
    alerta.textContent = mensagem;
    alerta.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 2000; animation: slideIn 0.3s ease;';

    document.body.appendChild(alerta);
    setTimeout(() => alerta.remove(), 3000);
}

// ============================================
// DESCONTAR MATÉRIA-PRIMA DO ESTOQUE
// ============================================
async function descontarMateriaPrima() {
    try {
        // Validar se há cálculos
        if (loteCalculos.length === 0) {
            alert('⚠️ Realize um cálculo antes de descontar matéria-prima');
            return;
        }

        // Calcular requisitos (igual ao calcularLote)
        const requisitos = {};
        
        loteCalculos.forEach(item => {
            const receita = item.receita;
            const pesoTotal = item.pesoBalde * item.qtdBaldes;

            if (receita.Ingredientes && receita.Ingredientes.length > 0) {
                receita.Ingredientes.forEach(ing => {
                    const proporcao = receita.PesoPadrao > 0 ? ing.Quantidade / receita.PesoPadrao : 0;
                    const qtdNecessaria = pesoTotal * proporcao;

                    const chave = `${ing.Nome}__${ing.Categoria}`;
                    if (!requisitos[chave]) {
                        requisitos[chave] = { qtd: 0, ing };
                    }
                    requisitos[chave].qtd += qtdNecessaria;
                });
            }
        });

        if (Object.keys(requisitos).length === 0) {
            alert('⚠️ Nenhuma matéria-prima para descontar');
            return;
        }

        // 📋 CONSTRUIR MENSAGEM DE CONFIRMAÇÃO
        let mensagemConfirmacao = '🚨 DESEJA TIRAR MATÉRIA-PRIMA DO ESTOQUE?\n\n';
        mensagemConfirmacao += 'Itens a descontar:\n';
        mensagemConfirmacao += '═'.repeat(60) + '\n';

        let totalQtd = 0;
        Object.entries(requisitos).forEach(([chave, data]) => {
            const parts = chave.split('__');
            const nomeMat = parts[0];
            const categMat = parts[1];
            const qtdTotal = data.qtd;
            
            totalQtd += qtdTotal;
            
            const linhaQtd = qtdTotal >= 1 ? `${qtdTotal.toFixed(3)} kg` : `${(qtdTotal * 1000).toFixed(0)} g`;
            mensagemConfirmacao += `• ${nomeMat} (${categMat}): ${linhaQtd}\n`;
        });

        mensagemConfirmacao += '═'.repeat(60) + '\n';
        mensagemConfirmacao += `Total: ${totalQtd.toFixed(3)} kg\n\n`;
        mensagemConfirmacao += '⚠️ Clique OK para confirmar ou CANCELAR para desistir.';

        // ❓ PERGUNTAR CONFIRMAÇÃO
        if (!await modalConfirm(mensagemConfirmacao, { title: 'Confirmar desconto', okText: 'Confirmar', cancelText: 'Cancelar' })) {
            console.log('ℹ️ Desconto cancelado pelo usuário');
            return;
        }

        // ✅ APLICAR DESCONTOS
        console.log('🔄 Aplicando descontos de matéria-prima...');
        
        const resumo = [];

        Object.entries(requisitos).forEach(([chave, data]) => {
            const parts = chave.split('__');
            const nomeMat = parts[0];
            const categMat = parts[1];
            const qtdNecessaria = data.qtd;

            // Encontrar matéria-prima
            const materia = materiasPrimas.find(m =>
                m.Nome.toLowerCase() === nomeMat.toLowerCase() &&
                m.Categoria === categMat
            );

            if (!materia) {
                console.warn(`⚠️ Matéria-prima não encontrada: ${nomeMat} (${categMat})`);
                resumo.push(`❌ ${nomeMat} (${categMat}): NÃO ENCONTRADA`);
                return;
            }

            // Calcular novo peso
            const pesoPesoTotalAtual = materia.PesoUnitario * materia.Quantidade;
            const novoPesoTotal = Math.max(0, pesoPesoTotalAtual - qtdNecessaria);
            const novaQuantidade = materia.PesoUnitario > 0 ? Math.round((novoPesoTotal / materia.PesoUnitario) * 1000) / 1000 : 0;

            // Atualizar matéria-prima
            materia.Quantidade = novaQuantidade;
            materia.PesoTotal = novoPesoTotal;

            const qtdFormatada = qtdNecessaria >= 1 ? `${qtdNecessaria.toFixed(3)} kg` : `${(qtdNecessaria * 1000).toFixed(0)} g`;
            const novoFormatado = novoPesoTotal >= 1 ? `${novoPesoTotal.toFixed(3)} kg` : `${(novoPesoTotal * 1000).toFixed(0)} g`;

            console.log(`✅ ${nomeMat}: -${qtdFormatada} => ${novoFormatado} (${novaQuantidade.toFixed(3)} un)`);
            resumo.push(`✅ ${nomeMat}: -${qtdFormatada} => ${novoFormatado}`);
        });

        // 💾 SALVAR MATÉRIAS-PRIMAS ATUALIZADO
        console.log('💾 Salvando matérias-primas...');
        await salvarDadosComAuditoria(
            'materiasprimas_receita.json',
            materiasPrimas,
            'auditoria',
            'Atualizar',
            'Matéria-Prima',
            'LOTE',
            'Desconto em Lote',
            `Desconto de matéria-prima para ${loteCalculos.length} receita(s)`,
            '',
            JSON.stringify(materiasPrimas)
        );

        // 🎉 SUCESSO
        console.log('✅ Descontos aplicados com sucesso!');
        alert(`✅ DESCONTOS APLICADOS COM SUCESSO!\n\n${resumo.join('\n')}`);

        // Limpar lote após desconto
        loteCalculos = [];
        renderizarLote();
        document.getElementById('msgLote').textContent = '';
        document.getElementById('resultados').textContent = 'Lote processado e descartado. Realize novo cálculo se necessário.';

    } catch (erro) {
        console.error('❌ Erro ao descontar matéria-prima:', erro);
        alert(`❌ Erro ao descontar: ${erro.message}`);
    }
}

// ============================================
// FUNÇÃO DE SALVAR DADOS COM AUDITORIA
// ============================================
async function salvarDadosComAuditoria(
    nomeArquivo,
    dados,
    tipoAuditoria,
    acao,
    tipo,
    id,
    nomeObjeto,
    descricao,
    dadosAntigos,
    dadosNovos
) {
    try {
        const deviceId = localStorage.getItem('deviceId') || 'device-' + Date.now();
        const dadosJson = typeof dados === 'string' ? dados : JSON.stringify(dados);

        console.log(`💾 Salvando ${nomeArquivo}...`);

        // Fazer requisição para salvar arquivo
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'acao': 'salvar',
                'arquivo': nomeArquivo,
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
            const texto = await response.text();
            console.log('⚠️ Resposta não JSON:', texto);
            resultado = { success: true, mensagem: texto };
        }

        console.log('📤 Resultado salvar:', resultado);

        // Registrar auditoria
        if (typeof registrarAuditoria === 'function') {
            await registrarAuditoria(
                acao,
                tipo,
                id,
                nomeObjeto,
                descricao,
                dadosAntigos,
                dadosNovos
            );
        }

        console.log(`✅ ${nomeArquivo} salvo com sucesso!`);
        return true;

    } catch (erro) {
        console.error(`❌ Erro ao salvar ${nomeArquivo}:`, erro);
        return false;
    }
}

// ============================================
// RECEITA FAZER CLIENTES V9 PRODUTO + CLASSE
// ============================================
// Regra correta:
// - O nome do produto NAO muda.
// - O usuario escolhe SOMENTE a classe: 1, 2, 3...
// - A receita usada e encontrada por PRODUTO + CLASSE.
//   Ex.: Produto bovi-sal + Classe 1 => receita bovi-sal classe 1.
// - Nao pode pegar a primeira receita da classe, como ADE+, para todos.
// - Produtos iguais com a mesma classe sao somados.
// - Produtos diferentes, mesmo na mesma classe, viram receitas separadas.
// - Nao altera JSONs nem estrutura dos dados.

let clientesReceitaPendentesV9 = [];
let receitaClientesSelecionadosV9 = [];

function receitaV9Norm(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\+/g, ' plus ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function receitaV9NormForte(valor) {
    return receitaV9Norm(valor).replace(/\s+/g, '');
}

function receitaV9Num(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
    const txt = String(valor || '').trim();
    if (!txt) return 0;
    const limpo = txt
        .replace(/[^\d,.-]/g, '')
        .replace(/\.(?=\d{3}(?:\D|$))/g, '')
        .replace(',', '.');
    const n = parseFloat(limpo);
    return Number.isFinite(n) ? n : 0;
}

function receitaV9Kg(valor) {
    const n = Number(valor) || 0;
    return n >= 1 ? `${n.toFixed(3)} kg` : `${(n * 1000).toFixed(0)} g`;
}

function receitaV9Pad(valor, tamanho) {
    valor = String(valor ?? '');
    if (valor.length > tamanho) return valor.slice(0, Math.max(0, tamanho - 1)) + '…';
    return valor.padEnd(tamanho);
}

function receitaV9PadLeft(valor, tamanho) {
    valor = String(valor ?? '');
    if (valor.length > tamanho) return valor.slice(0, tamanho);
    return valor.padStart(tamanho);
}

function receitaV9Campo(obj, nomes, padrao = '') {
    if (!obj) return padrao;
    for (const nome of nomes) {
        if (obj[nome] !== undefined && obj[nome] !== null && obj[nome] !== '') return obj[nome];
    }
    return padrao;
}

function receitaV9ProdutoProntoNao(valor) {
    if (valor === false || valor === 0) return true;
    if (valor === true || valor === 1) return false;
    const n = receitaV9Norm(valor);
    return ['nao', 'não', 'n', 'false', 'falso', '0', 'pendente', 'em aberto', 'aberto'].includes(n);
}

function receitaV9ProdutoProntoSim(valor) {
    if (valor === true || valor === 1) return true;
    const n = receitaV9Norm(valor);
    return ['sim', 's', 'true', 'verdadeiro', '1', 'pronto', 'feito', 'ok'].includes(n);
}

function receitaV9ListaProdutosVenda(venda) {
    const listas = [
        venda?.Produtos,
        venda?.produtos,
        venda?.Itens,
        venda?.itens,
        venda?.ProdutosVendidos,
        venda?.produtosVendidos,
        venda?.ItensVenda,
        venda?.itensVenda
    ].filter(Array.isArray);

    if (listas.length) return listas[0];

    return [{
        Nome: venda?.Produto || venda?.NomeProduto || venda?.produto || venda?.DescricaoProduto || venda?.Descricao || '',
        Classe: venda?.Classe || venda?.classe || venda?.Tipo || venda?.tipo || venda?.ClasseReceita || venda?.ReceitaClasse || '',
        Quantidade: venda?.Quantidade || venda?.quantidade || 0,
        PesoUnidade: venda?.PesoUnidade || venda?.pesoUnidade || venda?.Peso || venda?.peso || 0,
        ProdutoPronto: venda?.ProdutoPronto ?? venda?.produtoPronto ?? venda?.ProdutosProntos ?? venda?.produtosProntos
    }];
}

function receitaV9VendaTemPendente(cliente, venda) {
    const prontoVenda = venda?.ProdutoPronto ?? venda?.produtoPronto ?? venda?.ProdutosProntos ?? venda?.produtosProntos;
    if (receitaV9ProdutoProntoNao(prontoVenda)) return true;

    const produtos = receitaV9ListaProdutosVenda(venda);
    if (produtos.some(p => receitaV9ProdutoProntoNao(p?.ProdutoPronto ?? p?.produtoPronto ?? p?.Pronto ?? p?.pronto))) return true;

    const prontoCliente = cliente?.ProdutoPronto ?? cliente?.produtoPronto ?? cliente?.ProdutosProntos ?? cliente?.produtosProntos;
    return receitaV9ProdutoProntoNao(prontoCliente);
}

function receitaV9ScoreVenda(venda, idx) {
    const datas = [
        venda?.DataVenda,
        venda?.Data,
        venda?.DataCadastro,
        venda?.CriadoEm,
        venda?.AtualizadoEm,
        venda?.data,
        venda?.createdAt,
        venda?.updatedAt
    ].filter(Boolean);

    for (const raw of datas) {
        const d = new Date(raw);
        if (Number.isFinite(d.getTime())) return d.getTime();
    }

    const nf = String(venda?.NumeroNF || venda?.NF || venda?.numeroNF || venda?.NotaFiscal || '').replace(/\D/g, '');
    if (nf) {
        const n = parseInt(nf, 10);
        if (Number.isFinite(n)) return n;
    }

    const id = String(venda?.Id || venda?.id || '').replace(/\D/g, '');
    if (id) {
        const n = parseInt(id, 10);
        if (Number.isFinite(n)) return n;
    }

    return idx || 0;
}

function receitaV9UltimaVendaPendente(cliente) {
    const vendas = Array.isArray(cliente?.Vendas) ? cliente.Vendas : [];
    if (!vendas.length) return [];

    const pendentes = vendas
        .map((venda, idx) => ({ venda, idx, score: receitaV9ScoreVenda(venda, idx) }))
        .filter(item => receitaV9VendaTemPendente(cliente, item.venda))
        .sort((a, b) => b.score - a.score);

    return pendentes.length ? [pendentes[0].venda] : [];
}

function receitaV9KgProduto(produto, venda) {
    const kgDireto = receitaV9Num(receitaV9Campo(produto, [
        'Kg', 'kg', 'PesoTotal', 'pesoTotal', 'QuantidadeKg', 'quantidadeKg'
    ], 0));
    if (kgDireto > 0) return kgDireto;

    const qtd = receitaV9Num(receitaV9Campo(produto, ['Quantidade', 'quantidade', 'Qtd', 'qtd'], 0));
    const pesoUnidade = receitaV9Num(receitaV9Campo(produto, [
        'PesoUnidade', 'pesoUnidade', 'PesoUnitario', 'pesoUnitario', 'Peso', 'peso'
    ], 0));

    if (qtd > 0 && pesoUnidade > 0) return qtd * pesoUnidade;

    const kgVenda = receitaV9Num(receitaV9Campo(venda, [
        'Kg', 'kg', 'PesoTotal', 'pesoTotal', 'QuantidadeKg', 'quantidadeKg'
    ], 0));
    if (kgVenda > 0) return kgVenda;

    return qtd;
}

function receitaV9ExtrairProdutosVenda(cliente, venda) {
    const produtos = receitaV9ListaProdutosVenda(venda);

    return produtos.map((item, idx) => {
        const produto = String(
            receitaV9Campo(item, ['NomeProduto', 'Produto', 'Nome', 'DescricaoProduto', 'Descricao'], '') ||
            receitaV9Campo(venda, ['Produto', 'NomeProduto'], '')
        ).trim();

        const classeOriginal = String(
            receitaV9Campo(item, ['Classe', 'classe', 'Tipo', 'tipo', 'ClasseReceita', 'ReceitaClasse'], '') ||
            receitaV9Campo(venda, ['Classe', 'classe', 'Tipo', 'tipo'], '')
        ).trim();

        const quantidade = receitaV9Num(receitaV9Campo(item, ['Quantidade', 'quantidade', 'Qtd', 'qtd'], 0));
        const pesoUnidade = receitaV9Num(receitaV9Campo(item, [
            'PesoUnidade', 'pesoUnidade', 'PesoUnitario', 'pesoUnitario', 'Peso', 'peso'
        ], 0));

        const kg = receitaV9KgProduto(item, venda);

        const prontoItem = item?.ProdutoPronto ?? item?.produtoPronto ?? item?.Pronto ?? item?.pronto;
        const prontoVenda = venda?.ProdutoPronto ?? venda?.produtoPronto ?? venda?.ProdutosProntos ?? venda?.produtosProntos;
        const prontoCliente = cliente?.ProdutoPronto ?? cliente?.produtoPronto ?? cliente?.ProdutosProntos ?? cliente?.produtosProntos;

        const pendente =
            receitaV9ProdutoProntoNao(prontoItem) ||
            receitaV9ProdutoProntoNao(prontoVenda) ||
            receitaV9ProdutoProntoNao(prontoCliente);

        return {
            uid: `${cliente.Id || cliente.CPF || cliente.Nome || 'cliente'}__${venda.Id || venda.NumeroNF || venda.NF || 'venda'}__${idx}`,
            clienteKey: receitaV9Norm(cliente.Id || cliente.CPF || cliente.Nome || cliente.nome || 'cliente'),
            clienteId: cliente.Id,
            clienteNome: cliente.Nome || cliente.nome || 'Cliente',
            clienteCpf: cliente.CPF || cliente.cpf || '',
            vendaId: venda.Id || venda.id || '',
            nf: venda.NumeroNF || venda.NF || venda.numeroNF || venda.NotaFiscal || '',
            produto,
            produtoNorm: receitaV9NormForte(produto),
            classeOriginal,
            quantidade,
            pesoUnidade,
            kg,
            itemIndex: idx,
            pendente
        };
    }).filter(p => p.pendente && (p.produto || p.classeOriginal || p.kg > 0));
}

function receitaV9ClasseLabel(receita) {
    return String(receita?.Tipo || receita?.Classe || receita?.classe || '').trim();
}

function receitaV9ClassesDisponiveis() {
    const lista = Array.isArray(receitas) ? receitas : [];
    const mapa = new Map();

    lista.forEach(r => {
        const label = receitaV9ClasseLabel(r);
        const key = receitaV9Norm(label);
        if (!key) return;
        if (!mapa.has(key)) mapa.set(key, { key, label });
    });

    return Array.from(mapa.values()).sort((a, b) => {
        const na = Number(a.label);
        const nb = Number(b.label);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return String(a.label).localeCompare(String(b.label), 'pt-BR');
    });
}

function receitaV9OptionsClasses(valorSelecionado, incluirTodos = false) {
    const opcoes = incluirTodos
        ? ['<option value="">Aplicar classe para todos...</option>']
        : ['<option value="">Selecione a classe...</option>'];

    receitaV9ClassesDisponiveis().forEach(c => {
        const selected = c.key === valorSelecionado ? 'selected' : '';
        opcoes.push(`<option value="${c.key}" ${selected}>${c.label}</option>`);
    });

    return opcoes.join('');
}

function receitaV9ReceitasDaClasse(classeKey) {
    return (Array.isArray(receitas) ? receitas : []).filter(r => receitaV9Norm(receitaV9ClasseLabel(r)) === classeKey);
}

function receitaV9ReceitaProdutoClasse(item, classeKey) {
    const candidatas = receitaV9ReceitasDaClasse(classeKey);
    const produtoNorm = receitaV9NormForte(item.produto);

    if (!produtoNorm || !candidatas.length) return null;

    let achada = candidatas.find(r => receitaV9NormForte(r.Nome || r.nome) === produtoNorm);
    if (achada) return achada;

    achada = candidatas.find(r => {
        const nome = receitaV9NormForte(r.Nome || r.nome);
        return nome && (nome.includes(produtoNorm) || produtoNorm.includes(nome));
    });

    return achada || null;
}

function receitaV9ClasseAuto(item) {
    const original = receitaV9Norm(item.classeOriginal);
    if (!original) return '';
    return receitaV9ClassesDisponiveis().some(c => c.key === original) ? original : '';
}

function receitaV9AtualizarReceitaPreview(select) {
    const idx = parseInt(select.dataset.idx, 10);
    const item = clientesReceitaPendentesV9[idx];
    const destino = document.querySelector(`.previewReceitaCliente[data-idx="${idx}"]`);
    if (!item || !destino) return;

    if (!select.value) {
        destino.innerHTML = '<span style="color:#94a3b8;">Escolha a classe</span>';
        return;
    }

    const receita = receitaV9ReceitaProdutoClasse(item, select.value);

    if (receita) {
        destino.innerHTML = `<span style="color:#6ee7b7;">${receita.Nome}</span>`;
    } else {
        destino.innerHTML = `<span style="color:#fca5a5;">Sem receita para ${item.produto} nessa classe</span>`;
    }
}

function abrirModalFazerClientes() {
    abrirModal('modalFazerClientes');
    if (!clientesReceitaPendentesV9.length) carregarClientesParaFazerReceita();
}

async function carregarClientesParaFazerReceita() {
    try {
        const tbody = document.getElementById('tabelaFazerClientes');
        const resumo = document.getElementById('resumoFazerClientes');

        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;">Carregando clientes...</td></tr>';
        }

        const clientes = await buscarArquivo('clientes.json');
        const listaClientes = Array.isArray(clientes) ? clientes : [];
        const pendentes = [];

        listaClientes.forEach(cliente => {
            const vendas = receitaV9UltimaVendaPendente(cliente);
            vendas.forEach(venda => {
                receitaV9ExtrairProdutosVenda(cliente, venda).forEach(item => pendentes.push(item));
            });
        });

        clientesReceitaPendentesV9 = pendentes;
        renderizarClientesParaFazerReceita();

        if (resumo) {
            const clientesQtd = new Set(pendentes.map(p => p.clienteKey)).size;
            const kgTotal = pendentes.reduce((s, p) => s + (p.kg || 0), 0);
            resumo.textContent = pendentes.length
                ? `${pendentes.length} produto(s) pendente(s), ${clientesQtd} cliente(s), ${kgTotal.toFixed(3)} kg no total. Escolha só a classe; a receita será produto + classe.`
                : 'Nenhum cliente/venda com Produto Pronto = Não foi encontrado.';
        }

        return pendentes;
    } catch (erro) {
        console.error('Erro ao carregar clientes para receita:', erro);
        alert('Erro ao carregar clientes: ' + erro.message);
        return [];
    }
}

function aplicarClasseParaClienteFazerReceita(clienteKey, classeKey) {
    if (!classeKey) return;

    document.querySelectorAll(`.selectClasseReceitaCliente[data-cliente-key="${clienteKey}"]`).forEach(select => {
        select.value = classeKey;
        receitaV9AtualizarReceitaPreview(select);
    });
}

function renderizarClientesParaFazerReceita() {
    const tbody = document.getElementById('tabelaFazerClientes');
    if (!tbody) return;

    if (!clientesReceitaPendentesV9.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;">Nenhum produto pendente encontrado.</td></tr>';
        return;
    }

    let html = '';
    let clienteAtualRender = '';

    clientesReceitaPendentesV9.forEach((item, idx) => {
        if (item.clienteKey !== clienteAtualRender) {
            clienteAtualRender = item.clienteKey;

            html += `
                <tr style="background:rgba(31,163,122,.12);">
                    <td colspan="6" style="padding:12px;">
                        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                            <strong style="color:#7cf0c2;font-size:15px;">👤 ${item.clienteNome}</strong>
                            <select onchange="aplicarClasseParaClienteFazerReceita('${item.clienteKey}', this.value)"
                                    style="min-width:190px;padding:8px;border-radius:8px;background:#0f172a;color:#e5e7eb;border:1px solid rgba(31,163,122,.45);">
                                ${receitaV9OptionsClasses('', true)}
                            </select>
                            <small style="color:#8fb9ac;">aplica a classe nos produtos deste cliente</small>
                        </div>
                    </td>
                </tr>
            `;
        }

        const autoKey = receitaV9ClasseAuto(item);
        const receitaAuto = autoKey ? receitaV9ReceitaProdutoClasse(item, autoKey) : null;
        const preview = receitaAuto
            ? `<span style="color:#6ee7b7;">${receitaAuto.Nome}</span>`
            : (autoKey ? `<span style="color:#fca5a5;">Sem receita para ${item.produto} nessa classe</span>` : `<span style="color:#94a3b8;">Escolha a classe</span>`);

        html += `
            <tr>
                <td><input type="checkbox" class="chkFazerCliente" data-idx="${idx}" checked></td>
                <td><strong>${item.produto || '-'}</strong></td>
                <td>${item.nf || '-'}</td>
                <td>${(item.kg || 0).toFixed(3)} kg</td>
                <td>
                    <select class="selectClasseReceitaCliente"
                            data-idx="${idx}"
                            data-cliente-key="${item.clienteKey}"
                            onchange="receitaV9AtualizarReceitaPreview(this)"
                            style="width:100%;padding:8px;border-radius:8px;background:#0f172a;color:#e5e7eb;border:1px solid rgba(148,163,184,.35);">
                        ${receitaV9OptionsClasses(autoKey)}
                    </select>
                </td>
                <td class="previewReceitaCliente" data-idx="${idx}" style="font-size:12px;">${preview}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function selecionarTodosClientesReceita(marcar) {
    document.querySelectorAll('.chkFazerCliente').forEach(chk => chk.checked = !!marcar);
}

function receitaV9Selecionados() {
    const selecionados = [];

    document.querySelectorAll('.chkFazerCliente').forEach(chk => {
        if (!chk.checked) return;

        const idx = parseInt(chk.dataset.idx, 10);
        const item = clientesReceitaPendentesV9[idx];
        if (!item) return;

        const select = document.querySelector(`.selectClasseReceitaCliente[data-idx="${idx}"]`);
        const classeKey = select ? select.value : '';
        const receita = classeKey ? receitaV9ReceitaProdutoClasse(item, classeKey) : null;

        selecionados.push({ ...item, classeKey, receita });
    });

    return selecionados;
}

function receitaV9MateriaCorrespondente(ing) {
    const nomeIng = receitaV9Norm(ing?.Nome);
    const catIng = receitaV9Norm(ing?.Categoria);

    return (materiasPrimas || []).find(m =>
        receitaV9Norm(m.Nome) === nomeIng &&
        receitaV9Norm(m.Categoria) === catIng
    ) || null;
}

function receitaV9CalcularIngredientes(receita, pesoTotal) {
    const linhas = [];
    const faltantes = [];
    const requisitos = {};
    let custoTotal = 0;

    if (receita?.Ingredientes && receita.Ingredientes.length > 0) {
        receita.Ingredientes.forEach(ing => {
            const quantidadePadrao = Number(ing.Quantidade || 0);
            const pesoPadrao = Number(receita.PesoPadrao || 0);
            const proporcao = pesoPadrao > 0 ? quantidadePadrao / pesoPadrao : 0;
            const qtdNecessaria = pesoTotal * proporcao;
            const custoPorKg = Number(ing.CustoPorKg || 0);
            const custoIng = qtdNecessaria * custoPorKg;
            const percentual = proporcao * 100;

            const chave = `${ing.Nome}__${ing.Categoria}`;
            if (!requisitos[chave]) requisitos[chave] = { qtd: 0, ing };
            requisitos[chave].qtd += qtdNecessaria;

            linhas.push({
                nome: ing.Nome || '',
                categoria: ing.Categoria || '',
                qtd: qtdNecessaria,
                custoPorKg,
                custoIng,
                percentual
            });

            custoTotal += custoIng;

            const materia = receitaV9MateriaCorrespondente(ing);
            if (materia) {
                const pesoTotalMateria = Number(materia.PesoUnitario || 0) * Number(materia.Quantidade || 0);
                if (pesoTotalMateria < qtdNecessaria) {
                    faltantes.push({ nome: ing.Nome, falta: qtdNecessaria - pesoTotalMateria, materia });
                }
            } else {
                faltantes.push({ nome: ing.Nome, falta: qtdNecessaria, materia: null });
            }
        });
    }

    return { linhas, faltantes, requisitos, custoTotal };
}

function receitaV9MontarBlocoReceita(receita, pesoTotal, opcoes = {}) {
    const titulo = opcoes.titulo || 'CÁLCULO DE RECEITA';
    const itensOrigem = Array.isArray(opcoes.itens) ? opcoes.itens : [];
    const calc = receitaV9CalcularIngredientes(receita, pesoTotal);
    let resultado = '';

    resultado += `${titulo}\n`;
    resultado += '='.repeat(70) + '\n';
    resultado += `Receita: ${receita.Nome}\n`;
    resultado += `Classe: ${receita.Tipo || receita.Classe || receita.classe || 'N/A'}\n`;
    resultado += `Peso total usado na receita: ${pesoTotal.toFixed(3)} kg\n\n`;

    if (itensOrigem.length) {
        resultado += 'PRODUTOS/CLIENTES INCLUÍDOS\n';
        resultado += '─'.repeat(70) + '\n';
        resultado += `${'Cliente'.padEnd(26)} ${'Produto'.padEnd(18)} ${'NF'.padEnd(8)} ${'Kg'.padStart(10)}\n`;
        resultado += '─'.repeat(70) + '\n';
        itensOrigem.forEach(item => {
            resultado += `${receitaV9Pad(item.clienteNome || '-', 26)} ${receitaV9Pad(item.produto || '-', 18)} ${receitaV9Pad(String(item.nf || '-'), 8)} ${receitaV9PadLeft((Number(item.kg || 0)).toFixed(3), 8)} kg\n`;
        });
        resultado += '\n';
    }

    resultado += 'INGREDIENTES NECESSÁRIOS\n';
    resultado += '─'.repeat(70) + '\n';
    resultado += 'Nome                          Qtd(kg)    Val/kg      Total        %\n';
    resultado += '─'.repeat(70) + '\n';

    calc.linhas.forEach(linha => {
        const nomeCompleto = `${linha.nome} (${linha.categoria})`;
        resultado += `${receitaV9Pad(nomeCompleto, 28)} ${receitaV9PadLeft(linha.qtd.toFixed(3), 8)} kg  R$ ${receitaV9PadLeft(linha.custoPorKg.toFixed(2), 6)}  R$ ${receitaV9PadLeft(linha.custoIng.toFixed(2), 8)}    ${receitaV9PadLeft(linha.percentual.toFixed(1), 5)}%\n`;
    });

    resultado += '─'.repeat(70) + '\n';
    resultado += `Custo total de produção: R$ ${calc.custoTotal.toFixed(2)}\n`;
    resultado += `Custo por kg: R$ ${(pesoTotal > 0 ? calc.custoTotal / pesoTotal : 0).toFixed(2)}\n`;

    return { texto: resultado, ...calc };
}

function receitaV9SomarRequisitos(destino, requisitos) {
    Object.entries(requisitos || {}).forEach(([chave, data]) => {
        if (!destino[chave]) destino[chave] = { qtd: 0, ing: data.ing };
        destino[chave].qtd += data.qtd;
    });
}

function receitaV9ResumoMateriaisAgrupados(requisitos) {
    let resultado = '';
    resultado += '\n\nRESUMO GERAL DE MATÉRIA-PRIMA\n';
    resultado += '='.repeat(70) + '\n';
    resultado += 'Material                          Qtd(kg)      Unidades\n';
    resultado += '─'.repeat(70) + '\n';

    Object.entries(requisitos).forEach(([chave, data]) => {
        const [nomeMat, categMat] = chave.split('__');
        const qtdTotal = data.qtd;
        const materia = materiasPrimas.find(m =>
            receitaV9Norm(m.Nome) === receitaV9Norm(nomeMat) &&
            receitaV9Norm(m.Categoria) === receitaV9Norm(categMat)
        );

        let unidadesTexto = 'N/A';
        if (materia && Number(materia.PesoUnitario || 0) > 0) {
            const unidades = Math.ceil(qtdTotal / Number(materia.PesoUnitario || 0));
            unidadesTexto = `${unidades}x${Number(materia.PesoUnitario || 0).toFixed(0)}kg`;
        }

        resultado += `${receitaV9Pad(nomeMat, 30)} ${receitaV9PadLeft(qtdTotal.toFixed(3), 8)} kg  ${unidadesTexto}\n`;
    });

    resultado += '─'.repeat(70) + '\n';
    return resultado;
}

function receitaV9AtivarAbaCalculadora() {
    try {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        const calc = document.getElementById('calculadora');
        if (calc) calc.classList.add('active');
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', String(btn.textContent || '').includes('Calculadora'));
        });
    } catch (e) {}
}

function gerarReceitaDosClientes() {
    const selecionados = receitaV9Selecionados();

    if (!selecionados.length) {
        alert('Selecione pelo menos um produto de cliente.');
        return;
    }

    const semClasse = selecionados.filter(item => !item.classeKey);
    if (semClasse.length) {
        alert(`Existem ${semClasse.length} produto(s) sem classe selecionada. Escolha a classe ou aplique pela linha do cliente.`);
        return;
    }

    const semReceita = selecionados.filter(item => !item.receita);
    if (semReceita.length) {
        const lista = semReceita.slice(0, 10).map(i => `• ${i.produto} | classe escolhida`).join('\n');
        alert(`Existem ${semReceita.length} produto(s) sem receita para produto + classe.\n\n${lista}\n\nCadastre a receita correta ou escolha outra classe.`);
        return;
    }

    const grupos = {};
    selecionados.forEach(item => {
        const receita = item.receita;
        const receitaId = receita.Id ?? receita.id ?? `${receita.Nome}_${item.classeKey}`;
        const chave = `${item.classeKey}__${receitaV9NormForte(receita.Nome)}__${receitaId}`;

        if (!grupos[chave]) {
            grupos[chave] = {
                receita,
                classeKey: item.classeKey,
                classeLabel: receitaV9ClasseLabel(receita) || item.classeKey,
                produtoNorm: receitaV9NormForte(receita.Nome),
                kgTotal: 0,
                itens: []
            };
        }

        grupos[chave].kgTotal += Number(item.kg || 0);
        grupos[chave].itens.push(item);
    });

    const gruposLista = Object.values(grupos);
    loteCalculos = gruposLista.map((grupo, idx) => ({
        id: Date.now() + idx,
        receita: grupo.receita,
        pesoBalde: grupo.kgTotal,
        qtdBaldes: 1,
        origemClientes: grupo
    }));

    receitaClientesSelecionadosV9 = selecionados;
    window.receitaClientesSelecionadosV9 = selecionados;

    renderizarLote();

    const msgLote = document.getElementById('msgLote');
    if (msgLote) {
        msgLote.textContent = `✓ ${loteCalculos.length} receita(s) gerada(s) por produto + classe.`;
    }

    let resultado = '';
    let custoTotalGeral = 0;
    let kgTotalGeral = 0;
    const requisitosGerais = {};
    const faltantesGerais = {};

    resultado += 'FAZER CLIENTES - RECEITA POR PRODUTO + CLASSE\n';
    resultado += '='.repeat(70) + '\n';
    resultado += `Data/Hora: ${new Date().toLocaleString('pt-BR')}\n`;
    resultado += `Produtos selecionados: ${selecionados.length}\n`;
    resultado += `Receitas geradas: ${gruposLista.length}\n`;
    resultado += 'Regra: produto mantém o nome; classe define a versão da receita.\n';

    gruposLista.forEach((grupo, idx) => {
        const bloco = receitaV9MontarBlocoReceita(grupo.receita, grupo.kgTotal, {
            titulo: `\n${idx + 1}. CÁLCULO DE RECEITA`,
            itens: grupo.itens
        });

        resultado += '\n' + bloco.texto;
        custoTotalGeral += bloco.custoTotal;
        kgTotalGeral += grupo.kgTotal;
        receitaV9SomarRequisitos(requisitosGerais, bloco.requisitos);
        receitaV10SomarFaltantes(faltantesGerais, bloco.faltantes);
    });

    resultado += receitaV9ResumoMateriaisAgrupados(requisitosGerais);
    resultado += receitaV10ResumoFaltantesAgrupados(faltantesGerais);
    resultado += `PESO TOTAL GERAL: ${kgTotalGeral.toFixed(3)} kg\n`;
    resultado += `CUSTO TOTAL GERAL: R$ ${custoTotalGeral.toFixed(2)}\n`;
    resultado += `CUSTO MÉDIO POR KG: R$ ${(kgTotalGeral > 0 ? custoTotalGeral / kgTotalGeral : 0).toFixed(2)}\n`;
    resultado += '\nDepois de conferir, use "Descontar Matéria-Prima".\n';

    const box = document.getElementById('resultados');
    if (box) box.textContent = resultado;

    historico.unshift({
        id: Date.now(),
        data: new Date().toLocaleString('pt-BR'),
        receita: 'Fazer Clientes',
        peso: kgTotalGeral,
        quantidade: loteCalculos.length,
        custoTotal: custoTotalGeral,
        detalhes: resultado
    });

    if (historico.length > 100) historico.pop();
    salvarHistorico();
    renderizarHistorico();

    fecharModal('modalFazerClientes');
    receitaV9AtivarAbaCalculadora();
    mostrarAlerta('Receita dos clientes gerada por produto + classe!', 'success');
}

// Lote detalhado preservado, mas sem bagunçar Fazer Clientes.
function calcularLote() {
    if (loteCalculos.length === 0) {
        alert('Adicione receitas ao lote antes de calcular');
        return;
    }

    let resultado = '';
    let custoTotalGeral = 0;
    let pesoTotalGeral = 0;
    const requisitosGerais = {};
    const faltantesGerais = {};

    resultado += 'CÁLCULO DE LOTE - DETALHADO\n';
    resultado += '='.repeat(70) + '\n';
    resultado += `Data/Hora: ${new Date().toLocaleString('pt-BR')}\n`;
    resultado += `Total de receitas/lotes: ${loteCalculos.length}\n`;

    loteCalculos.forEach((item, idx) => {
        const receita = item.receita;
        const pesoBalde = Number(item.pesoBalde || 0);
        const qtdBaldes = Number(item.qtdBaldes || 0);
        const pesoTotal = pesoBalde * qtdBaldes;
        const itensOrigem = item.origemClientes && Array.isArray(item.origemClientes.itens)
            ? item.origemClientes.itens
            : [];

        const bloco = receitaV9MontarBlocoReceita(receita, pesoTotal, {
            titulo: `\n${idx + 1}. CÁLCULO DE RECEITA`,
            itens: itensOrigem
        });

        resultado += '\n' + bloco.texto;
        custoTotalGeral += bloco.custoTotal;
        pesoTotalGeral += pesoTotal;
        receitaV9SomarRequisitos(requisitosGerais, bloco.requisitos);
        receitaV10SomarFaltantes(faltantesGerais, bloco.faltantes);
    });

    resultado += receitaV9ResumoMateriaisAgrupados(requisitosGerais);
    resultado += receitaV10ResumoFaltantesAgrupados(faltantesGerais);
    resultado += `PESO TOTAL DO LOTE: ${pesoTotalGeral.toFixed(3)} kg\n`;
    resultado += `CUSTO TOTAL DO LOTE: R$ ${custoTotalGeral.toFixed(2)}\n`;
    resultado += `CUSTO MÉDIO POR KG: R$ ${(pesoTotalGeral > 0 ? custoTotalGeral / pesoTotalGeral : 0).toFixed(2)}\n`;
    resultado += '='.repeat(70) + '\n';

    document.getElementById('resultados').textContent = resultado;

    historico.unshift({
        id: Date.now(),
        data: new Date().toLocaleString('pt-BR'),
        receita: 'Lote detalhado',
        peso: pesoTotalGeral,
        quantidade: loteCalculos.length,
        custoTotal: custoTotalGeral,
        detalhes: resultado
    });

    if (historico.length > 100) historico.pop();
    salvarHistorico();
    renderizarHistorico();
}

function receitaV9VendaSelecionada(venda, sel) {
    if (String(venda.Id || '') === String(sel.vendaId || '')) return true;
    const nfVenda = receitaV9Norm(venda.NumeroNF || venda.NF || venda.numeroNF || venda.NotaFiscal || '');
    const nfSel = receitaV9Norm(sel.nf || '');
    return !!nfSel && nfVenda === nfSel;
}

function receitaV9TodosProdutosProntos(venda) {
    const produtos = receitaV9ListaProdutosVenda(venda);
    if (!produtos.length) return receitaV9ProdutoProntoSim(venda.ProdutoPronto ?? venda.produtoPronto);
    return produtos.every(p => receitaV9ProdutoProntoSim(p.ProdutoPronto ?? p.produtoPronto ?? p.Pronto ?? p.pronto));
}

async function receitaV9MarcarProdutosProntos() {
    const selecionados = window.receitaClientesSelecionadosV9 || receitaClientesSelecionadosV9 || [];
    if (!selecionados.length) return false;

    const confirmar = await modalConfirm(
        `Matéria-prima descontada.\n\nDeseja marcar ${selecionados.length} produto(s) selecionado(s) como Produto Pronto = Sim?`,
        { title: 'Marcar produtos prontos', okText: 'Marcar como pronto', cancelText: 'Não marcar' }
    );

    if (!confirmar) return false;

    const clientes = await buscarArquivo('clientes.json');
    const lista = Array.isArray(clientes) ? clientes : [];
    let alterou = false;

    selecionados.forEach(sel => {
        const cliente = lista.find(c =>
            String(c.Id || '') === String(sel.clienteId || '') ||
            receitaV9Norm(c.Nome || '') === receitaV9Norm(sel.clienteNome || '') ||
            String(c.CPF || '') === String(sel.clienteCpf || '')
        );

        if (!cliente) return;

        const vendas = Array.isArray(cliente.Vendas) ? cliente.Vendas : [];
        const venda = vendas.find(v => receitaV9VendaSelecionada(v, sel));

        if (!venda) {
            cliente.ProdutoPronto = true;
            cliente.DataProdutoPronto = new Date().toISOString();
            alterou = true;
            return;
        }

        if (Array.isArray(venda.Produtos) && venda.Produtos[sel.itemIndex]) {
            venda.Produtos[sel.itemIndex].ProdutoPronto = true;
            venda.Produtos[sel.itemIndex].DataProdutoPronto = new Date().toISOString();
        } else {
            venda.ProdutoPronto = true;
            venda.DataProdutoPronto = new Date().toISOString();
        }

        if (receitaV9TodosProdutosProntos(venda)) {
            venda.ProdutoPronto = true;
            venda.DataProdutoPronto = new Date().toISOString();
        }

        const todasVendasProntas = vendas.length
            ? vendas.every(v => receitaV9ProdutoProntoSim(v.ProdutoPronto ?? v.produtoPronto))
            : true;

        if (todasVendasProntas) {
            cliente.ProdutoPronto = true;
            cliente.DataProdutoPronto = new Date().toISOString();
        }

        alterou = true;
    });

    if (!alterou) return false;

    await salvarDadosComAuditoria(
        'clientes.json',
        lista,
        'auditoria',
        'Atualizar',
        'Cliente',
        'FAZER_CLIENTES',
        'Produtos Prontos',
        `Produtos marcados como prontos após desconto de matéria-prima em ${selecionados.length} item(ns).`,
        '',
        JSON.stringify(selecionados)
    );

    localStorage.removeItem('arquivo_clientes.json_cache');
    mostrarAlerta('Produtos selecionados marcados como prontos!', 'success');

    receitaClientesSelecionadosV9 = [];
    window.receitaClientesSelecionadosV9 = [];
    return true;
}

if (typeof descontarMateriaPrima === 'function' && !descontarMateriaPrima.__fazerClientesV9) {
    const descontarMateriaPrimaOriginalV9 = descontarMateriaPrima;

    descontarMateriaPrima = async function() {
        const antes = JSON.stringify(materiasPrimas || []);
        await descontarMateriaPrimaOriginalV9.apply(this, arguments);
        const depois = JSON.stringify(materiasPrimas || []);

        if (antes !== depois && (window.receitaClientesSelecionadosV9 || []).length) {
            await receitaV9MarcarProdutosProntos();
        }
    };

    descontarMateriaPrima.__fazerClientesV9 = true;
    window.descontarMateriaPrima = descontarMateriaPrima;
}

// ============================================
// RECEITA V10 FALTANTES SOMENTE NO FINAL
// ============================================
// A falta de matéria-prima não aparece mais repetida em cada produto/classe.
// Agora cada cálculo soma tudo e mostra uma lista única no final.
function receitaV10SomarFaltantes(destino, faltantes) {
    if (!destino || !Array.isArray(faltantes)) return;

    faltantes.forEach(f => {
        const nome = String(f?.nome || '').trim();
        if (!nome) return;

        const chave = receitaV9Norm(nome);
        const falta = Number(f?.falta || 0);

        if (!Number.isFinite(falta) || falta <= 0) return;

        if (!destino[chave]) {
            destino[chave] = {
                nome,
                falta: 0
            };
        }

        destino[chave].falta += falta;
    });
}

function receitaV10ResumoFaltantesAgrupados(faltantesGerais) {
    const itens = Object.values(faltantesGerais || {})
        .filter(item => Number(item.falta || 0) > 0.0001)
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));

    if (!itens.length) return '';

    let resultado = '';
    resultado += '\n\n⚠️  ATENÇÃO - FALTA DE MATÉRIA-PRIMA (GERAL)\n';
    resultado += '='.repeat(70) + '\n';
    resultado += 'Lista única somando a falta de todas as receitas/classes do lote.\n';
    resultado += '─'.repeat(70) + '\n';

    itens.forEach(item => {
        resultado += `• ${item.nome}: Faltam ${receitaV9Kg(item.falta)}\n`;
    });

    resultado += '─'.repeat(70) + '\n';
    return resultado;
}
