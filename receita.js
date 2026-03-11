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
            document.getElementById('custoPorKgReceita').value = receita.CustoPorKg || 0;
            document.getElementById('descricaoReceita').value = receita.Descricao || '';
        }
    } else {
        document.querySelector('#modalReceita .modal-header h2').textContent = 'Nova Receita';
        document.getElementById('nomeReceita').value = '';
        document.getElementById('classeReceita').value = '';
        document.getElementById('pesoReceita').value = 10;
        document.getElementById('custoPorKgReceita').value = 0;
        document.getElementById('descricaoReceita').value = '';
    }

    abrirModal('modalReceita');
}

function salvarReceita() {
    const nome = document.getElementById('nomeReceita').value.trim();
    const classe = document.getElementById('classeReceita').value.trim();
    const peso = parseFloat(document.getElementById('pesoReceita').value) || 0;
    const custoPorKg = parseFloat(document.getElementById('custoPorKgReceita').value) || 0;
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

function deletarReceita(id) {
    if (confirm('Tem certeza que deseja deletar esta receita?')) {
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
            document.getElementById('valorMateria').value = materia.ValorUnitario || 0;
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
    const valorUnitario = parseFloat(document.getElementById('valorMateria').value) || 0;
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

function deletarMateria(id) {
    if (confirm('Tem certeza que deseja deletar esta matéria-prima?')) {
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

function limparLote() {
    if (confirm('Tem certeza que deseja limpar o lote?')) {
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

function limparHistorico() {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
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
        if (!confirm(mensagemConfirmacao)) {
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
