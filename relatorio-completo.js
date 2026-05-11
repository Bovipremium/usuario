/* ============================================================
   RELATÓRIO COMPLETO V5
   - DRE gerencial
   - Caixa separado de lucro
   - Rentabilidade por produto, venda e cliente
   - Categorias inteligentes de despesas
   ============================================================ */
let rcClientes = [];
let rcDespesas = [];
let rcContas = [];
let rcReceitas = [];
let rcTransportes = [];
let rcCategoriasCustomizadas = {};
let rcMotorCategorias = null;
let rcCharts = [];
let rcUltimoRelatorio = null;

window.addEventListener('load', async () => {
  try {
    await carregarDadosRelatorioCompleto();
    rcMotorCategorias = CategoriasInteligentes.criarMotor(rcDespesas, rcCategoriasCustomizadas);
    popularFiltrosRelatorioCompleto();
    await atualizarRelatorioCompleto();
  } catch (erro) {
    console.error('❌ Erro ao iniciar Relatório Completo:', erro);
    document.getElementById('relatorioCompletoConteudo').innerHTML = `
      <div class="card">
        <h2 class="section-title">Erro ao carregar</h2>
        <p>${escaparHtml(erro.message || String(erro))}</p>
      </div>
    `;
  }
});

async function buscarArquivoRelatorioCompleto(nome) {
  try {
    const url = `${CONFIG.API_URL}?acao=buscar&arquivo=${encodeURIComponent(nome)}`;
    const resposta = await AuthManager.requisicaoSegura(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return await resposta.json();
  } catch (erro) {
    console.warn(`⚠️ Não consegui carregar ${nome}:`, erro);
    return [];
  }
}
function normalizarArray(dados) {
  if (Array.isArray(dados)) return dados;
  if (dados && Array.isArray(dados.dados)) return dados.dados;
  if (dados && Array.isArray(dados.items)) return dados.items;
  if (dados && typeof dados === 'object' && Object.keys(dados).length) return [dados];
  return [];
}
async function carregarDadosRelatorioCompleto() {
  const [clientes, despesas, contas, receitas, transportes, categorias] = await Promise.all([
    buscarArquivoRelatorioCompleto('clientes.json'),
    buscarArquivoRelatorioCompleto('despesas.json'),
    buscarArquivoRelatorioCompleto('contas.json'),
    buscarArquivoRelatorioCompleto('receitas.json'),
    buscarArquivoRelatorioCompleto('transporte.json'),
    buscarArquivoRelatorioCompleto('categorias_customizadas.json')
  ]);
  rcClientes = normalizarArray(clientes);
  rcDespesas = normalizarArray(despesas);
  rcContas = normalizarArray(contas);
  rcReceitas = normalizarArray(receitas);
  rcTransportes = normalizarArray(transportes);
  rcCategoriasCustomizadas = categorias && !Array.isArray(categorias) && typeof categorias === 'object' ? categorias : {};
}
function clienteChave(c) { return String(c.Id || c.CPF_CNPJ || c.CPF || c.Nome || ''); }
function clienteNome(c) { return c.Nome || c.NomeCompleto || 'Cliente sem nome'; }
function dataLocal(v) {
  if (!v) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [a,m,d]=s.split('-').map(Number); return new Date(a,m-1,d); }
  const dt = new Date(v); return Number.isNaN(dt.getTime()) ? null : dt;
}
function noPeriodo(v, mes, ano) {
  const d=dataLocal(v); if(!d) return false;
  if(mes && d.getMonth()+1!==Number(mes)) return false;
  if(ano && d.getFullYear()!==Number(ano)) return false;
  return true;
}
function coletarAno(set, v){ const d=dataLocal(v); if(d) set.add(d.getFullYear()); }
function obterAnosComDados(){
  const anos=new Set([new Date().getFullYear()]);
  rcClientes.forEach(c=>{ coletarAno(anos,c.DataCadastro); (c.Vendas||[]).forEach(v=>{coletarAno(anos,v.DataVenda); (v.Parcelas||[]).forEach(p=>{coletarAno(anos,p.DataVencimento);coletarAno(anos,p.DataPagamento);});});});
  rcDespesas.forEach(d=>{ if(d.Ano) anos.add(Number(d.Ano)); coletarAno(anos,d.DataCadastro); coletarAno(anos,d.DataPagamento);});
  rcContas.forEach(c=>coletarAno(anos,c.DataPagamento));
  rcTransportes.forEach(t=>{coletarAno(anos,t.DataPagamentoFrete);coletarAno(anos,t.DataCadastro);});
  return [...anos].filter(a=>Number.isInteger(a)&&a>1900&&a<3000);
}
function popularFiltrosRelatorioCompleto(){
  const agora=new Date(), anos=obterAnosComDados(), vendedores=new Set();
  rcClientes.forEach(c=>{if(c.Vendedor)vendedores.add(c.Vendedor);(c.Vendas||[]).forEach(v=>{if(v.VendedorVenda)vendedores.add(v.VendedorVenda);if(v.Vendedor)vendedores.add(v.Vendedor);});});
  const mes=document.getElementById('filtroMes'); if(![...mes.options].some(o=>o.value==='')) mes.insertAdjacentHTML('afterbegin','<option value="">Todos os meses</option>');
  const ano=document.getElementById('filtroAno'); ano.innerHTML='<option value="">Todos os anos</option>'+anos.sort((a,b)=>b-a).map(a=>`<option value="${a}">${a}</option>`).join('');
  mes.value=agora.getMonth()+1; ano.value=anos.includes(agora.getFullYear())?agora.getFullYear():'';
  document.getElementById('filtroVendedor').innerHTML='<option value="">Todos os vendedores</option>'+[...vendedores].filter(Boolean).sort().map(v=>`<option value="${escaparHtml(v)}">${escaparHtml(v)}</option>`).join('');
  document.getElementById('filtroCliente').innerHTML='<option value="">Todos os clientes</option>'+[...rcClientes].sort((a,b)=>clienteNome(a).localeCompare(clienteNome(b))).map(c=>`<option value="${escaparHtml(clienteChave(c))}">${escaparHtml(clienteNome(c))}</option>`).join('');
}
function periodoSelecionado(){const m=document.getElementById('filtroMes').value,a=document.getElementById('filtroAno').value;return{mes:m?Number(m):null,ano:a?Number(a):null,vendedor:document.getElementById('filtroVendedor').value||'',clienteId:document.getElementById('filtroCliente').value||''};}
function valorNumerico(v){if(typeof v==='number')return v||0;const s=String(v||'').replace(/R\$/gi,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');const n=parseFloat(s);return Number.isNaN(n)?0:n;}
function moeda(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);}
function percentual(v){return Number.isFinite(v)?`${v.toFixed(2).replace('.',',')}%`:'Não calculável';}
function normalizarNome(v){return CategoriasInteligentes.normalizarTexto(v);}
function valorVenda(v){const n=valorNumerico(v.ValorTotal||v.Valor||v.Total||v.ValorVenda);return n>0?n:(v.Produtos||[]).reduce((s,p)=>s+valorNumerico(p.Valor),0);}
function vendedorVenda(c,v){return v.VendedorVenda||v.Vendedor||c.Vendedor||'';}
function vendasFiltradas(m,a,vend,cli){const out=[];rcClientes.forEach(c=>{if(cli&&clienteChave(c)!==cli)return;(c.Vendas||[]).forEach(v=>{if(!noPeriodo(v.DataVenda,m,a))return;const ve=vendedorVenda(c,v);if(vend&&ve!==vend)return;out.push({cliente:c,venda:v,vendedor:ve});});});return out;}
function mapaCustosReceitas(){const m=new Map();rcReceitas.forEach(r=>{const n=normalizarNome(r.Nome);if(!n)return;let ck=valorNumerico(r.CustoPorKg);if(!ck){const ct=(r.Ingredientes||[]).reduce((s,i)=>s+valorNumerico(i.CustoPorKg)*valorNumerico(i.Quantidade),0),peso=valorNumerico(r.PesoPadrao);ck=peso>0?ct/peso:0;}m.set(n,ck);});return m;}
function produtosDaVenda(v,custos){return(v.Produtos||[]).map(p=>{const nome=p.Nome||'Produto sem nome',chave=normalizarNome(nome),q=valorNumerico(p.Quantidade),pu=valorNumerico(p.PesoUnidade),kg=q*pu,receita=valorNumerico(p.Valor),custoKg=custos.get(chave)||null;return{nome,chave,kg,receita,custoKg,cmv:custoKg?kg*custoKg:0};});}
function regrasImpostoAtivasNaData(data){const alvo=dataLocal(data),map=new Map();if(!alvo)return[];rcContas.filter(c=>c.TipoConta==='imposto_percentual').forEach(c=>{const ini=dataLocal(c.DataPagamento);if(!ini||ini>alvo)return;const k=normalizarNome(c.Descricao||'IMPOSTO'),ant=map.get(k);if(!ant||dataLocal(ant.DataPagamento)<ini)map.set(k,c);});return[...map.values()];}
function percentualImpostoVenda(data){return regrasImpostoAtivasNaData(data).reduce((s,c)=>s+valorNumerico(c.Percentual),0);}
function taxaBoletoUnicaNaData(data){const alvo=dataLocal(data)||new Date(),ativas=rcContas.filter(c=>c.TipoConta==='taxa_boleto').filter(c=>{const ini=dataLocal(c.DataPagamento);return ini&&ini<=alvo;}),taxas=[...new Set(ativas.map(c=>valorNumerico(c.TaxaPorBoleto)).filter(v=>v>0))];return taxas.length===1?taxas[0]:null;}
function fretesVinculadosVenda(c,v){const nf=String(v.NumeroNF||'').trim();return nf?rcTransportes.filter(t=>String(t.NumeroNF||'').trim()===nf):[];}
function analisarVenda(item,custos){const{cliente,venda}=item,produtos=produtosDaVenda(venda,custos),vendido=valorVenda(venda),valorProdutos=produtos.reduce((s,p)=>s+p.receita,0),kg=produtos.reduce((s,p)=>s+p.kg,0),cmv=produtos.reduce((s,p)=>s+p.cmv,0),sem=produtos.filter(p=>!p.custoKg).map(p=>p.nome),impPct=percentualImpostoVenda(venda.DataVenda),imposto=vendido*impPct/100,fretes=fretesVinculadosVenda(cliente,venda),frete=fretes.reduce((s,t)=>s+valorNumerico(t.ValorFrete),0),pagas=(venda.Parcelas||[]).filter(p=>p.Pago&&!p.BaixadaPorQuitacao&&!p.QuitadaPorRecebimentoUnico),taxaUn=taxaBoletoUnicaNaData(venda.DataVenda),taxa=taxaUn===null?null:pagas.length*taxaUn,contrib=vendido-cmv-imposto-frete-(taxa||0),gap=vendido-valorProdutos;return{cliente,venda,produtos,vendido,valorProdutos,kg,cmv,sem,imposto,frete,taxa,contrib,margem:vendido>0?contrib/vendido*100:null,gap,confianca:sem.length||Math.abs(gap)>0.01?'provisória':'alta'};}
function calcularRecebido(m,a,vend,cli){let t=0;rcClientes.forEach(c=>{if(cli&&clienteChave(c)!==cli)return;(c.Vendas||[]).forEach(v=>{if(vend&&vendedorVenda(c,v)!==vend)return;if(v.QuitacaoRecebimentoUnico&&noPeriodo(v.QuitacaoRecebimentoUnico.Data,m,a))t+=valorNumerico(v.QuitacaoRecebimentoUnico.ValorRecebido);(v.Parcelas||[]).forEach(p=>{if(!p.Pago||p.BaixadaPorQuitacao||p.QuitadaPorRecebimentoUnico)return;if(noPeriodo(p.DataPagamento,m,a))t+=valorNumerico(p.ValorPago||p.Valor);});});});return t;}
function calcularRecebiveis(m,a,vend,cli){const hoje=new Date();hoje.setHours(23,59,59,999);let aberto=0,atraso=0,base=0,pagos=0,abertos=0,atrasados=0;rcClientes.forEach(c=>{if(cli&&clienteChave(c)!==cli)return;(c.Vendas||[]).forEach(v=>{if(vend&&vendedorVenda(c,v)!==vend)return;(v.Parcelas||[]).forEach(p=>{if(!noPeriodo(p.DataVencimento,m,a))return;const val=valorNumerico(p.Valor),dv=dataLocal(p.DataVencimento);if(p.Pago){pagos++;return;}aberto+=val;abertos++;if(dv&&dv<=hoje){atraso+=val;base+=val;atrasados++;}});});});return{aberto,atraso,base,taxa:base>0?atraso/base*100:0,pagos,abertos,atrasados};}
function despesaValida(d){
  const descricao=normalizarNome(d.Descricao||'');
  const valor=valorNumerico(d.Valor);
  if(!descricao||valor<=0)return false;
  if(descricao==='SALDO ANTERIOR')return false;
  return true;
}
function despesasNoPeriodo(m,a){
  return rcDespesas
    .filter(d=>d.Mes&&d.Ano?(!m||Number(d.Mes)===m)&&(!a||Number(d.Ano)===a):noPeriodo(d.DataPagamento||d.Data||d.DataCadastro,m,a))
    .filter(despesaValida)
    .map(d=>({...d,CategoriaAnalitica:CategoriasInteligentes.categorizar(d.Descricao,d.Categoria,rcMotorCategorias)}));
}
function resumirDespesas(lista){const por={},reclass=[],sus=[];let total=0;lista.forEach(d=>{const v=valorNumerico(d.Valor),cat=d.CategoriaAnalitica||'SEM CATEGORIA',orig=CategoriasInteligentes.normalizarCategoria(d.Categoria);total+=v;por[cat]=(por[cat]||0)+v;if(cat&&cat!==orig)reclass.push(d);if(CategoriasInteligentes.categoriaEhSuspeita(d.Categoria))sus.push(d);});return{lista,total,por,reclass,sus};}
function intervaloMesesConta(c){return({mensal:1,bimestral:2,trimestral:3,semestral:6,anual:12})[c.Frequencia]||null;}
function formatarDataISO(d){if(!d)return'';const x=dataLocal(d);if(!x)return'';return`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;}
function ocorrenciaConta(c,dataISO){
  const mapa=c.Ocorrencias&&typeof c.Ocorrencias==='object'&&!Array.isArray(c.Ocorrencias)?c.Ocorrencias:{};
  if(mapa[dataISO])return mapa[dataISO];
  if(dataISO===formatarDataISO(c.DataPagamento))return{StatusPagamento:c.StatusPagamento||'Não Pago',DataPago:c.DataPago||null,Valor:valorNumerico(c.Valor),Notas:c.Notas||''};
  return{StatusPagamento:'Não Pago',DataPago:null,Valor:valorNumerico(c.Valor),Notas:''};
}
function contasCompromissosPeriodo(m,a){
  if(!m||!a)return[];
  const out=[];
  rcContas.filter(c=>(c.TipoConta||'fixa')==='fixa').forEach(c=>{
    const base=dataLocal(c.DataPagamento);if(!base)return;
    const fim=new Date(a,m,0,23,59,59,999);if(fim<base)return;
    if(!c.IsRecorrente){if(noPeriodo(c.DataPagamento,m,a)){const dataISO=formatarDataISO(c.DataPagamento),o=ocorrenciaConta(c,dataISO);out.push({...c,...o,DataPagamento:dataISO,DataOcorrencia:dataISO});}return;}
    if(c.Frequencia==='quinzenal'){const ini=new Date(a,m-1,1),d=new Date(base);while(d<ini)d.setDate(d.getDate()+15);while(d<=fim){const dataISO=formatarDataISO(d),o=ocorrenciaConta(c,dataISO);out.push({...c,...o,DataPagamento:dataISO,DataOcorrencia:dataISO,ProjecaoRecorrente:dataISO!==formatarDataISO(c.DataPagamento)});d.setDate(d.getDate()+15);}return;}
    const iv=intervaloMesesConta(c);if(!iv)return;
    const diff=(a-base.getFullYear())*12+((m-1)-base.getMonth());if(diff<0||diff%iv!==0)return;
    const dia=Math.min(base.getDate(),new Date(a,m,0).getDate()),dataISO=`${a}-${String(m).padStart(2,'0')}-${String(dia).padStart(2,'0')}`,o=ocorrenciaConta(c,dataISO);
    out.push({...c,...o,DataPagamento:dataISO,DataOcorrencia:dataISO,ProjecaoRecorrente:dataISO!==formatarDataISO(c.DataPagamento)});
  });
  return out;
}
function resumirCompromissos(contas){
  const hoje=new Date();hoje.setHours(23,59,59,999);
  let totalPrevisto=0,totalPago=0,totalAberto=0,totalVencido=0,pagas=0,abertas=0,vencidas=0;
  contas.forEach(c=>{const v=valorNumerico(c.Valor),dt=dataLocal(c.DataPagamento),pago=c.StatusPagamento==='Pago'||c.StatusPagamento==='PAGO';totalPrevisto+=v;if(pago){totalPago+=v;pagas++;}else{totalAberto+=v;abertas++;if(dt&&dt<=hoje){totalVencido+=v;vencidas++;}}});
  return{lista:contas,totalPrevisto,totalPago,totalAberto,totalVencido,pagas,abertas,vencidas};
}
function fretesNoPeriodo(m,a){return rcTransportes.filter(t=>noPeriodo(t.DataPagamentoFrete||t.DataCadastro,m,a));}
function taxasBoletoPeriodo(m,a,vend,cli){let qtd=0;rcClientes.forEach(c=>{if(cli&&clienteChave(c)!==cli)return;(c.Vendas||[]).forEach(v=>{if(vend&&vendedorVenda(c,v)!==vend)return;(v.Parcelas||[]).forEach(p=>{if(p.Pago&&!p.BaixadaPorQuitacao&&!p.QuitadaPorRecebimentoUnico&&noPeriodo(p.DataPagamento,m,a))qtd++;});});});const regras=rcContas.filter(c=>c.TipoConta==='taxa_boleto'),tx=regras.length===1?valorNumerico(regras[0].TaxaPorBoleto):null;return{qtd,valor:tx===null?0:qtd*tx,calculavel:tx!==null};}
function resumoProdutos(vendas){const m=new Map();vendas.forEach(v=>v.produtos.forEach(p=>{if(!m.has(p.chave))m.set(p.chave,{nome:p.nome,kg:0,vendido:0,cmv:0,custoKg:p.custoKg||null,imposto:0,frete:0,taxa:0});const i=m.get(p.chave),prop=v.valorProdutos>0?p.receita/v.valorProdutos:0;i.kg+=p.kg;i.vendido+=p.receita;i.cmv+=p.cmv;i.imposto+=v.imposto*prop;i.frete+=v.frete*prop;i.taxa+=(v.taxa||0)*prop;}));return[...m.values()].map(p=>({...p,precoKg:p.kg>0?p.vendido/p.kg:null,lucroBruto:p.vendido-p.cmv,margemBruta:p.vendido>0&&p.custoKg?(p.vendido-p.cmv)/p.vendido*100:null,contrib:p.vendido-p.cmv-p.imposto-p.frete-p.taxa,margemContrib:p.vendido>0?(p.vendido-p.cmv-p.imposto-p.frete-p.taxa)/p.vendido*100:null}));}
function resumoClientes(vendas,rateio){const m=new Map(),total=vendas.reduce((s,v)=>s+v.vendido,0);vendas.forEach(v=>{const k=clienteChave(v.cliente);if(!m.has(k))m.set(k,{cliente:clienteNome(v.cliente),vendido:0,cmv:0,frete:0,contrib:0});const i=m.get(k);i.vendido+=v.vendido;i.cmv+=v.cmv;i.frete+=v.frete;i.contrib+=v.contrib;});return[...m.values()].map(c=>{const r=total>0?rateio*c.vendido/total:0;return{...c,margem:c.vendido>0?c.contrib/c.vendido*100:null,lucroLiquido:c.contrib-r};});}
function qualidade(vendas,produtos){const vendido=vendas.reduce((s,v)=>s+v.vendido,0),prod=vendas.reduce((s,v)=>s+v.valorProdutos,0),custo=produtos.filter(p=>p.custoKg).reduce((s,p)=>s+p.vendido,0);return{vendido,prod,dif:vendido-prod,cobProd:vendido>0?prod/vendido*100:100,cobCusto:prod>0?custo/prod*100:0,ok:vendido>0&&prod/vendido>=.95&&prod>0&&custo/prod>=.95};}
function diagnosticos(d){const out=[];if(!d.q.ok)out.push({t:'alerta',x:`Margens provisórias: ${percentual(d.q.cobProd)} das vendas têm produtos detalhados e ${percentual(d.q.cobCusto)} do valor dos produtos tem custo mapeado.`});if(d.sem.length)out.push({t:'alerta',x:`Produtos sem custo mapeado: ${d.sem.slice(0,6).join(', ')}.`});if(d.vendido>0&&d.recebido/d.vendido<.5)out.push({t:'alerta',x:`Caixa fraco: só ${percentual(d.recebido/d.vendido*100)} do vendido virou dinheiro recebido.`});if(d.rec.taxa>10)out.push({t:'alerta',x:`Inadimplência elevada: ${percentual(d.rec.taxa)} da base vencida está em atraso.`});if(d.desp.reclass.length)out.push({t:'info',x:`${d.desp.reclass.length} despesa(s) reais foram consolidadas por categoria inteligente.`});if(d.desp.sus.length)out.push({t:'aviso',x:`${d.desp.sus.length} despesa(s) reais tinham categoria original fraca; o relatório usou categoria analítica inteligente.`});if(d.comp.vencidas>0)out.push({t:'alerta',x:`Há ${d.comp.vencidas} compromisso(s) vencido(s) em aberto no período, totalizando ${moeda(d.comp.totalVencido)}.`});if(d.freteSem>0)out.push({t:'aviso',x:`${d.freteSem} frete(s) sem vínculo por NF; a rentabilidade por venda pode não conter todo o frete.`});if(d.despTrans>0&&d.frete>0)out.push({t:'aviso',x:'Há frete no módulo Transporte e despesas pagas como TRANSPORTADORA; confira se ambos representam a mesma saída para evitar dupla leitura gerencial.'});if(d.margemContrib!==null&&d.margemContrib<20)out.push({t:'alerta',x:`Margem de contribuição baixa: ${percentual(d.margemContrib)}.`});if(d.resultadoCaixa<0)out.push({t:'alerta',x:`Caixa real negativo em ${moeda(Math.abs(d.resultadoCaixa))} no período.`});if(d.ebitda<0)out.push({t:'alerta',x:`Resultado operacional gerencial negativo em ${moeda(Math.abs(d.ebitda))}.`});if(!out.length)out.push({t:'ok',x:'Com os dados disponíveis, não foram encontrados alertas críticos.'});return out;}
function calcularLTV(){const total=rcClientes.reduce((s,c)=>s+(c.Vendas||[]).reduce((x,v)=>x+valorVenda(v),0),0),n=rcClientes.filter(c=>(c.Vendas||[]).length>0).length;return n>0?total/n:null;}

function novosClientesPeriodo(m, a) {
  return rcClientes.filter(c => noPeriodo(c.DataCadastro, m, a)).length;
}
function despesasMarketingPeriodo(despesas) {
  return despesas.lista.filter(d => {
    const cat = CategoriasInteligentes.normalizarTexto(d.CategoriaAnalitica || d.Categoria || '');
    const desc = CategoriasInteligentes.normalizarTexto(d.Descricao || '');
    return ['MARKETING','FACEBOOK','META','ADS','PUBLICIDADE','TRAFEGO','TRÁFEGO','VENDAS'].some(k => cat.includes(CategoriasInteligentes.normalizarTexto(k)) || desc.includes(CategoriasInteligentes.normalizarTexto(k)));
  }).reduce((s,d)=>s+valorNumerico(d.Valor),0);
}
function resumoConcentracao(vendas, produtos) {
  const porCliente = new Map();
  vendas.forEach(v => {
    const chave = clienteNome(v.cliente);
    porCliente.set(chave, (porCliente.get(chave) || 0) + v.vendido);
  });
  const totalVendido = vendas.reduce((s,v)=>s+v.vendido,0);
  const maiorCliente = [...porCliente.entries()].sort((a,b)=>b[1]-a[1])[0] || [null,0];
  const totalProdutos = produtos.reduce((s,p)=>s+p.vendido,0);
  const maiorProduto = [...produtos].sort((a,b)=>b.vendido-a.vendido)[0] || null;
  return {
    maiorCliente: maiorCliente[0],
    participacaoMaiorCliente: totalVendido > 0 ? maiorCliente[1] / totalVendido * 100 : 0,
    maiorProduto: maiorProduto ? maiorProduto.nome : null,
    participacaoMaiorProduto: totalProdutos > 0 && maiorProduto ? maiorProduto.vendido / totalProdutos * 100 : 0
  };
}
function calcularIndicadoresEstrategicos(d) {
  const novosClientes = novosClientesPeriodo(d.p.mes, d.p.ano);
  const marketing = despesasMarketingPeriodo(d.desp);
  const cac = marketing > 0 && novosClientes > 0 ? marketing / novosClientes : null;
  const margemLiquida = d.liq > 0 ? d.ebitda / d.liq * 100 : null;
  const breakEven = d.margemContrib !== null && d.margemContrib > 0 ? d.comp.totalPrevisto / (d.margemContrib / 100) : null;
  const burnRate = d.resultadoCaixa < 0 ? Math.abs(d.resultadoCaixa) : 0;
  return {
    cac,
    novosClientes,
    marketing,
    margemLiquida,
    breakEven,
    burnRate,
    runway: null,
    roi: null,
    nps: null,
    valuation: null,
    equity: null,
    preMoney: null,
    postMoney: null
  };
}
function calcularSaudeEmpresa(d) {
  let score = 100;
  const riscos = [];
  if (!d.q.ok) { score -= 20; riscos.push('cadastro financeiro incompleto para confiar totalmente nas margens'); }
  if (d.vendido > 0 && d.recebido / d.vendido < 0.50) { score -= 20; riscos.push('baixa conversão de venda em caixa'); }
  if (d.rec.taxa > 10) { score -= 15; riscos.push('inadimplência alta'); }
  if (d.ebitda < 0) { score -= 15; riscos.push('resultado operacional negativo'); }
  if (d.resultadoCaixa < 0) { score -= 15; riscos.push('caixa real negativo'); }
  if (d.comp.vencidas > 0) { score -= 10; riscos.push('compromissos vencidos em aberto'); }
  if (d.vendido > 0 && d.frete / d.vendido > 0.15) { score -= 10; riscos.push('frete alto em relação às vendas'); }
  if (d.concentracao.participacaoMaiorCliente > 40) { score -= 8; riscos.push('dependência elevada de um cliente'); }
  if (d.concentracao.participacaoMaiorProduto > 50) { score -= 7; riscos.push('dependência elevada de um produto'); }
  score = Math.max(0, Math.round(score));
  const status = score >= 80 ? 'Saudável' : score >= 60 ? 'Atenção' : score >= 40 ? 'Frágil' : 'Crítica';
  return { score, status, riscos };
}
function montarAnaliseSobreEmpresa(d) {
  const problemas = [];
  const acoes = [];

  if (!d.q.ok) {
    problemas.push(`As margens ainda são provisórias porque ${percentual(d.q.cobProd)} das vendas têm produtos detalhados e ${percentual(d.q.cobCusto)} do valor dos produtos possui custo mapeado.`);
    acoes.push({
      titulo: 'Completar produtos e receitas primeiro',
      porque: 'Sem isso, o CMV fica subestimado e a margem pode parecer melhor do que realmente é.',
      melhora: 'A empresa passa a saber o lucro real por produto, venda e cliente.'
    });
  }
  if (d.vendido > 0 && d.recebido / d.vendido < 0.50) {
    problemas.push(`A empresa vendeu ${moeda(d.vendido)}, mas recebeu apenas ${moeda(d.recebido)} no período.`);
    acoes.push({
      titulo: 'Atacar caixa e cobrança',
      porque: 'Faturamento sem recebimento não sustenta a operação.',
      melhora: 'Mais caixa disponível, menos necessidade de capital de giro e leitura real da saúde do negócio.'
    });
  }
  if (d.rec.taxa > 10) {
    problemas.push(`A inadimplência está em ${percentual(d.rec.taxa)}.`);
    acoes.push({
      titulo: 'Criar rotina de cobrança e régua de atraso',
      porque: 'Atraso corrói caixa e aumenta risco de não receber.',
      melhora: 'Redução do contas a receber vencido e melhora da previsibilidade.'
    });
  }
  if (d.vendido > 0 && d.frete / d.vendido > 0.15) {
    problemas.push(`O frete consome ${percentual(d.frete / d.vendido * 100)} das vendas.`);
    acoes.push({
      titulo: 'Auditar fretes e repasse ao cliente',
      porque: 'Frete alto pode transformar vendas boas em vendas ruins.',
      melhora: 'Melhora da margem de contribuição por venda e por cliente.'
    });
  }
  if (d.resultadoCaixa < 0) {
    problemas.push(`O caixa real do período está negativo em ${moeda(Math.abs(d.resultadoCaixa))}.`);
    acoes.push({
      titulo: 'Proteger o caixa real',
      porque: 'A empresa pode vender e ainda assim ficar sem dinheiro se o recebido não cobrir as saídas do banco.',
      melhora: 'Menos aperto financeiro e maior capacidade de cumprir obrigações sem improviso.'
    });
  }
  if (d.comp.vencidas > 0) {
    problemas.push(`Há ${d.comp.vencidas} compromisso(s) vencido(s) em aberto, totalizando ${moeda(d.comp.totalVencido)}.`);
    acoes.push({
      titulo: 'Regularizar compromissos vencidos',
      porque: 'Contas atrasadas viram risco operacional e distorcem a leitura de saúde da empresa.',
      melhora: 'Mais previsibilidade e menor risco de juros, bloqueios ou ruptura de fornecedores.'
    });
  }
  if (d.ebitda < 0) {
    problemas.push(`O EBITDA gerencial está negativo em ${moeda(Math.abs(d.ebitda))}.`);
    acoes.push({
      titulo: 'Cortar desperdícios e revisar preço',
      porque: 'A operação está consumindo mais do que gera.',
      melhora: 'A empresa caminha para o ponto de equilíbrio e reduz o burn rate.'
    });
  }
  if (d.concentracao.participacaoMaiorCliente > 40) {
    problemas.push(`${d.concentracao.maiorCliente} concentra ${percentual(d.concentracao.participacaoMaiorCliente)} das vendas.`);
    acoes.push({
      titulo: 'Reduzir dependência de cliente',
      porque: 'Perder um cliente muito concentrado pode derrubar o faturamento.',
      melhora: 'Receita mais estável e risco comercial menor.'
    });
  }
  if (!acoes.length) {
    acoes.push({
      titulo: 'Manter disciplina e acompanhar indicadores',
      porque: 'Os principais sinais do período estão controlados.',
      melhora: 'Preserva margem, caixa e previsibilidade.'
    });
  }

  const resumo = d.saude.status === 'Crítica'
    ? 'A empresa precisa de atenção imediata. Hoje o problema principal não é apenas vender, mas transformar vendas em caixa, limpar os dados e proteger margem.'
    : d.saude.status === 'Frágil'
      ? 'A empresa tem operação, mas ainda apresenta riscos relevantes que podem esconder o lucro real ou pressionar o caixa.'
      : d.saude.status === 'Atenção'
        ? 'A empresa está operando, porém ainda há pontos que merecem correção para ganhar previsibilidade e margem.'
        : 'A empresa está saudável no período analisado, com os principais indicadores sob controle pelos dados disponíveis.';

  return { resumo, problemas, acoes };
}
function abrirSobreEmpresa() {
  if (!rcUltimoRelatorio) return;
  const d = rcUltimoRelatorio;
  const analise = d.analiseEmpresa;
  fecharSobreEmpresa();

  const overlay = document.createElement('div');
  overlay.id = 'modalSobreEmpresa';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px;';
  overlay.onclick = e => { if (e.target === overlay) fecharSobreEmpresa(); };

  overlay.innerHTML = `
    <div style="max-width:980px;width:100%;max-height:92vh;overflow:auto;background:#08120f;border:1px solid rgba(124,240,194,.25);border-radius:22px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.45);">
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px;">
        <div>
          <h2 style="color:#7cf0c2;font-size:26px;">🏢 Sobre a empresa</h2>
          <p style="color:#8fb9ac;margin-top:6px;">Análise executiva inteligente com base nos dados do filtro atual.</p>
        </div>
        <button onclick="fecharSobreEmpresa()">✕ Fechar</button>
      </div>

      <div class="grid metrics" style="margin-bottom:18px;">
        ${card('Saúde geral', `${d.saude.score}/100`, d.saude.status, d.saude.score < 60 ? 'danger' : d.saude.score < 80 ? 'warning' : '')}
        ${card('Margem contribuição', percentual(d.margemContrib), `Valor: ${moeda(d.contrib)}`)}
        ${card('EBITDA gerencial', moeda(d.ebitda), d.ebitda < 0 ? 'Operação negativa' : 'Operação positiva', d.ebitda < 0 ? 'danger' : '')}
        ${card('Caixa real', moeda(d.resultadoCaixa), d.resultadoCaixa < 0 ? 'Saídas maiores que entradas' : 'Entradas cobriram saídas', d.resultadoCaixa < 0 ? 'danger' : '')}
        ${card('Caixa convertido', d.vendido > 0 ? percentual(d.recebido / d.vendido * 100) : '0,00%', 'Recebido sobre vendido')}
      </div>

      <div class="card" style="margin-bottom:16px;">
        <h3 class="section-title">Leitura executiva</h3>
        <p style="line-height:1.6;">${escaparHtml(analise.resumo)}</p>
      </div>

      <div class="grid two-cols">
        <div class="card">
          <h3 class="section-title">O que está acontecendo</h3>
          ${analise.problemas.length ? analise.problemas.map(p => `<div class="diagnostico-item alerta">${escaparHtml(p)}</div>`).join('') : '<div class="diagnostico-item ok">Não encontrei problema crítico nos dados disponíveis.</div>'}
        </div>
        <div class="card">
          <h3 class="section-title">O que fazer agora</h3>
          ${analise.acoes.map((a,i)=>`
            <div class="diagnostico-item ${i===0?'alerta':'aviso'}">
              <strong>${i+1}. ${escaparHtml(a.titulo)}</strong><br>
              <span style="color:#cfe7df;">Por quê: ${escaparHtml(a.porque)}</span><br>
              <span style="color:#8fb9ac;">Melhora esperada: ${escaparHtml(a.melhora)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}
function fecharSobreEmpresa() {
  document.getElementById('modalSobreEmpresa')?.remove();
}

async function atualizarRelatorioCompleto(){
  destruirCharts();
  const p=periodoSelecionado(),custos=mapaCustosReceitas(),vendas=vendasFiltradas(p.mes,p.ano,p.vendedor,p.clienteId).map(v=>analisarVenda(v,custos)),vendido=vendas.reduce((s,v)=>s+v.vendido,0),recebido=calcularRecebido(p.mes,p.ano,p.vendedor,p.clienteId),rec=calcularRecebiveis(p.mes,p.ano,p.vendedor,p.clienteId),prod=resumoProdutos(vendas),q=qualidade(vendas,prod),desp=resumirDespesas(despesasNoPeriodo(p.mes,p.ano)),comp=resumirCompromissos(contasCompromissosPeriodo(p.mes,p.ano)),fretes=fretesNoPeriodo(p.mes,p.ano),frete=fretes.reduce((s,t)=>s+valorNumerico(t.ValorFrete),0),taxas=taxasBoletoPeriodo(p.mes,p.ano,p.vendedor,p.clienteId),impostos=vendas.reduce((s,v)=>s+v.imposto,0),cmv=vendas.reduce((s,v)=>s+v.cmv,0),liq=vendido-impostos,lucroBruto=liq-cmv,margemBruta=liq>0?lucroBruto/liq*100:null,contrib=lucroBruto-frete-taxas.valor,margemContrib=liq>0?contrib/liq*100:null,ebitda=contrib-desp.total,resultadoCaixa=recebido-desp.total,sem=[...new Set(vendas.flatMap(v=>v.sem))],freteSem=fretes.filter(t=>!vendas.some(v=>String(v.venda.NumeroNF||'').trim()&&String(v.venda.NumeroNF||'').trim()===String(t.NumeroNF||'').trim())).length,clientes=resumoClientes(vendas,desp.total),ltv=calcularLTV(),concentracao=resumoConcentracao(vendas,prod);
  const baseRelatorio={p,vendas,vendido,recebido,rec,prod,q,desp,comp,frete,taxas,impostos,cmv,liq,lucroBruto,margemBruta,contrib,margemContrib,ebitda,resultadoCaixa,clientes,ltv,concentracao};
  const estrategicos=calcularIndicadoresEstrategicos(baseRelatorio);
  const saude=calcularSaudeEmpresa({...baseRelatorio,estrategicos});
  const diag=diagnosticos({q,sem,vendido,recebido,rec,desp,comp,freteSem,despTrans:desp.por['TRANSPORTADORA']||0,frete,margemContrib,resultadoCaixa,ebitda});
  const dadosRelatorio={...baseRelatorio,estrategicos,saude,diag};
  dadosRelatorio.analiseEmpresa=montarAnaliseSobreEmpresa(dadosRelatorio);
  rcUltimoRelatorio=dadosRelatorio;
  renderizar(dadosRelatorio);
}
function renderizar(d){
  const periodo=`${d.p.mes?nomeMes(d.p.mes):'todos os meses'} / ${d.p.ano||'todos os anos'}`,cli=d.p.clienteId?clienteNome(rcClientes.find(c=>clienteChave(c)===d.p.clienteId)||{}):'todos';
  document.getElementById('relatorioCompletoConteudo').innerHTML=`
  <section class="card" style="margin-bottom:18px;"><h2 class="section-title">📍 Período analisado</h2><p class="section-subtitle">Período: <strong>${periodo}</strong> · Vendedor: <strong>${d.p.vendedor||'todos'}</strong> · Cliente: <strong>${escaparHtml(cli)}</strong> · Vendas analisadas: <strong>${d.vendas.length}</strong></p></section>
  <section class="grid metrics">${card('Vendido',moeda(d.vendido),'Receita bruta emitida.','gold')}${card('Recebido',moeda(d.recebido),`${d.vendido>0?percentual(d.recebido/d.vendido*100):'0,00%'} virou caixa.`)}${card('Despesas pagas reais',moeda(d.desp.total),`${d.desp.lista.length} lançamento(s) válidos do banco.`)}${card('Caixa real',moeda(d.resultadoCaixa),'Recebido − despesas pagas.',d.resultadoCaixa<0?'danger':'')}${card('A receber',moeda(d.rec.aberto),`${d.rec.abertos} boleto(s) em aberto.`)}${card('Em atraso',moeda(d.rec.atraso),`Inadimplência: ${percentual(d.rec.taxa)}`,d.rec.atraso>0?'danger':'')}${card('CMV mapeado',moeda(d.cmv),`${d.prod.reduce((s,p)=>s+p.kg,0).toFixed(2).replace('.',',')} kg.`)}${card('Margem de contribuição',percentual(d.margemContrib),`Valor: ${moeda(d.contrib)}`)}${card('EBITDA gerencial',moeda(d.ebitda),'Vendas − custos variáveis − despesas reais.',d.ebitda<0?'danger':'')}</section>
  <section class="grid two-cols"><div class="card"><h2 class="section-title">🧠 Diagnóstico Inteligente</h2>${d.diag.map(i=>`<div class="diagnostico-item ${i.t}">${escaparHtml(i.x)}</div>`).join('')}</div><div class="card"><h2 class="section-title">📊 Composição do Resultado</h2><canvas id="chartResultado"></canvas></div></section>
  <section class="card" style="margin-bottom:22px;"><h2 class="section-title">📑 DRE Gerencial</h2><p class="section-subtitle">Resultado por competência. Contas previstas ficam separadas abaixo para não misturar obrigação futura com despesa já paga.</p><div class="table-wrap"><table><tbody>${linhaDre('Receita bruta vendida',d.vendido)}${linhaDre('(-) Impostos sobre vendas',-d.impostos)}${linhaDre('= Receita líquida',d.liq,'destaque')}${linhaDre('(-) CMV mapeado',-d.cmv)}${linhaDre('= Lucro bruto',d.lucroBruto,'destaque')}${linhaDre('(-) Frete de entrega vinculado',-d.frete)}${linhaDre('(-) Taxas de boleto calculadas',-d.taxas.valor)}${linhaDre('= Margem de contribuição',d.contrib,'destaque')}${linhaDre('(-) Despesas reais pagas no banco',-d.desp.total)}${linhaDre('= EBITDA / LAJIDA gerencial',d.ebitda,'final')}</tbody></table></div></section>
  <section class="grid three-cols"><div class="card"><h2 class="section-title">💵 Caixa e recebíveis</h2><table>${linhaTabela('Vendido',moeda(d.vendido))}${linhaTabela('Recebido',moeda(d.recebido))}${linhaTabela('Despesas reais pagas',moeda(d.desp.total))}${linhaTabela('Resultado de caixa',moeda(d.resultadoCaixa))}${linhaTabela('A receber',moeda(d.rec.aberto))}${linhaTabela('Em atraso',moeda(d.rec.atraso))}</table></div><div class="card"><h2 class="section-title">🧾 Qualidade dos dados</h2><table>${linhaTabela('Produtos lançados',moeda(d.q.prod))}${linhaTabela('Diferença venda x produtos',moeda(d.q.dif))}${linhaTabela('Cobertura produtos',percentual(d.q.cobProd))}${linhaTabela('Cobertura custo',percentual(d.q.cobCusto))}${linhaTabela('Confiabilidade',d.q.ok?'Alta':'Provisória')}</table></div><div class="card"><h2 class="section-title">📅 Compromissos previstos</h2><table>${linhaTabela('Previsto no período',moeda(d.comp.totalPrevisto))}${linhaTabela('Pago',moeda(d.comp.totalPago))}${linhaTabela('Em aberto',moeda(d.comp.totalAberto))}${linhaTabela('Vencido',moeda(d.comp.totalVencido))}${linhaTabela('Ocorrências abertas',d.comp.abertas)}</table></div></section>
  <section class="grid two-cols"><div class="card"><h2 class="section-title">🏷️ Categorias inteligentes</h2><table>${linhaTabela('Despesas reais reclassificadas',d.desp.reclass.length)}${linhaTabela('Categorias originais fracas',d.desp.sus.length)}${linhaTabela('Taxas de boleto',d.taxas.calculavel?moeda(d.taxas.valor):'Não calculável')}${linhaTabela('LTV histórico',d.ltv!==null?moeda(d.ltv):'Não calculável')}</table></div><div class="card"><h2 class="section-title">📚 Leitura profissional</h2><p class="section-subtitle">O relatório agora separa três coisas diferentes: <strong>rentabilidade das vendas</strong>, <strong>caixa real</strong> e <strong>compromissos previstos</strong>. Assim, conta cadastrada para ciência não vira despesa duas vezes.</p></div></section>
  <section class="card" style="margin-bottom:22px;"><h2 class="section-title">📈 Indicadores estratégicos</h2><div class="table-wrap"><table><thead><tr><th>Indicador</th><th>Valor</th><th>Como ler</th></tr></thead><tbody>${linhaIndicador('CAC',d.estrategicos.cac!==null?moeda(d.estrategicos.cac):'Não calculável automaticamente',d.estrategicos.cac!==null?`Gasto de marketing/vendas ÷ ${d.estrategicos.novosClientes} novo(s) cliente(s).`:'Falta despesa de marketing/vendas identificável e novos clientes no período.')}${linhaIndicador('LTV',d.ltv!==null?moeda(d.ltv):'Não calculável','Média histórica comprada por cliente.')}${linhaIndicador('Burn Rate',moeda(d.estrategicos.burnRate),'Consumo de caixa quando despesas pagas superam o recebido.')}${linhaIndicador('Runway','Não calculável automaticamente','Falta saldo real de caixa cadastrado.')}${linhaIndicador('ROI','Não calculável automaticamente','Falta investimento e retorno por ação/projeto.')}${linhaIndicador('NPS','Não calculável automaticamente','O site tem satisfação simples; NPS exige nota 0 a 10.')}${linhaIndicador('Valuation','Não calculável automaticamente','Exige premissas de avaliação da empresa.')}${linhaIndicador('Equity','Não calculável automaticamente','Exige rodada/negociação registrada.')}${linhaIndicador('Pre-money / Post-money','Não calculável automaticamente','Exige valuation antes do aporte e valor do aporte.')}${linhaIndicador('Break-even',d.estrategicos.breakEven!==null?moeda(d.estrategicos.breakEven):'Não calculável','Faturamento mínimo para cobrir compromissos fixos previstos.')}${linhaIndicador('Margem líquida gerencial',percentual(d.estrategicos.margemLiquida),'EBITDA gerencial ÷ receita líquida.')}</tbody></table></div></section>
  <section class="grid two-cols"><div class="card"><h2 class="section-title">📦 Rentabilidade por Produto</h2>${tabelaProdutos(d.prod)}</div><div class="card"><h2 class="section-title">👥 Rentabilidade por Cliente</h2>${tabelaClientes(d.clientes)}</div></section>
  <section class="card" style="margin-bottom:22px;"><h2 class="section-title">🧾 Rentabilidade por Venda</h2>${tabelaVendas(d.vendas)}</section>
  <section class="grid two-cols"><div class="card"><h2 class="section-title">💸 Despesas reais por categoria inteligente</h2>${tabelaDespesas(d.desp.por)}</div><div class="card"><h2 class="section-title">📅 Compromissos previstos do período</h2>${tabelaCompromissos(d.comp.lista)}</div></section>`;
  grafico(d);
}
function nomeMes(m){return['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m]||'';}
function card(t,v,s,c=''){return`<div class="card metric ${c}"><div class="label">${t}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`;}
function linhaDre(t,v,c=''){return`<tr class="${c}"><td>${t}</td><td style="text-align:right;font-weight:${c?'800':'600'};">${moeda(v)}</td></tr>`;}
function linhaTabela(t,v){return`<tr><td>${t}</td><td style="text-align:right;">${v}</td></tr>`;}
function linhaIndicador(indicador, valor, leitura){return`<tr><td>${indicador}</td><td>${valor}</td><td>${leitura}</td></tr>`;}
function tabelaProdutos(p){return`<div class="table-wrap"><table><thead><tr><th>Produto</th><th>Kg</th><th>Preço/kg</th><th>Custo/kg</th><th>Vendido</th><th>Lucro bruto</th><th>Margem bruta</th><th>Contribuição</th></tr></thead><tbody>${[...p].sort((a,b)=>b.vendido-a.vendido).map(x=>`<tr><td>${escaparHtml(x.nome)}</td><td>${x.kg.toFixed(2).replace('.',',')}</td><td>${x.precoKg!==null?moeda(x.precoKg):'—'}</td><td>${x.custoKg?moeda(x.custoKg):'Sem custo'}</td><td>${moeda(x.vendido)}</td><td>${x.custoKg?moeda(x.lucroBruto):'Não calculável'}</td><td>${x.margemBruta!==null?percentual(x.margemBruta):'Não calculável'}</td><td>${x.margemContrib!==null?percentual(x.margemContrib):'Não calculável'}</td></tr>`).join('')||'<tr><td colspan="8">Nenhum produto no filtro.</td></tr>'}</tbody></table></div>`;}
function tabelaClientes(c){return`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Vendido</th><th>CMV</th><th>Frete</th><th>Contribuição</th><th>Margem</th><th>Lucro líquido est.</th></tr></thead><tbody>${[...c].sort((a,b)=>b.vendido-a.vendido).map(x=>`<tr><td>${escaparHtml(x.cliente)}</td><td>${moeda(x.vendido)}</td><td>${moeda(x.cmv)}</td><td>${moeda(x.frete)}</td><td>${moeda(x.contrib)}</td><td>${percentual(x.margem)}</td><td>${moeda(x.lucroLiquido)}</td></tr>`).join('')||'<tr><td colspan="7">Nenhum cliente no filtro.</td></tr>'}</tbody></table></div>`;}
function tabelaVendas(v){return`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>NF</th><th>Vendido</th><th>Kg</th><th>CMV</th><th>Imposto</th><th>Frete</th><th>Taxa boleto</th><th>Contribuição</th><th>Margem</th><th>Confiabilidade</th></tr></thead><tbody>${[...v].sort((a,b)=>b.vendido-a.vendido).slice(0,50).map(x=>`<tr><td>${escaparHtml(clienteNome(x.cliente))}</td><td>${escaparHtml(x.venda.NumeroNF||'-')}</td><td>${moeda(x.vendido)}</td><td>${x.kg.toFixed(2).replace('.',',')}</td><td>${moeda(x.cmv)}</td><td>${moeda(x.imposto)}</td><td>${moeda(x.frete)}</td><td>${x.taxa===null?'Não alocável':moeda(x.taxa)}</td><td>${moeda(x.contrib)}</td><td>${percentual(x.margem)}</td><td>${x.confianca==='alta'?'Alta':'Provisória'}</td></tr>`).join('')||'<tr><td colspan="11">Nenhuma venda no filtro.</td></tr>'}</tbody></table></div>`;}
function tabelaCompromissos(lista){return`<div class="table-wrap"><table><thead><tr><th>Conta</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>${[...lista].sort((a,b)=>dataLocal(a.DataPagamento)-dataLocal(b.DataPagamento)).map(c=>`<tr><td>${escaparHtml(c.Descricao)}</td><td>${formatarDataISO(c.DataPagamento).split('-').reverse().join('/')}</td><td>${moeda(c.Valor)}</td><td>${c.StatusPagamento==='Pago'?'Pago':'Em aberto'}</td></tr>`).join('')||'<tr><td colspan="4">Nenhum compromisso previsto no filtro.</td></tr>'}</tbody></table></div>`;}
function tabelaDespesas(p){return`<div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Valor</th></tr></thead><tbody>${Object.entries(p).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td>${escaparHtml(c)}</td><td>${moeda(v)}</td></tr>`).join('')||'<tr><td colspan="2">Nenhuma despesa no filtro.</td></tr>'}</tbody></table></div>`;}
function grafico(d){const ctx=document.getElementById('chartResultado');if(!ctx||typeof Chart==='undefined')return;rcCharts.push(new Chart(ctx,{type:'bar',data:{labels:['Receita','Impostos','CMV','Frete','Taxas','Despesas reais','EBITDA'],datasets:[{data:[d.vendido,d.impostos,d.cmv,d.frete,d.taxas.valor,d.desp.total,d.ebitda]}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>moeda(v)}}}}}));}
function destruirCharts(){rcCharts.forEach(c=>c.destroy());rcCharts=[];}
function escaparHtml(t){return String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
